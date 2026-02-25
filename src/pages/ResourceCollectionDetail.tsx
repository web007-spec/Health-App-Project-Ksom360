import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, Trash2, GripVertical, LayoutGrid, Users, Image, Search, Upload, X, ChevronDown, ChevronRight, MoreHorizontal, ListIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
// CreateSectionDialog removed – inline add used instead
import { AddResourceToSectionDialog } from "@/components/AddResourceToSectionDialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CollectionPhonePreview } from "@/components/resource-collections/CollectionPhonePreview";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const normalizeLayoutType = (layout?: string | null) => {
  switch (layout) {
    case "large":
      return "large_cards";
    case "narrow":
      return "narrow_cards";
    case "small":
      return "small_cards";
    case "list":
      return "list";
    default:
      return layout || "large_cards";
  }
};

function SortableSection({ section, onDelete, onAddResource, onChangeLayout, onRenameSection }: any) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: section.id,
  });
  const [isOpen, setIsOpen] = useState(true);
  const [formatOpen, setFormatOpen] = useState(false);
  const [selectedLayout, setSelectedLayout] = useState(normalizeLayoutType(section.layout_type));
  const [editingSectionName, setEditingSectionName] = useState(section.name);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const layoutOptions = [
    {
      id: "large_cards",
      label: "Large Cards",
      icon: (
        <div className="w-full h-full border-2 border-current rounded flex flex-col p-1">
          <div className="flex-1 border-b border-current rounded-sm bg-current/10" />
          <div className="h-3" />
        </div>
      ),
    },
    {
      id: "small_cards",
      label: "Squares",
      icon: (
        <div className="w-full h-full flex gap-1 p-1">
          <div className="flex-1 border-2 border-current rounded bg-current/10" />
          <div className="flex-1 border-2 border-current rounded bg-current/10" />
        </div>
      ),
    },
    {
      id: "narrow_cards",
      label: "Narrow cards",
      icon: (
        <div className="w-full h-full flex gap-0.5 p-1">
          <div className="flex-1 border-2 border-current rounded bg-current/10" />
          <div className="flex-1 border-2 border-current rounded bg-current/10" />
          <div className="flex-1 border-2 border-current rounded bg-current/10" />
        </div>
      ),
    },
    {
      id: "list",
      label: "List",
      icon: (
        <div className="w-full h-full flex flex-col gap-0.5 p-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-0.5 flex-1">
              <div className="w-3 border-2 border-current rounded bg-current/10" />
              <div className="flex-1 border-2 border-current rounded bg-current/10" />
            </div>
          ))}
        </div>
      ),
    },
  ];

  const resourceCount = section.section_resources?.length || 0;

  return (
    <div ref={setNodeRef} style={style} className="mb-4 border rounded-lg bg-card">
      {/* Section header */}
      <div className="flex items-center gap-2 px-4 py-3">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing shrink-0">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>

        <button
          className="shrink-0 hover:opacity-80 transition-opacity"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-primary" />
          ) : (
            <ChevronRight className="h-4 w-4 text-primary" />
          )}
        </button>

        {/* Editable section name */}
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <Input
            className="font-bold text-base border-primary/30 bg-transparent h-8 px-2 max-w-[250px]"
            value={editingSectionName}
            onChange={(e) => {
              setEditingSectionName(e.target.value);
              onRenameSection?.(section.id, e.target.value);
            }}
            onBlur={() => {
              if (editingSectionName && editingSectionName !== section.name) {
                onRenameSection?.(section.id, editingSectionName, true);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && editingSectionName) {
                onRenameSection?.(section.id, editingSectionName, true);
                (e.target as HTMLInputElement).blur();
              }
            }}
          />
          <span className="text-muted-foreground text-sm shrink-0">({resourceCount})</span>
        </div>

        {/* Format dropdown */}
        <Popover open={formatOpen} onOpenChange={setFormatOpen}>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm text-muted-foreground hover:bg-accent transition-colors">
              <ListIcon className="h-4 w-4" />
              <span>Format</span>
              <ChevronDown className="h-3 w-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[380px] p-5" align="end">
            <h3 className="text-lg font-semibold mb-4">Choose card design</h3>
            <div className="grid grid-cols-4 gap-3 mb-5">
              {layoutOptions.map((layout) => (
                <button
                  key={layout.id}
                  type="button"
                  onClick={() => setSelectedLayout(layout.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border-2 transition-colors aspect-square p-2",
                    selectedLayout === layout.id
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  )}
                >
                  <div className="w-full flex-1">{layout.icon}</div>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-3 mb-5 -mt-3">
              {layoutOptions.map((layout) => (
                <p key={layout.id} className="text-[11px] text-center text-muted-foreground font-medium">
                  {layout.label}
                </p>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setFormatOpen(false)}>Cancel</Button>
              <Button onClick={() => { onChangeLayout(section.id, selectedLayout); setFormatOpen(false); }}>
                Update
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Three-dot menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="text-destructive" onClick={() => onDelete(section.id)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Section
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Collapsible content */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent>
          <div className="px-4 pb-4">
            {resourceCount > 0 ? (
              <>
                <div className="space-y-2">
                  {section.section_resources.map((sr: any) => {
                    const resource = sr.resources;
                    return (
                      <div key={sr.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        {resource?.cover_image_url ? (
                          <img src={resource.cover_image_url} alt={resource?.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <Badge variant="secondary" className="text-[10px] capitalize">{resource?.type}</Badge>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm line-clamp-1">{resource?.name}</p>
                          {resource?.url && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{resource.url}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button
                  className="text-sm text-primary font-medium mt-3 hover:underline"
                  onClick={() => onAddResource(section.id)}
                >
                  + Add Resource
                </button>
              </>
            ) : (
              <div
                className="border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center py-10 cursor-pointer hover:bg-accent/30 transition-colors"
                onClick={() => onAddResource(section.id)}
              >
                {/* Document with plus icon */}
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="text-muted-foreground mb-2">
                  <rect x="8" y="4" width="24" height="32" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
                  <line x1="13" y1="14" x2="22" y2="14" stroke="currentColor" strokeWidth="1.5" />
                  <line x1="13" y1="19" x2="27" y2="19" stroke="currentColor" strokeWidth="1.5" />
                  <line x1="13" y1="24" x2="24" y2="24" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="30" cy="10" r="6" fill="hsl(var(--background))" stroke="currentColor" strokeWidth="1.5" />
                  <line x1="30" y1="7" x2="30" y2="13" stroke="currentColor" strokeWidth="1.5" />
                  <line x1="27" y1="10" x2="33" y2="10" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                <span className="text-sm text-muted-foreground">Add Resource</span>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function CoverImageSection({ collectionId, currentUrl }: { collectionId: string; currentUrl?: string }) {
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `covers/${collectionId}-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("resource-files").upload(filePath, file);
      if (uploadErr) throw uploadErr;
      const { data } = supabase.storage.from("resource-files").getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      const { error } = await supabase
        .from("resource_collections")
        .update({ cover_image_url: publicUrl } as any)
        .eq("id", collectionId);
      if (error) throw error;

      setPreview(publicUrl);
      queryClient.invalidateQueries({ queryKey: ["resource-collection", collectionId] });
      toast({ title: "Cover image updated" });
    } catch {
      toast({ title: "Failed to upload cover image", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const removeCover = async () => {
    const { error } = await supabase
      .from("resource_collections")
      .update({ cover_image_url: null } as any)
      .eq("id", collectionId);
    if (!error) {
      setPreview(null);
      queryClient.invalidateQueries({ queryKey: ["resource-collection", collectionId] });
      toast({ title: "Cover image removed" });
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
          }}
        />
        {preview ? (
          <div className="relative">
            <img src={preview} alt="Cover" className="w-full h-40 object-cover rounded-lg" />
            <div className="absolute top-2 right-2 flex gap-1">
              <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="secondary" className="h-7 w-7" onClick={removeCover}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full h-24 border-dashed"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <div className="flex flex-col items-center gap-1">
              <Image className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {isUploading ? "Uploading..." : "Upload cover image"}
              </span>
            </div>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function ClientAssignmentTab({ collectionId, trainerId }: { collectionId: string; trainerId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: clients } = useQuery({
    queryKey: ["trainer-clients-for-assign", trainerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_feature_settings")
        .select("client_id, profiles:client_id(id, full_name, email, avatar_url)")
        .eq("trainer_id", trainerId);
      if (error) throw error;
      return (data as any[])?.map((d) => d.profiles).filter(Boolean) || [];
    },
    enabled: !!trainerId,
  });

  const { data: assignedClients } = useQuery({
    queryKey: ["collection-clients", collectionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_collection_access")
        .select("client_id")
        .eq("collection_id", collectionId);
      if (error) throw error;
      return data?.map((a) => a.client_id) || [];
    },
    enabled: !!collectionId,
  });

  const toggleClient = useMutation({
    mutationFn: async (clientId: string) => {
      const isAssigned = assignedClients?.includes(clientId);
      if (isAssigned) {
        const { error } = await supabase
          .from("client_collection_access")
          .delete()
          .eq("collection_id", collectionId)
          .eq("client_id", clientId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("client_collection_access")
          .insert({ collection_id: collectionId, client_id: clientId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collection-clients", collectionId] });
      queryClient.invalidateQueries({ queryKey: ["client-resource-collections"] });
    },
    onError: () => {
      toast({ title: "Failed to update client access", variant: "destructive" });
    },
  });

  const filteredClients = clients?.filter((c) =>
    (c.full_name || c.email || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const assignedCount = assignedClients?.length || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <Users className="inline h-4 w-4 mr-1" />
          {assignedCount} client{assignedCount !== 1 ? "s" : ""} assigned
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search clients..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredClients?.map((client) => {
          const isAssigned = assignedClients?.includes(client.id);
          return (
            <div
              key={client.id}
              className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
              onClick={() => toggleClient.mutate(client.id)}
            >
              <Checkbox checked={isAssigned} />
              <Avatar className="h-8 w-8">
                <AvatarImage src={client.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {(client.full_name || client.email || "?").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{client.full_name || "Unnamed"}</p>
                <p className="text-xs text-muted-foreground truncate">{client.email}</p>
              </div>
              {isAssigned && <Badge variant="default" className="text-xs">Assigned</Badge>}
            </div>
          );
        })}
        {!filteredClients?.length && (
          <p className="text-center text-muted-foreground py-8 text-sm">No clients found</p>
        )}
      </div>
    </div>
  );
}

export default function ResourceCollectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addResourceOpen, setAddResourceOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [newSectionName, setNewSectionName] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { data: collection, isLoading } = useQuery({
    queryKey: ["resource-collection", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resource_collections")
        .select(`
          *,
          collection_sections(
            *,
            section_resources(
              *,
              resources(*)
            )
          )
        `)
        .eq("id", id)
        .eq("trainer_id", user?.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user?.id,
  });

  const togglePublished = useMutation({
    mutationFn: async (isPublished: boolean) => {
      const { error } = await supabase
        .from("resource_collections")
        .update({ is_published: isPublished })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-collection", id] });
      toast({ title: "Collection updated" });
    },
  });

  const deleteSection = useMutation({
    mutationFn: async (sectionId: string) => {
      const { error } = await supabase
        .from("collection_sections")
        .delete()
        .eq("id", sectionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-collection", id] });
      toast({ title: "Section deleted" });
    },
  });

  const reorderSections = useMutation({
    mutationFn: async (sections: any[]) => {
      const updates = sections.map((section, index) => ({
        id: section.id,
        order_index: index,
      }));

      for (const update of updates) {
        await supabase
          .from("collection_sections")
          .update({ order_index: update.order_index })
          .eq("id", update.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-collection", id] });
    },
  });

  const updateLayout = useMutation({
    mutationFn: async ({ sectionId, layout }: { sectionId: string; layout: string }) => {
      const normalizedLayout = normalizeLayoutType(layout);
      const { error } = await supabase
        .from("collection_sections")
        .update({ layout_type: normalizedLayout as any })
        .eq("id", sectionId);
      if (error) throw error;
      return { sectionId, layout: normalizedLayout };
    },
    onMutate: async ({ sectionId, layout }) => {
      const normalizedLayout = normalizeLayoutType(layout);
      await queryClient.cancelQueries({ queryKey: ["resource-collection", id] });
      const previousCollection = queryClient.getQueryData(["resource-collection", id]);

      queryClient.setQueryData(["resource-collection", id], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          collection_sections: old.collection_sections?.map((section: any) =>
            section.id === sectionId ? { ...section, layout_type: normalizedLayout } : section
          ),
        };
      });

      return { previousCollection };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousCollection) {
        queryClient.setQueryData(["resource-collection", id], context.previousCollection);
      }
      toast({ title: "Failed to update layout", variant: "destructive" });
    },
    onSuccess: () => {
      toast({ title: "Layout updated" });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["resource-collection", id] });
      await queryClient.refetchQueries({ queryKey: ["resource-collection", id], exact: true });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const sections = collection?.collection_sections || [];
    const oldIndex = sections.findIndex((s: any) => s.id === active.id);
    const newIndex = sections.findIndex((s: any) => s.id === over.id);

    const reordered = arrayMove(sections, oldIndex, newIndex);
    reorderSections.mutate(reordered);
  };

  const handleAddResource = (sectionId: string) => {
    setSelectedSection(sectionId);
    setAddResourceOpen(true);
  };

  const [editName, setEditName] = useState(collection?.name || "");
  const [isEditingName, setIsEditingName] = useState(false);
  const [sectionNameOverrides, setSectionNameOverrides] = useState<Record<string, string>>({});

  const updateName = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from("resource_collections")
        .update({ name })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-collection", id] });
      toast({ title: "Name updated" });
      setIsEditingName(false);
    },
  });

  const renameSectionMutation = useMutation({
    mutationFn: async ({ sectionId, name }: { sectionId: string; name: string }) => {
      const { error } = await supabase
        .from("collection_sections")
        .update({ name })
        .eq("id", sectionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-collection", id] });
    },
  });

  const handleRenameSection = (sectionId: string, name: string, persist?: boolean) => {
    // Always update local override for live preview
    setSectionNameOverrides((prev) => ({ ...prev, [sectionId]: name }));
    // Persist to DB on blur/enter
    if (persist) {
      renameSectionMutation.mutate({ sectionId, name });
    }
  };

  if (isLoading || !user) return <DashboardLayout><div className="p-6">Loading...</div></DashboardLayout>;
  if (!collection) return <DashboardLayout><div className="p-6">Collection not found</div></DashboardLayout>;

  const sections = collection.collection_sections
    ?.map((section: any) => ({ ...section, layout_type: normalizeLayoutType(section.layout_type) }))
    .sort((a: any, b: any) => a.order_index - b.order_index) || [];
  const totalResources = sections.reduce((sum: number, s: any) => sum + (s.section_resources?.length || 0), 0);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        {/* Compact Everfit-style header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/resource-collections")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">{editName || collection.name}</h1>
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="published" className="text-sm">Published</Label>
              <Switch
                id="published"
                checked={collection.is_published}
                onCheckedChange={(checked) => togglePublished.mutate(checked)}
              />
            </div>
          </div>
        </div>

        <Tabs defaultValue="resources">
          <TabsList>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
          </TabsList>

          <TabsContent value="resources" className="mt-4">
            {/* Inline editable name row */}
            <div className="flex items-center gap-3 mb-2">
              <div className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center shrink-0 bg-muted/30 overflow-hidden">
                {(collection as any).cover_image_url ? (
                  <img src={(collection as any).cover_image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Image className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Input
                  className="text-lg font-semibold border-primary/30 bg-muted/30 h-12"
                  maxLength={30}
                  value={editName}
                  onFocus={() => setIsEditingName(true)}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => { if (isEditingName && editName && editName !== collection.name) updateName.mutate(editName); else setIsEditingName(false); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && editName) updateName.mutate(editName); }}
                />
                {isEditingName && (
                  <p className={`text-xs mt-1 ${editName.length >= 28 ? "text-destructive" : "text-muted-foreground"}`}>
                    Characters: <span className="font-semibold">{editName.length}/30</span>
                  </p>
                )}
              </div>
              <Button variant="outline" disabled={!isEditingName || editName === collection.name} onClick={() => { if (editName) updateName.mutate(editName); }}>
                Save
              </Button>
            </div>

            <div className="flex gap-6">
              <div className="flex-1 space-y-4 min-w-0">
                <p className="text-sm text-muted-foreground">
                  Resource limit: {totalResources}/25
                </p>

                {sections.length === 0 && !newSectionName ? (
                  <Card className="text-center py-12">
                    <CardContent className="pt-6">
                      <LayoutGrid className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No sections yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Create sections to organize your resources
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={sections.map((s: any) => s.id)} strategy={verticalListSortingStrategy}>
                      {sections.map((section: any) => (
                        <SortableSection
                          key={section.id}
                          section={{ ...section, name: sectionNameOverrides[section.id] || section.name }}
                          onDelete={(sectionId: string) => deleteSection.mutate(sectionId)}
                          onAddResource={handleAddResource}
                          onChangeLayout={(sectionId: string, layout: string) =>
                            updateLayout.mutate({ sectionId, layout })
                          }
                          onRenameSection={handleRenameSection}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}

                {/* Inline Add New Section */}
                <div className="border-2 border-dashed border-border rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-muted-foreground" />
                    <Input
                      className="border-primary/30 bg-transparent h-9 max-w-[300px] placeholder:text-muted-foreground"
                      placeholder="Add New Section"
                      value={newSectionName}
                      onChange={(e) => setNewSectionName(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter" && newSectionName.trim()) {
                          const maxOrder = sections.length > 0
                            ? Math.max(...sections.map((s: any) => s.order_index ?? 0))
                            : -1;
                          const { error } = await supabase.from("collection_sections").insert({
                            collection_id: id!,
                            name: newSectionName.trim(),
                            layout_type: "large_cards" as any,
                            order_index: maxOrder + 1,
                          });
                          if (!error) {
                            queryClient.invalidateQueries({ queryKey: ["resource-collection", id] });
                            setNewSectionName("");
                            toast({ title: "Section created" });
                          } else {
                            toast({ title: "Failed to create section", variant: "destructive" });
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Phone preview — hidden on small screens */}
              <div className="hidden lg:block w-[310px] shrink-0">
              <CollectionPhonePreview
                  collectionName={editName || collection.name}
                  coverImageUrl={(collection as any).cover_image_url}
                  sections={sections.map((s: any) => ({ ...s, name: sectionNameOverrides[s.id] || s.name }))}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="clients" className="mt-4">
            <ClientAssignmentTab collectionId={id!} trainerId={user!.id} />
          </TabsContent>
        </Tabs>




        <AddResourceToSectionDialog
          sectionId={selectedSection!}
          open={addResourceOpen}
          onOpenChange={setAddResourceOpen}
        />
      </div>
    </DashboardLayout>
  );
}
