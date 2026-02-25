import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, Trash2, GripVertical, LayoutGrid, Users, Image, Search, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateSectionDialog } from "@/components/CreateSectionDialog";
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

function SortableSection({ section, onDelete, onAddResource, onChangeLayout }: any) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: section.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const layoutOptions = [
    { value: "large_cards", label: "Large Cards" },
    { value: "narrow_cards", label: "Narrow Cards" },
    { value: "small_cards", label: "Small Cards" },
    { value: "list", label: "List View" },
  ];

  const normalizedLayoutType = normalizeLayoutType(section.layout_type);

  return (
    <Card ref={setNodeRef} style={style} className="mb-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-3 flex-1">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">{section.name}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {section.section_resources?.length || 0} resources
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={normalizedLayoutType} onValueChange={(value) => onChangeLayout(section.id, value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {layoutOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => onAddResource(section.id)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Resource
          </Button>
          <Button size="sm" variant="destructive" onClick={() => onDelete(section.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {section.section_resources?.length > 0 ? (
          <div className={
            normalizedLayoutType === "list"
              ? "space-y-2"
              : normalizedLayoutType === "small_cards"
              ? "grid grid-cols-3 md:grid-cols-6 gap-3"
              : normalizedLayoutType === "narrow_cards"
              ? "flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
              : "grid grid-cols-1 md:grid-cols-2 gap-3"
          }>
            {section.section_resources.map((sr: any) => {
              const resource = sr.resources;
              if (normalizedLayoutType === "list") {
                return (
                  <div key={sr.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    {resource?.cover_image_url ? (
                      <img src={resource.cover_image_url} alt={resource?.name} className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Badge variant="secondary" className="text-[10px] capitalize">{resource?.type}</Badge>
                      </div>
                    )}
                    <p className="font-medium text-sm flex-1 line-clamp-1">{resource?.name}</p>
                    <Badge variant="secondary" className="capitalize text-xs shrink-0">{resource?.type}</Badge>
                  </div>
                );
              }
              if (normalizedLayoutType === "small_cards") {
                return (
                  <div key={sr.id} className="flex flex-col items-center gap-1.5">
                    {resource?.cover_image_url ? (
                      <img src={resource.cover_image_url} alt={resource?.name} className="w-14 h-14 rounded-xl object-cover" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center">
                        <Badge variant="secondary" className="text-[10px] capitalize">{resource?.type}</Badge>
                      </div>
                    )}
                    <p className="font-medium text-xs text-center line-clamp-2">{resource?.name}</p>
                  </div>
                );
              }
              if (normalizedLayoutType === "narrow_cards") {
                return (
                  <Card key={sr.id} className="overflow-hidden flex-shrink-0 w-36">
                    {resource?.cover_image_url ? (
                      <img src={resource.cover_image_url} alt={resource?.name} className="w-full h-24 object-cover" />
                    ) : (
                      <div className="w-full h-24 bg-muted flex items-center justify-center">
                        <Badge variant="secondary" className="capitalize text-xs">{resource?.type}</Badge>
                      </div>
                    )}
                    <CardContent className="p-2">
                      <p className="font-medium text-xs line-clamp-2">{resource?.name}</p>
                    </CardContent>
                  </Card>
                );
              }
              // large_cards (default)
              return (
                <Card key={sr.id} className="overflow-hidden">
                  {resource?.cover_image_url ? (
                    <img src={resource.cover_image_url} alt={resource?.name} className="w-full h-32 object-cover" />
                  ) : (
                    <div className="w-full h-32 bg-muted flex items-center justify-center">
                      <Badge variant="secondary" className="capitalize">{resource?.type}</Badge>
                    </div>
                  )}
                  <CardContent className="p-3">
                    <p className="font-medium text-sm line-clamp-2">{resource?.name}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            No resources yet. Click "Add Resource" to get started.
          </p>
        )}
      </CardContent>
    </Card>
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
  const [createSectionOpen, setCreateSectionOpen] = useState(false);
  const [addResourceOpen, setAddResourceOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

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

  if (isLoading) return <DashboardLayout><div className="p-6">Loading...</div></DashboardLayout>;
  if (!collection) return <DashboardLayout><div className="p-6">Collection not found</div></DashboardLayout>;

  const sections = collection.collection_sections
    ?.map((section: any) => ({ ...section, layout_type: normalizeLayoutType(section.layout_type) }))
    .sort((a: any, b: any) => a.order_index - b.order_index) || [];
  const totalResources = sections.reduce((sum: number, s: any) => sum + (s.section_resources?.length || 0), 0);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/resource-collections")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{collection.name}</h1>
              {collection.description && (
                <p className="text-muted-foreground mt-1">{collection.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="published">Published</Label>
              <Switch
                id="published"
                checked={collection.is_published}
                onCheckedChange={(checked) => togglePublished.mutate(checked)}
              />
            </div>
          </div>
        </div>

        {/* Cover Image */}
        <CoverImageSection collectionId={id!} currentUrl={(collection as any).cover_image_url} />

        <Tabs defaultValue="resources">
          <TabsList>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
          </TabsList>

          <TabsContent value="resources" className="space-y-6 mt-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Resource limit: {totalResources}/25
              </p>
              <Button onClick={() => setCreateSectionOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Section
              </Button>
            </div>

            {sections.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent className="pt-6">
                  <LayoutGrid className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No sections yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create sections to organize your resources
                  </p>
                  <Button onClick={() => setCreateSectionOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Section
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={sections.map((s: any) => s.id)} strategy={verticalListSortingStrategy}>
                  {sections.map((section: any) => (
                    <SortableSection
                      key={section.id}
                      section={section}
                      onDelete={(sectionId: string) => deleteSection.mutate(sectionId)}
                      onAddResource={handleAddResource}
                      onChangeLayout={(sectionId: string, layout: string) =>
                        updateLayout.mutate({ sectionId, layout })
                      }
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </TabsContent>

          <TabsContent value="clients" className="mt-4">
            <ClientAssignmentTab collectionId={id!} trainerId={user!.id} />
          </TabsContent>
        </Tabs>

        <CreateSectionDialog
          collectionId={id!}
          open={createSectionOpen}
          onOpenChange={setCreateSectionOpen}
        />

        <AddResourceToSectionDialog
          sectionId={selectedSection!}
          open={addResourceOpen}
          onOpenChange={setAddResourceOpen}
        />
      </div>
    </DashboardLayout>
  );
}
