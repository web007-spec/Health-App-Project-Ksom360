import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Play, FolderDown, ChevronUp, ChevronDown, FileVideo, LayoutGrid } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

function HeroBanner({ onAddNew }: { onAddNew: () => void }) {
  const [visible, setVisible] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);

  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
      >
        Show Banner <ChevronDown className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/60 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-200/50 dark:border-blue-800/30 p-6 md:p-8 relative overflow-hidden">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left content */}
        <div className="flex-1 space-y-3">
          <p className="text-xs font-bold tracking-widest uppercase text-foreground/70">Workout Collections</p>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Netflix-style Training Portal</h2>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-md">
            Create an on-demand searchable workout directory with different categories
            that your clients can browse anytime
          </p>

          <div className="flex items-center gap-3 pt-3">
            <Button onClick={onAddNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Add New Collection
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

        {/* Right phone mockup */}
        <div className="hidden md:flex items-center justify-center">
          <div className="relative">
            {/* Phone frame */}
            <div className="w-44 h-72 bg-foreground rounded-[1.5rem] p-2 shadow-2xl">
              <div className="w-full h-full bg-background rounded-[1.1rem] overflow-hidden flex flex-col">
                {/* Phone header */}
                <div className="p-3 flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-foreground">Workout Collection</span>
                  <Search className="h-3 w-3 text-muted-foreground" />
                </div>
                {/* Phone content placeholder */}
                <div className="flex-1 px-2 pb-2 space-y-1.5">
                  <div className="w-full h-16 rounded-lg bg-blue-200/50 dark:bg-blue-800/30 flex items-center justify-center">
                    <Play className="h-5 w-5 text-blue-500/60" />
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="h-10 rounded bg-amber-200/50 dark:bg-amber-800/30" />
                    <div className="h-10 rounded bg-teal-200/50 dark:bg-teal-800/30" />
                    <div className="h-10 rounded bg-violet-200/50 dark:bg-violet-800/30" />
                    <div className="h-10 rounded bg-rose-200/50 dark:bg-rose-800/30" />
                    <div className="h-10 rounded bg-muted/60" />
                    <div className="h-10 rounded bg-muted/60" />
                  </div>
                </div>
              </div>
            </div>
            {/* Small overlay card */}
            <div className="absolute -right-8 top-14 w-28 bg-background rounded-lg shadow-lg border p-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-semibold text-foreground">Categories</span>
                <Search className="h-2.5 w-2.5 text-muted-foreground" />
              </div>
              <div className="grid grid-cols-2 gap-1">
                <div className="h-7 rounded bg-purple-200/60 dark:bg-purple-800/30" />
                <div className="h-7 rounded bg-amber-200/60 dark:bg-amber-800/30" />
                <div className="h-7 rounded bg-emerald-200/60 dark:bg-emerald-800/30" />
                <div className="h-7 rounded bg-blue-200/60 dark:bg-blue-800/30" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hide Banner toggle */}
      <button
        onClick={() => setVisible(false)}
        className="absolute bottom-3 right-4 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        Hide Banner <ChevronUp className="h-3 w-3" />
      </button>
    </div>
  );
}

function EmptyState({ onAddNew }: { onAddNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex items-center gap-1 mb-2 text-muted-foreground/50">
        <FileVideo className="h-8 w-8" />
        <LayoutGrid className="h-9 w-9" />
        <FileVideo className="h-8 w-8" />
      </div>
      <FolderDown className="h-14 w-14 text-muted-foreground/40 mb-4" />
      <p className="text-muted-foreground text-sm">
        First, create your on-demand workouts
      </p>
      <p className="text-muted-foreground text-sm">
        Then add them to your new Collections
      </p>
    </div>
  );
}

