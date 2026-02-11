import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, X, Plus, Video, Link } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreateExerciseTagDialog } from "./CreateExerciseTagDialog";

interface Exercise {
  id: string;
  name: string;
  description: string | null;
  muscle_group: string | null;
  equipment: string | null;
  category: string | null;
  image_url: string | null;
  video_url: string | null;
}

interface EditExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: Exercise | null;
}

const muscleGroups = ["chest", "back", "shoulders", "arms", "legs", "glutes", "core", "full body", "cardio"];
const equipmentTypes = ["bodyweight", "dumbbells", "barbell", "machine", "resistance bands", "kettlebell", "cable", "mini bands", "medicine ball"];
const categories = ["strength", "cardio", "flexibility", "mobility", "plyometric", "warm-up", "cool-down"];

// Helper to detect if URL is a direct video (not YouTube/Vimeo)
const isDirectVideoUrl = (url: string | null) => {
  if (!url) return false;
  return !url.includes('youtube.com') && !url.includes('youtu.be') && !url.includes('vimeo.com');
};

export function EditExerciseDialog({ open, onOpenChange, exercise }: EditExerciseDialogProps) {
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
  const [removeVideo, setRemoveVideo] = useState(false);
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

  // Fetch exercise tags
  const { data: exerciseTags } = useQuery({
    queryKey: ["exercise-tags", exercise?.id],
    queryFn: async () => {
      if (!exercise?.id) return [];
      
      const { data, error } = await supabase
        .from("exercise_exercise_tags")
        .select("tag_id")
        .eq("exercise_id", exercise.id);
      
      if (error) throw error;
      return data.map(t => t.tag_id);
    },
    enabled: !!exercise?.id && open,
  });

  // Update form when exercise changes
  useEffect(() => {
    if (exercise) {
      setFormData({
        name: exercise.name,
        description: exercise.description || "",
        muscle_group: exercise.muscle_group || "",
        equipment: exercise.equipment || "",
        category: exercise.category || "",
        video_url: exercise.video_url || "",
      });
      setVideoFile(null);
      setRemoveVideo(false);
      
      // Set video source type based on existing video
      if (exercise.video_url) {
        if (isDirectVideoUrl(exercise.video_url)) {
          setVideoSourceType("upload");
          setVideoPreview(exercise.video_url);
        } else {
          setVideoSourceType("url");
          setVideoPreview(null);
        }
      } else {
        setVideoSourceType("upload");
        setVideoPreview(null);
      }
    }
  }, [exercise]);

  // Update selected tags when exercise tags are loaded
  useEffect(() => {
    if (exerciseTags) {
      setSelectedTags(exerciseTags);
    }
  }, [exerciseTags]);

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast({
        title: "Invalid file type",
        description: "Please select a video file",
        variant: "destructive",
      });
      return;
    }

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
    setRemoveVideo(false);
  };

  const clearVideo = () => {
    setVideoFile(null);
    if (videoPreview && !videoPreview.startsWith('http')) {
      URL.revokeObjectURL(videoPreview);
    }
    setVideoPreview(null);
    setRemoveVideo(true);
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  const updateExerciseMutation = useMutation({
    mutationFn: async () => {
      if (!exercise) return;

      let videoUrl = exercise.video_url;

      // Handle video removal or source type change
      if (removeVideo) {
        videoUrl = null;
      } else if (videoSourceType === "url") {
        videoUrl = formData.video_url || null;
      }

      setIsUploading(true);
      try {
        // Upload new video if file is selected
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

      const { data, error } = await supabase
        .from("exercises")
        .update({
          name: formData.name,
          description: formData.description || null,
          muscle_group: formData.muscle_group || null,
          equipment: formData.equipment || null,
          category: formData.category || null,
          video_url: videoUrl,
        })
        .eq("id", exercise.id)
        .select()
        .single();

      if (error) throw error;

      // Update tag relationships
      // First, delete existing tags
      const { error: deleteError } = await supabase
        .from("exercise_exercise_tags")
        .delete()
        .eq("exercise_id", exercise.id);

      if (deleteError) throw deleteError;

      // Then insert new tags
      if (selectedTags.length > 0) {
        const tagRelations = selectedTags.map(tagId => ({
          exercise_id: exercise.id,
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
        title: "Success",
        description: "Exercise updated successfully",
      });
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      muscle_group: "",
      equipment: "",
      category: "",
      video_url: "",
    });
    setVideoFile(null);
    setVideoPreview(null);
    setRemoveVideo(false);
    setVideoSourceType("upload");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateExerciseMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Exercise</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Exercise Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Barbell Bench Press"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
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
                    <SelectItem key={category} value={category} className="capitalize">
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="muscle_group">Muscle Group</Label>
              <Select
                value={formData.muscle_group}
                onValueChange={(value) => setFormData({ ...formData, muscle_group: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select muscle group" />
                </SelectTrigger>
                <SelectContent>
                  {muscleGroups.map((group) => (
                    <SelectItem key={group} value={group} className="capitalize">
                      {group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="equipment">Equipment</Label>
              <Select
                value={formData.equipment}
                onValueChange={(value) => setFormData({ ...formData, equipment: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select equipment" />
                </SelectTrigger>
                <SelectContent>
                  {equipmentTypes.map((type) => (
                    <SelectItem key={type} value={type} className="capitalize">
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the exercise, form tips, etc."
              rows={4}
            />
          </div>

          {/* Video Upload/URL - Video serves as thumbnail */}
          <div className="space-y-2">
            <Label>Demo Video</Label>
            <Tabs value={videoSourceType} onValueChange={(v) => {
              setVideoSourceType(v as "upload" | "url");
              if (v === "url") {
                setVideoFile(null);
                setVideoPreview(null);
              }
            }}>
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

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateExerciseMutation.isPending || isUploading}
              className="flex-1"
            >
              {isUploading ? "Uploading..." : updateExerciseMutation.isPending ? "Updating..." : "Update Exercise"}
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
