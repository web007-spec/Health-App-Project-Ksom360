import { useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

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
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
    }
  }, [template, form]);

  const updateMutation = useMutation({
    mutationFn: async (values: TaskTemplateForm) => {
      const { error } = await supabase
        .from("task_templates")
        .update({
          name: values.name,
          task_type: values.task_type,
          description: values.description || null,
          reminder_enabled: values.reminder_enabled,
          reminder_hours_before: values.reminder_enabled ? values.reminder_hours_before : 24,
          is_shared: values.is_shared,
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
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
