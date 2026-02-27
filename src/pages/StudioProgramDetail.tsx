import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Dumbbell,
  CalendarDays,
  Users,
  Search,
  Plus,
  GraduationCap,
  X,
  Upload,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/* ─── Overview Tab ─── */
function OverviewTab({ program, clients, assignedClients, onAssign, onUnassign, onPublish, refetchProgram }: any) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [showMore, setShowMore] = useState(false);

  const totalWorkouts = 0; // Will be populated when workouts are added

  const filteredClients = clients?.filter((c: any) =>
    c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const assignedIds = new Set(assignedClients?.map((a: any) => a.client_id) || []);

  const updateMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from("studio_programs")
        .update(updates)
        .eq("id", program.id);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchProgram();
      toast({ title: "Program updated" });
    },
  });

  return (
    <div className="space-y-8">
      {/* Program Level + Publish */}
      <div className="flex items-center justify-between">
        <Select defaultValue="all">
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Program Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Program Level</SelectItem>
            <SelectItem value="beginner">Beginner</SelectItem>
            <SelectItem value="intermediate">Intermediate</SelectItem>
            <SelectItem value="advanced">Advanced</SelectItem>
          </SelectContent>
        </Select>

        <Button
          onClick={onPublish}
          className={program.status === "published" ? "bg-amber-500 hover:bg-amber-600" : ""}
        >
          ● {program.status === "published" ? "Unpublish" : "Publish"}
        </Button>
      </div>

      {/* Cover + Info */}
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-72 h-48 rounded-xl overflow-hidden bg-muted flex-shrink-0">
          {program.cover_image_url ? (
            <img src={program.cover_image_url} alt={program.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <GraduationCap className="h-16 w-16 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <h2 className="text-2xl font-bold text-foreground">{program.name}</h2>
          {program.description && (
            <div>
              <p className={`text-muted-foreground text-sm leading-relaxed ${!showMore ? "line-clamp-3" : ""}`}>
                {program.description}
              </p>
              {program.description.length > 150 && (
                <button
                  onClick={() => setShowMore(!showMore)}
                  className="text-primary text-sm font-medium mt-1"
                >
                  {showMore ? "Show Less" : "Read More"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-3 divide-x divide-border">
            <div className="flex items-center gap-3 p-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Dumbbell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Workouts</p>
                <p className="text-xl font-bold text-foreground">{totalWorkouts}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <CalendarDays className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Weeks</p>
                <p className="text-xl font-bold text-foreground">{program.duration_weeks}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Available For</p>
                <p className="text-xl font-bold text-foreground">
                  {assignedClients?.length || 0} <span className="text-sm font-normal text-muted-foreground">Clients</span>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Banner */}
      <Card className="bg-muted/50 border-muted">
        <CardContent className="p-6 text-center space-y-2">
          <h3 className="font-semibold text-foreground">How do Studio programs work?</h3>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            Program a common training regimen you want to offer clients. Your clients can start and stop the
            program anytime and even switch between programs. You see progress and results without lifting a
            finger. And if you need to update the program, edits only go live after you publish changes.
          </p>
        </CardContent>
      </Card>

      {/* Assign To */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Assign to</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Search + Client List */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search for your clients and groups"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  Most Recent ({filteredClients?.length || 0})
                </span>
                <button
                  className="text-xs text-primary font-medium"
                  onClick={() => {
                    filteredClients?.forEach((c: any) => {
                      if (!assignedIds.has(c.id)) onAssign(c.id);
                    });
                  }}
                >
                  + Add all clients
                </button>
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {filteredClients?.map((client: any) => (
                  <label
                    key={client.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={assignedIds.has(client.id)}
                      onCheckedChange={(checked) => {
                        if (checked) onAssign(client.id);
                        else onUnassign(client.id);
                      }}
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={client.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {client.full_name?.[0] || client.email?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{client.full_name || "Unnamed"}</p>
                      <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                    </div>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Right: Assigned Clients */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h4 className="font-semibold text-foreground">
                Assigned Clients ({assignedClients?.length || 0})
              </h4>
              {!assignedClients?.length ? (
                <p className="text-sm text-muted-foreground">No clients assigned yet</p>
              ) : (
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {assignedClients.map((access: any) => {
                    const client = clients?.find((c: any) => c.id === access.client_id);
                    return (
                      <div key={access.id} className="flex items-center gap-3 p-2 rounded-lg group">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={client?.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {client?.full_name?.[0] || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium flex-1 truncate">
                          {client?.full_name || client?.email || "Unknown"}
                        </span>
                        <button
                          className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => onUnassign(access.client_id)}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ─── Calendar Tab ─── */
function CalendarTab({ program }: any) {
  const weeks = Array.from({ length: program.duration_weeks }, (_, i) => i + 1);
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const { data: programWorkouts } = useQuery({
    queryKey: ["studio-program-workouts", program.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("studio_program_workouts")
        .select("*, ondemand_workouts(name, thumbnail_url)")
        .eq("program_id", program.id)
        .order("week_number")
        .order("day_of_week")
        .order("order_index");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      {weeks.map((week) => (
        <div key={week} className="space-y-3">
          <h3 className="font-semibold text-foreground">Week {week}</h3>
          <div className="grid grid-cols-7 gap-2">
            {days.map((day, dayIdx) => {
              const dayWorkouts = programWorkouts?.filter(
                (w: any) => w.week_number === week && w.day_of_week === dayIdx + 1
              );
              return (
                <Card key={dayIdx} className="min-h-[120px]">
                  <CardContent className="p-2 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground text-center">{day}</p>
                    {dayWorkouts?.map((w: any) => (
                      <div
                        key={w.id}
                        className="text-xs p-1.5 rounded bg-primary/10 text-primary truncate"
                      >
                        {w.is_rest_day ? "Rest Day" : w.ondemand_workouts?.name || "Workout"}
                      </div>
                    ))}
                    {(!dayWorkouts || dayWorkouts.length === 0) && (
                      <div className="flex-1 flex items-center justify-center pt-4">
                        <Plus className="h-4 w-4 text-muted-foreground/40" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Settings Tab ─── */
function SettingsTab({ program, refetchProgram }: any) {
  const { toast } = useToast();
  const [name, setName] = useState(program.name);
  const [description, setDescription] = useState(program.description || "");
  const [coverUrl, setCoverUrl] = useState(program.cover_image_url || "");
  const [weeks, setWeeks] = useState(String(program.duration_weeks));
  const [deleteOpen, setDeleteOpen] = useState(false);
  const navigate = useNavigate();

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("studio_programs")
        .update({
          name,
          description,
          cover_image_url: coverUrl || null,
          duration_weeks: parseInt(weeks),
        })
        .eq("id", program.id);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchProgram();
      toast({ title: "Settings saved" });
    },
    onError: () => {
      toast({ title: "Failed to save", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("studio_programs").delete().eq("id", program.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Program deleted" });
      navigate("/studio-programs");
    },
  });

  return (
    <div className="max-w-xl space-y-6">
      <div className="space-y-2">
        <Label>Program Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
      </div>
      <div className="space-y-2">
        <Label>Cover Image URL</Label>
        <Input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://..." />
      </div>
      <div className="space-y-2">
        <Label>Duration</Label>
        <Select value={weeks} onValueChange={setWeeks}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5, 6, 8, 10, 12, 16].map((w) => (
              <SelectItem key={w} value={String(w)}>
                {w} {w === 1 ? "Week" : "Weeks"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-3 pt-4">
        <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
        <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
          Delete Program
        </Button>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this program?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{program.name}" and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ─── Main Page ─── */
export default function StudioProgramDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: program, isLoading, refetch: refetchProgram } = useQuery({
    queryKey: ["studio-program", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("studio_programs")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: clients } = useQuery({
    queryKey: ["trainer-clients", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url") as any)
        .eq("trainer_id", user?.id)
        .eq("role", "client")
        .order("full_name");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: assignedClients, refetch: refetchAccess } = useQuery({
    queryKey: ["studio-program-access", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_studio_program_access")
        .select("*")
        .eq("program_id", id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const assignMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase
        .from("client_studio_program_access")
        .insert({ program_id: id!, client_id: clientId });
      if (error) throw error;
    },
    onSuccess: () => refetchAccess(),
  });

  const unassignMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase
        .from("client_studio_program_access")
        .delete()
        .eq("program_id", id!)
        .eq("client_id", clientId);
      if (error) throw error;
    },
    onSuccess: () => refetchAccess(),
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const newStatus = program?.status === "published" ? "draft" : "published";
      const { error } = await supabase
        .from("studio_programs")
        .update({ status: newStatus, is_published: newStatus === "published" })
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchProgram();
      toast({ title: program?.status === "published" ? "Program unpublished" : "Program published" });
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 text-center text-muted-foreground">Loading program...</div>
      </DashboardLayout>
    );
  }

  if (!program) {
    return (
      <DashboardLayout>
        <div className="p-6 text-center">
          <p className="text-muted-foreground mb-4">Program not found</p>
          <Button variant="outline" onClick={() => navigate("/studio-programs")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Programs
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/studio-programs")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">{program.name}</h1>
          <Badge variant={program.status === "draft" ? "secondary" : "default"}>
            {program.status === "draft" ? "Draft" : "Published"}
          </Badge>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <OverviewTab
              program={program}
              clients={clients}
              assignedClients={assignedClients}
              onAssign={(cid: string) => assignMutation.mutate(cid)}
              onUnassign={(cid: string) => unassignMutation.mutate(cid)}
              onPublish={() => publishMutation.mutate()}
              refetchProgram={refetchProgram}
            />
          </TabsContent>

          <TabsContent value="calendar" className="mt-6">
            <CalendarTab program={program} />
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <SettingsTab program={program} refetchProgram={refetchProgram} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
