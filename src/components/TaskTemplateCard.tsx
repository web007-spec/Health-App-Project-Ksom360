import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Copy, Trash2, Share2, FileText, Camera, Activity, ClipboardList, Target } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EditTaskTemplateDialog } from "./EditTaskTemplateDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface TaskTemplate {
  id: string;
  name: string;
  task_type: string;
  description: string | null;
  attachments: any;
  reminder_enabled: boolean;
  is_shared: boolean;
  trainer_id: string;
  created_at: string;
  icon_url: string | null;
}

interface TaskTemplateCardProps {
  template: TaskTemplate;
}

const taskTypeIcons = {
  general: FileText,
  progress_photo: Camera,
  body_metrics: Activity,
  form: ClipboardList,
  habit: Target,
};

const taskTypeLabels = {
  general: "General",
  progress_photo: "Progress Photo",
  body_metrics: "Body Metrics",
  form: "Form",
  habit: "Habit",
};

export function TaskTemplateCard({ template }: TaskTemplateCardProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const Icon = taskTypeIcons[template.task_type as keyof typeof taskTypeIcons] || FileText;

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("task_templates")
        .delete()
        .eq("id", template.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-templates"] });
      toast({
        title: "Success",
        description: "Task template deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("task_templates")
        .insert([{
          trainer_id: template.trainer_id,
          name: `${template.name} (Copy)`,
          task_type: template.task_type as any,
          description: template.description,
          attachments: template.attachments,
          reminder_enabled: template.reminder_enabled,
          is_shared: false,
          icon_url: template.icon_url,
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-templates"] });
      toast({
        title: "Success",
        description: "Task template duplicated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleShareMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("task_templates")
        .update({ is_shared: !template.is_shared })
        .eq("id", template.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-templates"] });
      toast({
        title: "Success",
        description: template.is_shared ? "Task is now private" : "Task is now shared",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                {template.icon_url ? (
                  template.icon_url.startsWith("emoji:") ? (
                    <span className="text-2xl">{template.icon_url.replace("emoji:", "")}</span>
                  ) : (
                    <img src={template.icon_url} alt="" className="w-full h-full object-cover" />
                  )
                ) : (
                  <Icon className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <CardDescription className="mt-1">
                  {taskTypeLabels[template.task_type as keyof typeof taskTypeLabels]}
                </CardDescription>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => duplicateMutation.mutate()}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toggleShareMutation.mutate()}>
                  <Share2 className="mr-2 h-4 w-4" />
                  {template.is_shared ? "Make Private" : "Share with Team"}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        {template.description && (
          <CardContent>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {template.description}
            </p>
            <div className="flex gap-2 mt-4">
              {template.reminder_enabled && (
                <Badge variant="secondary">Reminder</Badge>
              )}
              {template.is_shared && (
                <Badge variant="outline">Shared</Badge>
              )}
              {template.attachments && template.attachments.length > 0 && (
                <Badge variant="outline">{template.attachments.length} attachments</Badge>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      <EditTaskTemplateDialog
        template={template}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{template.name}"? This action cannot be undone.
              Tasks already assigned to clients will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate()}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