export default function WorkoutCollections() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [collectionName, setCollectionName] = useState("");
  const [collectionType, setCollectionType] = useState("");
  const [showTypePreview, setShowTypePreview] = useState(true);

  const { data: collections, isLoading } = useQuery({
    queryKey: ["workout-collections", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_collections")
        .select(`
          *,
          workout_collection_categories(count)
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
        .from("workout_collections")
        .insert({
          name: collectionName,
          description: collectionType || null,
          trainer_id: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["workout-collections"] });
      toast({ title: "Collection created successfully" });
      setCreateDialogOpen(false);
      setCollectionName("");
      setCollectionType("");
      navigate(`/workout-collections/${data.id}`);
    },
    onError: () => {
      toast({ title: "Failed to create collection", variant: "destructive" });
    },
  });

  const filteredCollections = collections?.filter((collection) =>
    collection.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectionName.trim()) {
      toast({ title: "Please enter a collection name", variant: "destructive" });
      return;
    }
    createMutation.mutate();
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Workout Collections</h1>

        <HeroBanner onAddNew={() => setCreateDialogOpen(true)} />

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading collections...</div>
        ) : !filteredCollections?.length ? (
          <EmptyState onAddNew={() => setCreateDialogOpen(true)} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCollections.map((collection) => (
              <Card
                key={collection.id}
                className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
                onClick={() => navigate(`/workout-collections/${collection.id}`)}
              >
                {collection.cover_image_url ? (
                  <img
                    src={collection.cover_image_url}
                    alt={collection.name}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-muted flex items-center justify-center">
                    <Play className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="line-clamp-1">{collection.name}</span>
                    {collection.is_published && (
                      <Badge variant="default">Published</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {collection.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {collection.description}
                    </p>
                  )}
                </CardContent>
                <CardFooter className="text-sm text-muted-foreground">
                  {collection.workout_collection_categories?.[0]?.count || 0} categories
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="sm:max-w-[460px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Create New Collection</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name</Label>
                <Input
                  id="name"
                  value={collectionName}
                  onChange={(e) => setCollectionName(e.target.value)}
                  placeholder="Collection Name"
                  required
                  className="border-primary/40 focus-visible:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="type" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</Label>
                <Input
                  id="type"
                  value={collectionType}
                  onChange={(e) => setCollectionType(e.target.value)}
                  placeholder="Add a label for the Collection Type"
                />
                {showTypePreview && (
                  <div className="mt-3 rounded-xl bg-muted/50 border p-4 space-y-3">
                    <p className="text-sm font-semibold text-foreground">Collection Type</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Add a short label that will show above the Collection Name on the list of On-demand Collections.
                    </p>
                    {/* Phone mockup preview */}
                    <div className="flex justify-center pt-1">
                      <div className="w-48 bg-foreground rounded-[1.6rem] p-[6px] shadow-xl">
                        <div className="w-full bg-background rounded-[1.2rem] overflow-hidden">
                          {/* Notch */}
                          <div className="flex justify-center pt-1.5 pb-1">
                            <div className="w-16 h-1 rounded-full bg-muted-foreground/20" />
                          </div>
                          {/* Screen content */}
                          <div className="px-3 pb-3 space-y-2">
                            <p className="text-xs font-bold text-foreground">On-demand</p>
                            <div className="rounded-lg overflow-hidden relative h-24 flex items-end">
                              <img src="/images/pushup-preview.jpg" alt="Workout preview" className="absolute inset-0 w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 to-transparent" />
                              <div className="relative p-2 space-y-0.5">
                                <span className="inline-block text-[8px] font-semibold uppercase tracking-wider text-primary-foreground/80 bg-primary/60 rounded px-1 py-0.5">
                                  {collectionType || "WORKOUTS"}
                                </span>
                                <p className="text-[10px] font-bold text-primary-foreground">
                                  {collectionName || "Fitness at Home"}
                                </p>
                              </div>
                            </div>
                            <div className="h-4 rounded bg-muted/80 w-3/4" />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setShowTypePreview(false)}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        Got it
                      </button>
                    </div>
                  </div>
                )}
                {!showTypePreview && (
                  <p className="text-xs text-muted-foreground">
                    Add a short label that will show above the Collection Name on the list of On-demand Collections.
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
