import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, GraduationCap, Filter, ChevronUp, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function StudioPrograms() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [programName, setProgramName] = useState("");
  const [programDescription, setProgramDescription] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [durationWeeks, setDurationWeeks] = useState("4");

  const { data: programs, isLoading } = useQuery({
    queryKey: ["studio-programs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("studio_programs")
        .select(`
          *,
          client_studio_program_access(count)
        `)
        .eq("trainer_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("studio_programs")
        .insert({
          name: programName,
          description: programDescription,
          cover_image_url: coverImageUrl || null,
          duration_weeks: parseInt(durationWeeks),
          trainer_id: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studio-programs"] });
      toast({ title: "Studio program created successfully" });
      setCreateDialogOpen(false);
      setProgramName("");
      setProgramDescription("");
      setCoverImageUrl("");
      setDurationWeeks("4");
    },
    onError: () => {
      toast({ title: "Failed to create program", variant: "destructive" });
    },
  });

  const filteredPrograms = programs?.filter((program) =>
    program.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!programName.trim()) {
      toast({ title: "Please enter a program name", variant: "destructive" });
      return;
    }
    createMutation.mutate();
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Page title */}
        <h1 className="text-3xl font-bold text-foreground">Studio Programs</h1>

        {/* Hero Banner */}
        {!bannerVisible ? (
          <button
            onClick={() => setBannerVisible(true)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Show Banner <ChevronDown className="h-3.5 w-3.5" />
          </button>
        ) : (
          <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50/60 dark:from-amber-950/30 dark:to-orange-900/20 border border-amber-200/50 dark:border-amber-800/30 p-6 md:p-8 relative overflow-hidden">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-3">
                <p className="text-xs font-bold tracking-widest uppercase text-foreground/70">Studio Program</p>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">Flexible Programs for Clients</h2>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-md">
                  Create and sell programs your clients can start and stop anytime, without you lifting a finger.
                </p>
                <div className="flex items-center gap-3 pt-3">
                  <Button onClick={() => setCreateDialogOpen(true)} className="gap-2 bg-primary hover:bg-primary/90">
                    <Plus className="h-4 w-4" />
                    Create Studio Program
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="border-primary/30 text-primary hover:bg-primary/10"
                    onClick={() => setSearchOpen(!searchOpen)}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" className="gap-2 text-muted-foreground">
                    <Filter className="h-4 w-4" />
                    Filter
                  </Button>
                </div>
              </div>

              {/* Decorative right side */}
              <div className="hidden md:flex items-center justify-center w-72">
                <div className="relative w-full h-40 rounded-xl bg-gradient-to-br from-purple-300/40 to-amber-200/40 dark:from-purple-800/30 dark:to-amber-700/30 flex items-center justify-center overflow-hidden">
                  <GraduationCap className="h-16 w-16 text-foreground/20" />
                  <div className="absolute -bottom-2 -right-2 h-12 w-12 rounded-full bg-primary/20" />
                  <div className="absolute -top-2 -left-2 h-8 w-8 rounded-full bg-amber-400/30" />
                </div>
              </div>
            </div>

            <button
              onClick={() => setBannerVisible(false)}
              className="absolute bottom-3 right-4 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Hide Banner <ChevronUp className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Search bar */}
        {searchOpen && (
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search programs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">Loading programs...</div>
        ) : !filteredPrograms?.length ? (
          <Card className="text-center py-12">
            <CardContent className="pt-6">
              <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No studio programs yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first structured training program for clients to follow at their own pace
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Studio Program
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPrograms.map((program) => (
              <Card
                key={program.id}
                className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
              >
                <div className="relative">
                  {program.cover_image_url ? (
                    <img
                      src={program.cover_image_url}
                      alt={program.name}
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 bg-muted flex items-center justify-center">
                      <GraduationCap className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  {/* Badges overlaid on image */}
                  <div className="absolute bottom-3 left-3 flex gap-2">
                    <Badge variant={program.status === "draft" ? "secondary" : "default"} className="text-xs">
                      {program.status === "draft" ? "● Draft" : "● Published"}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {program.duration_weeks} {program.duration_weeks === 1 ? "Week" : "Weeks"}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4 space-y-1">
                  <h3 className="font-semibold text-foreground line-clamp-1">{program.name}</h3>
                  {program.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {program.description}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground pt-1">
                    Available for{" "}
                    <strong className="text-foreground">
                      {program.client_studio_program_access?.[0]?.count || 0}
                    </strong>{" "}
                    clients
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Studio Program</DialogTitle>
              <DialogDescription>
                Create a structured multi-week training program clients can follow at their own pace
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Program Name *</Label>
                <Input
                  id="name"
                  value={programName}
                  onChange={(e) => setProgramName(e.target.value)}
                  placeholder="e.g., Starting Strength, 8-Week Shred"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={programDescription}
                  onChange={(e) => setProgramDescription(e.target.value)}
                  placeholder="Describe this program..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration</Label>
                <Select value={durationWeeks} onValueChange={setDurationWeeks}>
                  <SelectTrigger>
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

              <div className="space-y-2">
                <Label htmlFor="cover">Cover Image URL</Label>
                <Input
                  id="cover"
                  type="url"
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Program"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
