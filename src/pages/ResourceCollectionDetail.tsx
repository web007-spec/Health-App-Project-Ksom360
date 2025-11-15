import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, Trash2, GripVertical, LayoutGrid } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateSectionDialog } from "@/components/CreateSectionDialog";
import { AddResourceToSectionDialog } from "@/components/AddResourceToSectionDialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
          <Select value={section.layout_type} onValueChange={(value) => onChangeLayout(section.id, value)}>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {section.section_resources.map((sr: any) => (
              <Card key={sr.id} className="overflow-hidden">
                <CardContent className="p-3">
                  <p className="font-medium text-sm line-clamp-2">{sr.resources?.name}</p>
                  <Badge variant="secondary" className="mt-2 text-xs capitalize">
                    {sr.resources?.type}
                  </Badge>
                </CardContent>
              </Card>
            ))}
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
      const { error } = await supabase
        .from("collection_sections")
        .update({ layout_type: layout as any })
        .eq("id", sectionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-collection", id] });
      toast({ title: "Layout updated" });
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

  const sections = collection.collection_sections?.sort((a: any, b: any) => a.order_index - b.order_index) || [];

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
            <Button onClick={() => setCreateSectionOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Section
            </Button>
          </div>
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
