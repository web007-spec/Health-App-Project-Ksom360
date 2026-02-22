import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Music, GripVertical, Star } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ManageCategoryDialog } from "@/components/vibes/admin/ManageCategoryDialog";
import { AddSoundDialog } from "@/components/vibes/admin/AddSoundDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";

export default function VibesAdmin() {
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editCat, setEditCat] = useState<any>(null);
  const [soundDialogOpen, setSoundDialogOpen] = useState(false);
  const [editSound, setEditSound] = useState<any>(null);
  const qc = useQueryClient();

  const { data: categories = [] } = useQuery({
    queryKey: ["vibes-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vibes_categories")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: sounds = [] } = useQuery({
    queryKey: ["vibes-sounds"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vibes_sounds")
        .select("*, vibes_categories(name)")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const deleteCat = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vibes_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vibes-categories"] }); toast.success("Category deleted"); },
  });

  const deleteSound = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vibes_sounds").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vibes-sounds"] }); toast.success("Sound deleted"); },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Music className="h-6 w-6 text-primary" /> KSOM Vibes Manager
          </h1>
          <p className="text-muted-foreground">Manage soundscape categories, sounds, and starter mixes</p>
        </div>

        <Tabs defaultValue="categories">
          <TabsList>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="sounds">Sounds</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { setEditCat(null); setCatDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Add Category
              </Button>
            </div>
            <div className="grid gap-3">
              {categories.map((cat: any) => (
                <Card key={cat.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{cat.name}</p>
                        <p className="text-xs text-muted-foreground">/{cat.slug}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => { setEditCat(cat); setCatDialogOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete category?</AlertDialogTitle>
                            <AlertDialogDescription>Sounds in this category will become uncategorized.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteCat.mutate(cat.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {categories.length === 0 && <p className="text-muted-foreground text-center py-8">No categories yet</p>}
            </div>
          </TabsContent>

          <TabsContent value="sounds" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { setEditSound(null); setSoundDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Add Sound
              </Button>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Featured</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sounds.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{(s as any).vibes_categories?.name || "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {(s.tags || []).map((t: string) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                        </div>
                      </TableCell>
                      <TableCell>{s.is_featured && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setEditSound(s); setSoundDialogOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete sound?</AlertDialogTitle>
                                <AlertDialogDescription>This will remove the sound from all mixes.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteSound.mutate(s.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {sounds.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No sounds yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <ManageCategoryDialog
        open={catDialogOpen}
        onOpenChange={setCatDialogOpen}
        category={editCat}
      />
      <AddSoundDialog
        open={soundDialogOpen}
        onOpenChange={setSoundDialogOpen}
        sound={editSound}
        categories={categories}
      />
    </DashboardLayout>
  );
}
