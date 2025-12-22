import { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ImagePlus, X, Smile } from "lucide-react";
import { compressImage } from "@/lib/imageCompression";
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const taskTemplateSchema = z.object({
  name: z.string().trim().min(1, "Task name is required").max(200),
  task_type: z.enum(["general", "progress_photo", "body_metrics", "form", "habit"]),
  description: z.string().trim().max(1000).optional(),
  reminder_enabled: z.boolean(),
  reminder_hours_before: z.number().min(1).max(168).optional(),
  is_shared: z.boolean(),
});

type TaskTemplateForm = z.infer<typeof taskTemplateSchema>;

interface EditTaskTemplateDialogProps {
  template: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTaskTemplateDialog({ template, open, onOpenChange }: EditTaskTemplateDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<TaskTemplateForm>({
    resolver: zodResolver(taskTemplateSchema),
    defaultValues: {
      name: template.name,
      task_type: template.task_type,
      description: template.description || "",
      reminder_enabled: template.reminder_enabled,
      reminder_hours_before: template.reminder_hours_before || 24,
      is_shared: template.is_shared,
    },
  });

  useEffect(() => {
    if (template) {
      form.reset({
        name: template.name,
        task_type: template.task_type,
        description: template.description || "",
        reminder_enabled: template.reminder_enabled,
        reminder_hours_before: template.reminder_hours_before || 24,
        is_shared: template.is_shared,
      });
      
      // Set existing icon
      if (template.icon_url) {
        if (template.icon_url.startsWith("emoji:")) {
          setSelectedEmoji(template.icon_url.replace("emoji:", ""));
          setIconPreview(null);
        } else {
          setIconPreview(template.icon_url);
          setSelectedEmoji(null);
        }
      } else {
        setIconPreview(null);
        setSelectedEmoji(null);
      }
      setIconFile(null);
    }
  }, [template, form]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    try {
      const compressed = await compressImage(file, 256, 256, 0.8);
      const compressedFile = new File([compressed], file.name, { type: "image/jpeg" });
      setIconFile(compressedFile);
      setIconPreview(URL.createObjectURL(compressed));
      setSelectedEmoji(null);
    } catch (error) {
      toast({
        title: "Error processing image",
        description: "Failed to process the image",
        variant: "destructive",
      });
    }
  };

  const handleEmojiSelect = (emoji: any) => {
    setSelectedEmoji(emoji.native);
    setIconFile(null);
    setIconPreview(null);
  };

  const clearIcon = () => {
    setIconFile(null);
    setIconPreview(null);
    setSelectedEmoji(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadIcon = async (): Promise<string | null> => {
    if (selectedEmoji) {
      return `emoji:${selectedEmoji}`;
    }

    if (iconFile) {
      if (!user) throw new Error("You must be logged in to upload an icon");

      const fileName = `${user.id}/${Date.now()}-${iconFile.name}`;
      const { error } = await supabase.storage
        .from("task-icons")
        .upload(fileName, iconFile, {
          upsert: true,
          contentType: iconFile.type,
          cacheControl: "3600",
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage.from("task-icons").getPublicUrl(fileName);
      return urlData.publicUrl;
    }

    // Keep existing URL if no new file/emoji selected
    if (iconPreview && !iconFile) {
      return iconPreview;
    }

    return null;
  };

  const updateMutation = useMutation({
    mutationFn: async (values: TaskTemplateForm) => {
      setIsUploading(true);
      const iconUrl = await uploadIcon();

      const { error } = await supabase
        .from("task_templates")
        .update({
          name: values.name,
          task_type: values.task_type,
          description: values.description || null,
          reminder_enabled: values.reminder_enabled,
          reminder_hours_before: values.reminder_enabled ? values.reminder_hours_before : 24,
          is_shared: values.is_shared,
          icon_url: iconUrl,
        })
        .eq("id", template.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-templates"] });
      toast({
        title: "Success",
        description: "Task template updated successfully",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsUploading(false);
    },
  });

  const onSubmit = (values: TaskTemplateForm) => {
    updateMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Task Template</DialogTitle>
          <DialogDescription>
            Update your task template. Changes won't affect already assigned tasks.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Icon/Emoji Picker */}
            <div className="space-y-2">
              <FormLabel>Task Icon (Optional)</FormLabel>
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/50 overflow-hidden">
                  {iconPreview ? (
                    <img src={iconPreview} alt="Icon preview" className="w-full h-full object-cover" />
                  ) : selectedEmoji ? (
                    <span className="text-4xl">{selectedEmoji}</span>
                  ) : (
                    <ImagePlus className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImagePlus className="h-4 w-4 mr-2" />
                      Upload Image
                    </Button>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" size="sm">
                          <Smile className="h-4 w-4 mr-2" />
                          Pick Emoji
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Picker data={data} onEmojiSelect={handleEmojiSelect} theme="auto" />
                      </PopoverContent>
                    </Popover>
                    {(iconPreview || selectedEmoji) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={clearIcon}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Add an image or emoji to identify this task
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="task_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="general">General Task</SelectItem>
                      <SelectItem value="progress_photo">Progress Photo</SelectItem>
                      <SelectItem value="body_metrics">Body Metrics</SelectItem>
                      <SelectItem value="form">Form</SelectItem>
                      <SelectItem value="habit">Habit</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea rows={4} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_shared"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Share with Team</FormLabel>
                    <FormDescription>
                      Allow other trainers to use this template
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reminder_enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Set Reminder</FormLabel>
                    <FormDescription>
                      Send reminder notification before task is due
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {form.watch("reminder_enabled") && (
              <FormField
                control={form.control}
                name="reminder_hours_before"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reminder Hours Before</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={168}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      How many hours before the due date to send reminder (1-168)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending || isUploading}>
                {updateMutation.isPending || isUploading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
