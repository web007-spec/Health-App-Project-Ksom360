import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Music, GripVertical, Star, Headphones, Moon } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ManageCategoryDialog } from "@/components/vibes/admin/ManageCategoryDialog";
import { AddSoundDialog } from "@/components/vibes/admin/AddSoundDialog";
import { ManageGuidedSessionDialog } from "@/components/vibes/admin/ManageGuidedSessionDialog";
import { ManageSleepStoryDialog } from "@/components/vibes/admin/ManageSleepStoryDialog";
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
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [editSession, setEditSession] = useState<any>(null);
  const [storyDialogOpen, setStoryDialogOpen] = useState(false);
  const [editStory, setEditStory] = useState<any>(null);
  const qc = useQueryClient();

  const { data: categories = [] } = useQuery({
    queryKey: ["vibes-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vibes_categories").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: sounds = [] } = useQuery({
    queryKey: ["vibes-sounds"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vibes_sounds").select("*, vibes_categories(name)").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["restore-guided-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restore_guided_sessions")
        .select("*, restore_session_voices(*)")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: stories = [] } = useQuery({
    queryKey: ["restore-sleep-stories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restore_sleep_stories")
        .select("*, restore_story_voices(*)")
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

  const deleteSession = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("restore_guided_sessions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["restore-guided-sessions"] }); toast.success("Session deleted"); },
  });

  const deleteStory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("restore_sleep_stories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["restore-sleep-stories"] }); toast.success("Story deleted"); },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Music className="h-6 w-6 text-primary" /> Restore Manager
          </h1>
          <p className="text-muted-foreground">Manage sounds, guided sessions, sleep stories, and categories</p>
        </div>

        <Tabs defaultValue="categories">
          <TabsList>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="sounds">Sounds</TabsTrigger>
            <TabsTrigger value="sessions">Guided Sessions</TabsTrigger>
            <TabsTrigger value="stories">Sleep Stories</TabsTrigger>
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

          <TabsContent value="sessions" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { setEditSession(null); setSessionDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Add Session
              </Button>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Voices</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{s.name}</p>
                          {s.subtitle && <p className="text-xs text-muted-foreground">{s.subtitle}</p>}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="secondary" className="capitalize">{s.category}</Badge></TableCell>
                      <TableCell>{Math.round(s.duration_seconds / 60)}m</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {(s.restore_session_voices || []).map((v: any) => (
                            <Badge key={v.id} variant="outline" className="text-xs capitalize">{v.voice_label}</Badge>
                          ))}
                          {(s.restore_session_voices || []).length === 0 && <span className="text-xs text-muted-foreground">None</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.is_published ? "default" : "secondary"}>
                          {s.is_published ? "Published" : "Draft"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setEditSession(s); setSessionDialogOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete session?</AlertDialogTitle>
                                <AlertDialogDescription>This will permanently remove the guided session and its voice files.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteSession.mutate(s.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {sessions.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No guided sessions yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="stories" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { setEditStory(null); setStoryDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Add Story
              </Button>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Voices</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stories.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{s.name}</p>
                          {s.subtitle && <p className="text-xs text-muted-foreground">{s.subtitle}</p>}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="secondary" className="capitalize">{s.story_type === "long_loop" ? "Long Loop" : "Story"}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {(s.restore_story_voices || []).map((v: any) => (
                            <Badge key={v.id} variant="outline" className="text-xs capitalize">{v.voice_label}</Badge>
                          ))}
                          {(s.restore_story_voices || []).length === 0 && <span className="text-xs text-muted-foreground">None</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.is_published ? "default" : "secondary"}>
                          {s.is_published ? "Published" : "Draft"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setEditStory(s); setStoryDialogOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete story?</AlertDialogTitle>
                                <AlertDialogDescription>This will permanently remove the sleep story and its voice files.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteStory.mutate(s.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {stories.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No sleep stories yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <ManageCategoryDialog open={catDialogOpen} onOpenChange={setCatDialogOpen} category={editCat} />
      <AddSoundDialog open={soundDialogOpen} onOpenChange={setSoundDialogOpen} sound={editSound} categories={categories} />
      <ManageGuidedSessionDialog open={sessionDialogOpen} onOpenChange={setSessionDialogOpen} session={editSession} sounds={sounds} />
      <ManageSleepStoryDialog open={storyDialogOpen} onOpenChange={setStoryDialogOpen} story={editStory} sounds={sounds} />
    </DashboardLayout>
  );
}
