import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dumbbell, Upload, X, Plus, Video, Link } from "lucide-react";
import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreateExerciseTagDialog } from "./CreateExerciseTagDialog";

interface CreateExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const muscleGroups = ["chest", "back", "shoulders", "arms", "legs", "glutes", "core", "full body", "cardio"];
const equipmentTypes = ["bodyweight", "dumbbells", "barbell", "machine", "resistance bands", "kettlebell", "cable", "mini bands", "medicine ball"];
const categories = ["strength", "cardio", "flexibility", "mobility", "plyometric", "warm-up", "cool-down"];

export function CreateExerciseDialog({ open, onOpenChange }: CreateExerciseDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    muscle_group: "",
    equipment: "",
    category: "",
    video_url: "",
  });

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoSourceType, setVideoSourceType] = useState<"upload" | "url">("upload");
  const [isUploading, setIsUploading] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isCreateTagDialogOpen, setIsCreateTagDialogOpen] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Fetch available tags
  const { data: availableTags } = useQuery({
    queryKey: ["exercise-tags", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercise_tags")
        .select("*")
        .or(`trainer_id.eq.${user?.id},is_default.eq.true`)
        .order("name");
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Generate thumbnail from video

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast({
        title: "Invalid file type",
        description: "Please select a video file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a video smaller than 100MB",
        variant: "destructive",
      });
      return;
    }

    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const clearVideo = () => {
    setVideoFile(null);
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    setVideoPreview(null);
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  const createExerciseMutation = useMutation({
    mutationFn: async () => {
      let videoUrl = videoSourceType === "url" ? formData.video_url : "";

      setIsUploading(true);
      try {

        // Upload video if file is selected
        if (videoFile && user?.id && videoSourceType === "upload") {
          const fileExt = videoFile.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('exercise-videos')
            .upload(fileName, videoFile, {
              contentType: videoFile.type,
              upsert: false,
            });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('exercise-videos')
            .getPublicUrl(fileName);

          videoUrl = publicUrl;
        }
      } finally {
        setIsUploading(false);
      }

      // Insert exercise - video_url serves as both video and thumbnail
      const { data, error } = await supabase
        .from("exercises")
        .insert({
          name: formData.name,
          description: formData.description,
          muscle_group: formData.muscle_group,
          equipment: formData.equipment,
          category: formData.category,
          video_url: videoUrl || null,
          trainer_id: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Insert tag relationships
      if (selectedTags.length > 0) {
        const tagRelations = selectedTags.map(tagId => ({
          exercise_id: data.id,
          tag_id: tagId,
        }));

        const { error: tagError } = await supabase
          .from("exercise_exercise_tags")
          .insert(tagRelations);

        if (tagError) throw tagError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      toast({
        title: "Success!",
        description: "Exercise created successfully",
      });
      onOpenChange(false);
      // Reset form
      setFormData({
        name: "",
        description: "",
        muscle_group: "",
        equipment: "",
        category: "",
        video_url: "",
      });
      setSelectedTags([]);
      clearVideo();
      setVideoSourceType("upload");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Exercise name is required",
        variant: "destructive",
      });
      return;
    }
    createExerciseMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            Create New Exercise
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Exercise Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Exercise Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Barbell Squat"
              required
            />
          </div>

          {/* Category, Muscle Group, Equipment */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="muscle_group">Target Muscle Groups</Label>
              <Select
                value={formData.muscle_group}
                onValueChange={(value) => setFormData({ ...formData, muscle_group: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select muscle group" />
                </SelectTrigger>
                <SelectContent>
                  {muscleGroups.map((muscle) => (
                    <SelectItem key={muscle} value={muscle}>
                      {muscle.charAt(0).toUpperCase() + muscle.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="equipment">Equipment</Label>
              <Select
                value={formData.equipment}
                onValueChange={(value) => setFormData({ ...formData, equipment: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select equipment" />
                </SelectTrigger>
                <SelectContent>
                  {equipmentTypes.map((equipment) => (
                    <SelectItem key={equipment} value={equipment}>
                      {equipment.charAt(0).toUpperCase() + equipment.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the exercise..."
              rows={3}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Tags</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsCreateTagDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Create Tag
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 p-4 border border-border rounded-lg min-h-[60px]">
              {availableTags && availableTags.length > 0 ? (
                availableTags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                    className="cursor-pointer capitalize"
                    onClick={() => {
                      setSelectedTags(prev =>
                        prev.includes(tag.id)
                          ? prev.filter(id => id !== tag.id)
                          : [...prev, tag.id]
                      );
                    }}
                  >
                    {tag.name}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No tags available. Create one to get started!</p>
              )}
            </div>
          </div>

          {/* Video Upload/URL - Video serves as thumbnail */}
          <div className="space-y-2">
            <Label>Demo Video</Label>
            <Tabs value={videoSourceType} onValueChange={(v) => setVideoSourceType(v as "upload" | "url")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Video
                </TabsTrigger>
                <TabsTrigger value="url" className="flex items-center gap-2">
                  <Link className="h-4 w-4" />
                  Video URL
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="upload" className="mt-4">
                {videoPreview ? (
                  <div className="relative">
                    <video 
                      src={videoPreview} 
                      controls
                      className="w-full h-48 object-cover rounded-lg border border-border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={clearVideo}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    onClick={() => videoInputRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                  >
                    <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Click to upload exercise video
                    </p>
                    <p className="text-xs text-muted-foreground">
                      MP4, MOV, or WebM (max 100MB)
                    </p>
                  </div>
                )}
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoSelect}
                  className="hidden"
                />
              </TabsContent>
              
              <TabsContent value="url" className="mt-4">
                <Input
                  id="video_url"
                  value={formData.video_url}
                  onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                  placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Paste YouTube, Vimeo, or direct video URL
                </p>
              </TabsContent>
            </Tabs>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createExerciseMutation.isPending || isUploading}>
              {isUploading ? "Uploading image..." : createExerciseMutation.isPending ? "Creating..." : "Create Exercise"}
            </Button>
          </div>
        </form>
      </DialogContent>

      <CreateExerciseTagDialog 
        open={isCreateTagDialogOpen}
        onOpenChange={setIsCreateTagDialogOpen}
      />
    </Dialog>
  );
}
