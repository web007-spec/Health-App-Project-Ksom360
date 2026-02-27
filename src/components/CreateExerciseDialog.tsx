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
import { validateVideoFile, uploadVideo, getMaxVideoSizeLabel, type UploadProgress } from "@/lib/videoUpload";
import { generateAndUploadThumbnail } from "@/lib/videoThumbnail";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreateExerciseTagDialog } from "./CreateExerciseTagDialog";
import { ExerciseOptionSelect } from "./ExerciseOptionSelect";
import { useExerciseOptions } from "@/hooks/useExerciseOptions";

interface CreateExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isCreateTagDialogOpen, setIsCreateTagDialogOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const { muscleGroups, equipmentTypes, categories, addOption } = useExerciseOptions();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: "Invalid file type", description: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please select an image smaller than 10MB", variant: "destructive" });
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateVideoFile(file);
    if (validationError) {
      toast({ title: "Invalid file", description: validationError, variant: "destructive" });
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
      setUploadProgress(null);
      try {
        // Upload video if file is selected
        if (videoFile && user?.id && videoSourceType === "upload") {
          videoUrl = await uploadVideo(videoFile, user.id, "exercise-videos", setUploadProgress);
        }
      } finally {
        setIsUploading(false);
        setUploadProgress(null);
      }

      // Upload thumbnail image if selected, otherwise auto-generate from video
      let imageUrl: string | null = null;
      if (imageFile && user?.id) {
        const { compressImage } = await import("@/lib/imageCompression");
        const compressed = await compressImage(imageFile);
        const fileExt = 'jpg';
        const fileName = `${user.id}/${Date.now()}-thumb.${fileExt}`;
        const { error: imgUploadError } = await supabase.storage
          .from('exercise-images')
          .upload(fileName, compressed, { contentType: 'image/jpeg', upsert: false });
        if (imgUploadError) throw imgUploadError;
        const { data: { publicUrl } } = supabase.storage
          .from('exercise-images')
          .getPublicUrl(fileName);
        imageUrl = publicUrl;
      } else if (videoUrl && user?.id) {
        // Auto-generate thumbnail from uploaded/linked video
        try {
          imageUrl = await generateAndUploadThumbnail(
            videoFile && videoSourceType === "upload" ? videoFile : videoUrl,
            user.id
          );
        } catch (thumbErr) {
          console.warn("Auto-thumbnail generation failed:", thumbErr);
        }
      }

      const { data, error } = await supabase
        .from("exercises")
        .insert({
          name: formData.name,
          description: formData.description,
          muscle_group: formData.muscle_group,
          equipment: formData.equipment,
          category: formData.category,
          video_url: videoUrl || null,
          image_url: imageUrl,
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
      clearImage();
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
              <ExerciseOptionSelect
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
                options={categories}
                placeholder="Select category"
                onAddCustom={(name) => addOption.mutate({ type: "category", name })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="muscle_group">Target Muscle Groups</Label>
              <ExerciseOptionSelect
                value={formData.muscle_group}
                onValueChange={(value) => setFormData({ ...formData, muscle_group: value })}
                options={muscleGroups}
                placeholder="Select muscle group"
                onAddCustom={(name) => addOption.mutate({ type: "muscle_group", name })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="equipment">Equipment</Label>
              <ExerciseOptionSelect
                value={formData.equipment}
                onValueChange={(value) => setFormData({ ...formData, equipment: value })}
                options={equipmentTypes}
                placeholder="Select equipment"
                onAddCustom={(name) => addOption.mutate({ type: "equipment", name })}
              />
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

          {/* Thumbnail Image Upload */}
          <div className="space-y-2">
            <Label>Thumbnail Image</Label>
            {imagePreview ? (
              <div className="relative">
                <img src={imagePreview} alt="Thumbnail" className="w-full h-48 object-cover rounded-lg border border-border" />
                <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2" onClick={clearImage}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                onClick={() => imageInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
              >
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Click to upload thumbnail image</p>
                <p className="text-xs text-muted-foreground">JPG, PNG, or WebP (max 10MB)</p>
              </div>
            )}
            <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
          </div>

          {/* Video Upload/URL */}
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
                      MP4, MOV, or WebM (max {getMaxVideoSizeLabel()})
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

          {/* Upload Progress */}
          {isUploading && uploadProgress && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Uploading video...</span>
                <span>{uploadProgress.percentage}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-primary h-full rounded-full transition-all duration-300" 
                  style={{ width: `${uploadProgress.percentage}%` }} 
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createExerciseMutation.isPending || isUploading}>
              {isUploading 
                ? uploadProgress 
                  ? `Uploading... ${uploadProgress.percentage}%` 
                  : "Uploading..." 
                : createExerciseMutation.isPending ? "Creating..." : "Create Exercise"}
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
