import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Package, Filter, Folder, MoreVertical, Trash2, FileText, Link as LinkIcon, FileCheck, ChevronUp, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { CreateResourceDialog } from "@/components/CreateResourceDialog";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

/* ─── Hero Banner ─── */
function HeroBanner({ onAddResource, onSearch }: { onAddResource: () => void; onSearch: () => void }) {
  const [visible, setVisible] = useState(true);

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
    <div className="rounded-xl bg-gradient-to-br from-rose-50 to-orange-50/60 dark:from-rose-950/30 dark:to-orange-900/20 border border-rose-200/50 dark:border-rose-800/30 p-6 md:p-8 relative overflow-hidden">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left content */}
        <div className="flex-1 space-y-3">
          <p className="text-xs font-bold tracking-widest uppercase text-foreground/70">Studio Resources</p>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Quick access to links and documents</h2>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-md">
            Add resources for websites, videos, social media profiles, or documents you want to share with clients.
          </p>

          <div className="flex items-center gap-3 pt-3">
            <Button onClick={onAddResource} className="gap-2 bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              Add Resource
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="border-primary/30 text-primary hover:bg-primary/10"
              onClick={onSearch}
            >
              <Search className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="gap-2 text-muted-foreground">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>
        </div>

        {/* Right decorative cards */}
        <div className="hidden md:grid grid-cols-3 gap-2 w-64">
          <div className="h-20 rounded-lg bg-blue-400/80 flex items-start p-2">
            <span className="text-white font-bold text-lg">f</span>
          </div>
          <div className="h-20 rounded-lg bg-purple-400/60 flex items-start p-2">
            <span className="text-white font-bold text-lg">📷</span>
          </div>
          <div className="h-20 rounded-lg bg-muted/60 flex items-start p-2">
            <span className="text-muted-foreground font-bold text-lg">🔗</span>
          </div>
          <div className="h-20 rounded-lg bg-amber-300/70 flex items-start p-2">
            <span className="text-amber-900 font-bold text-[10px] uppercase">Documents</span>
          </div>
          <div className="h-20 rounded-lg bg-cyan-300/60 flex items-center justify-center">
            <span className="text-cyan-700 text-xl">▶</span>
          </div>
          <div className="h-20 rounded-lg bg-rose-400/60 flex items-center justify-center">
            <span className="text-white text-xl">▶</span>
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

/* ─── Page ─── */
export default function ResourceCollections() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [createCollectionOpen, setCreateCollectionOpen] = useState(false);
  const [createResourceOpen, setCreateResourceOpen] = useState(false);
  const [collectionName, setCollectionName] = useState("");
  const [collectionDescription, setCollectionDescription] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  // Fetch individual resources
  const { data: resources, isLoading: resourcesLoading } = useQuery({
    queryKey: ["resources", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .eq("trainer_id", user?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch collections
  const { data: collections, isLoading: collectionsLoading } = useQuery({
    queryKey: ["resource-collections", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resource_collections")
        .select(`
          *,
          collection_sections(count),
          client_collection_access(count)
        `)
        .eq("trainer_id", user?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const createCollectionMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("resource_collections")
        .insert({
          name: collectionName,
          description: collectionDescription,
          trainer_id: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["resource-collections"] });
      toast({ title: "Collection created successfully" });
      setCreateCollectionOpen(false);
      setCollectionName("");
      setCollectionDescription("");
      navigate(`/resource-collections/${data.id}`);
    },
    onError: () => {
      toast({ title: "Failed to create collection", variant: "destructive" });
    },
  });

  const deleteResourceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("resources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      toast({ title: "Resource deleted" });
      setDeleteTarget(null);
    },
    onError: () => {
      toast({ title: "Failed to delete resource", variant: "destructive" });
    },
  });

  const filteredResources = resources?.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCollections = collections?.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCollectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectionName.trim()) {
      toast({ title: "Please enter a collection name", variant: "destructive" });
      return;
    }
    createCollectionMutation.mutate();
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case "link": return <LinkIcon className="h-4 w-4" />;
      case "document": return <FileText className="h-4 w-4" />;
      case "form": return <FileCheck className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const isLoading = resourcesLoading || collectionsLoading;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Page title */}
        <h1 className="text-3xl font-bold text-foreground">Resources</h1>

        {/* Hero Banner */}
        <HeroBanner
          onAddResource={() => setCreateResourceOpen(true)}
          onSearch={() => setSearchOpen(!searchOpen)}
        />

        {/* Inline search bar (toggled) */}
        {searchOpen && (
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading resources...</div>
        ) : (
          <>
            {/* Resources Grid */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Resources</h2>
              {!filteredResources?.length ? (
                <Card className="text-center py-12">
                  <CardContent className="pt-6">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No resources yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Add links, documents, and media to share with clients
                    </p>
                    <Button onClick={() => setCreateResourceOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Resource
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {filteredResources.map((resource) => (
                    <div
                      key={resource.id}
                      className="flex items-center gap-3 p-3 border rounded-xl hover:bg-accent/50 transition-colors group cursor-pointer"
                      onClick={() => resource.url && window.open(resource.url, "_blank")}
                    >
                      {/* Thumbnail */}
                      <div className="h-12 w-12 rounded-md overflow-hidden flex-shrink-0">
                        {resource.cover_image_url ? (
                          <img src={resource.cover_image_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-primary/10 rounded-lg">
                            {getResourceIcon(resource.type)}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{resource.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {resource.url ? resource.url.replace(/^https?:\/\//, "").slice(0, 30) + "..." : "—"}
                        </p>
                      </div>

                      {/* Delete */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(resource);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Divider */}
            <hr className="border-border" />

            {/* Collections Section */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Collections</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredCollections?.map((collection) => (
                  <Card
                    key={collection.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/resource-collections/${collection.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Folder className="h-5 w-5 text-primary" />
                        <span className="font-medium truncate flex-1">{collection.name}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/resource-collections/${collection.id}`)}>
                              Open
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Available for <span className="font-semibold text-foreground">{collection.client_collection_access?.[0]?.count || 0}</span> clients
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Resources: <span className="font-semibold text-foreground">{collection.collection_sections?.[0]?.count || 0}</span>
                      </p>
                    </CardContent>
                  </Card>
                ))}

                {/* Create New Collection card */}
                <Card
                  className="cursor-pointer hover:shadow-md transition-shadow border-dashed"
                  onClick={() => setCreateCollectionOpen(true)}
                >
                  <CardContent className="p-4 flex flex-col items-center justify-center h-full min-h-[120px]">
                    <Plus className="h-6 w-6 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">Create New Collection</span>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}

        {/* Create Resource Dialog */}
        <CreateResourceDialog open={createResourceOpen} onOpenChange={setCreateResourceOpen} />

        {/* Create Collection Dialog */}
        <Dialog open={createCollectionOpen} onOpenChange={setCreateCollectionOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Resource Collection</DialogTitle>
              <DialogDescription>
                Group resources together to share with your clients
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCollectionSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Collection Name *</Label>
                <Input
                  id="name"
                  value={collectionName}
                  onChange={(e) => setCollectionName(e.target.value)}
                  placeholder="e.g., Nutrition Resources, Getting Started"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={collectionDescription}
                  onChange={(e) => setCollectionDescription(e.target.value)}
                  placeholder="Describe this collection..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setCreateCollectionOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={createCollectionMutation.isPending}>
                  {createCollectionMutation.isPending ? "Creating..." : "Create Collection"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete resource?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete "{deleteTarget?.name}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteTarget && deleteResourceMutation.mutate(deleteTarget.id)}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}