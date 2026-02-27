import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, Camera, Activity, ClipboardList, Target, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface AssignTaskDialogProps {
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function AssignTaskDialog({ clientId, open, onOpenChange }: AssignTaskDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [dueDate, setDueDate] = useState<Date>();

  const { data: templates } = useQuery({
    queryKey: ["task-templates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_templates")
        .select("*")
        .or(`trainer_id.eq.${user?.id},is_shared.eq.true`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user && open,
  });

  const filteredTemplates = templates?.filter((template) => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || template.task_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTemplate) return;

      // If habit template, create a client_habit instead
      if (selectedTemplate.task_type === "habit") {
        const { error } = await supabase.from("client_habits" as any).insert([{
          client_id: clientId,
          trainer_id: user?.id,
          template_id: selectedTemplate.id,
          name: selectedTemplate.name,
          description: selectedTemplate.description,
          icon_url: selectedTemplate.icon_url,
          goal_value: selectedTemplate.goal_value || 1,
          goal_unit: selectedTemplate.goal_unit || "times",
          frequency: selectedTemplate.frequency || "daily",
          start_date: dueDate ? format(dueDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
        }]);
        if (error) throw error;
        return;
      }

      const { error } = await supabase.from("client_tasks").insert([{
        client_id: clientId,
        trainer_id: user?.id,
        template_id: selectedTemplate.id,
        name: selectedTemplate.name,
        task_type: selectedTemplate.task_type as any,
        description: selectedTemplate.description,
        attachments: selectedTemplate.attachments,
        reminder_enabled: selectedTemplate.reminder_enabled,
        reminder_hours_before: selectedTemplate.reminder_hours_before,
        due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
      }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["client-habits"] });
      toast({
        title: "Success",
        description: selectedTemplate?.task_type === "habit" ? "Habit assigned successfully" : "Task assigned successfully",
      });
      setSelectedTemplate(null);
      setDueDate(undefined);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Task from Library</DialogTitle>
          <DialogDescription>
            Choose a task template to assign to your client
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Task Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="progress_photo">Progress Photo</SelectItem>
                <SelectItem value="body_metrics">Body Metrics</SelectItem>
                <SelectItem value="form">Form</SelectItem>
                <SelectItem value="habit">Habit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedTemplate && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <div>
                <Label>Selected Task: {selectedTemplate.name}</Label>
              </div>
              <div>
                <Label>Due Date (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left mt-2">
                      <Calendar className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                  Cancel
                </Button>
                <Button onClick={() => assignMutation.mutate()}>
                  Assign Task
                </Button>
              </div>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            {filteredTemplates?.map((template) => {
              const Icon = taskTypeIcons[template.task_type as keyof typeof taskTypeIcons];
              return (
                <Card
                  key={template.id}
                  className={`cursor-pointer hover:border-primary transition-colors ${
                    selectedTemplate?.id === template.id ? "border-primary" : ""
                  }`}
                  onClick={() => setSelectedTemplate(template)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {taskTypeLabels[template.task_type as keyof typeof taskTypeLabels]}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  {template.description && (
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {template.description}
                      </p>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>

          {filteredTemplates?.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No tasks found. Create some task templates first.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
