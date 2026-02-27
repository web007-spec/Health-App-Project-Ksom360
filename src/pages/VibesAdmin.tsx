import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Music, GripVertical, Star, Headphones, Moon, Tag, Timer, ChevronDown, ChevronUp, Wind } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ManageCategoryDialog } from "@/components/vibes/admin/ManageCategoryDialog";
import { AddSoundDialog } from "@/components/vibes/admin/AddSoundDialog";
import { ManageGuidedSessionDialog } from "@/components/vibes/admin/ManageGuidedSessionDialog";
import { ManageSleepStoryDialog } from "@/components/vibes/admin/ManageSleepStoryDialog";
import { Card, CardContent } from "@/components/ui/card";
import { AdminBreathingTab } from "@/components/vibes/admin/AdminBreathingTab";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { PROTOCOL_DETAIL_COPY } from "@/lib/protocolDetailContent";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
  const [expandedProtocol, setExpandedProtocol] = useState<string | null>(null);

  const { data: protocols = [] } = useQuery({
    queryKey: ["admin-fasting-protocols"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fasting_protocols")
        .select("*")
        .order("category")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

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

  const { data: tags = [] } = useQuery({
    queryKey: ["vibes-tags"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vibes_tags").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [editTag, setEditTag] = useState<any>(null);
  const [tagName, setTagName] = useState("");

  const saveTag = useMutation({
    mutationFn: async () => {
      const slug = tagName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      if (editTag) {
        const { error } = await supabase.from("vibes_tags").update({ name: tagName, slug }).eq("id", editTag.id);
        if (error) throw error;
      } else {
        const maxOrder = tags.length > 0 ? Math.max(...tags.map((t: any) => t.sort_order)) + 1 : 0;
        const { error } = await supabase.from("vibes_tags").insert({ name: tagName, slug, sort_order: maxOrder });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vibes-tags"] });
      toast.success(editTag ? "Tag updated" : "Tag added");
      setTagDialogOpen(false);
      setEditTag(null);
      setTagName("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteTag = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vibes_tags").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vibes-tags"] }); toast.success("Tag deleted"); },
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
          <TabsList className="flex-wrap h-auto gap-1 mb-2">
            <TabsTrigger value="protocols">Fasting Protocols</TabsTrigger>
            <TabsTrigger value="breathing">Breathing</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="tags">Tags</TabsTrigger>
            <TabsTrigger value="sounds">Sounds</TabsTrigger>
            <TabsTrigger value="sessions">Guided Sessions</TabsTrigger>
            <TabsTrigger value="stories">Sleep Stories</TabsTrigger>
          </TabsList>

          <TabsContent value="protocols" className="space-y-4">
            {(() => {
              const grouped = (protocols as any[]).reduce((acc: Record<string, any[]>, p: any) => {
                const cat = p.category || "Uncategorized";
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push(p);
                return acc;
              }, {} as Record<string, any[]>);
              return Object.entries(grouped).map(([category, protos]) => (
                <div key={category} className="space-y-3">
                  <h3 className="text-lg font-semibold text-primary">{category}</h3>
                  <div className="space-y-2">
                    {(protos as any[]).map((p: any) => {
                      const detail = PROTOCOL_DETAIL_COPY[p.id];
                      const isExpanded = expandedProtocol === p.id;
                      return (
                        <Collapsible key={p.id} open={isExpanded} onOpenChange={() => setExpandedProtocol(isExpanded ? null : p.id)}>
                          <Card>
                            <CollapsibleTrigger asChild>
                              <CardContent className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <Timer className="h-5 w-5 text-primary" />
                                    <div>
                                      <p className="font-semibold">{p.name}</p>
                                      <p className="text-sm text-muted-foreground">{detail?.descriptionOverride || p.description}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <Badge variant="outline">{detail?.statsLabel || `${p.fast_target_hours}h`}</Badge>
                                    <Badge variant="secondary">{detail?.difficultyLabel || p.difficulty_level}</Badge>
                                    <Badge>{p.duration_days ? `${p.duration_days} days` : "Ongoing"}</Badge>
                                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                  </div>
                                </div>
                              </CardContent>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              {detail ? (
                                <CardContent className="pt-0 pb-4 px-4 space-y-4 border-t">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                                    <div className="space-y-3">
                                      <div>
                                        <h4 className="font-semibold text-sm mb-1">How It Works</h4>
                                        <ul className="text-sm text-muted-foreground space-y-1">
                                          {detail.howItWorks.map((s, i) => <li key={i}>• {s}</li>)}
                                        </ul>
                                      </div>
                                      {detail.progression && (
                                        <div>
                                          <h4 className="font-semibold text-sm mb-1">Progression</h4>
                                          <div className="space-y-1">
                                            {detail.progression.map((p, i) => (
                                              <div key={i} className="text-sm flex gap-2">
                                                <Badge variant="outline" className="text-xs">{p.label}</Badge>
                                                <span className="text-muted-foreground">Fast {p.fastHours} / Eat {p.eatHours}</span>
                                              </div>
                                            ))}
                                          </div>
                                          {detail.progressionNote && <p className="text-xs text-muted-foreground mt-1 italic">{detail.progressionNote}</p>}
                                        </div>
                                      )}
                                      <div>
                                        <h4 className="font-semibold text-sm mb-1">Schedule</h4>
                                        <p className="text-sm text-muted-foreground">Stop eating: {detail.schedule.stopEating}</p>
                                        <p className="text-sm text-muted-foreground">Break fast: {detail.schedule.breakFast}</p>
                                        <p className="text-sm text-muted-foreground mt-1">Meals: {detail.scheduleMeals.join(", ")}</p>
                                        {detail.scheduleNote && <p className="text-xs text-muted-foreground italic">{detail.scheduleNote}</p>}
                                      </div>
                                    </div>
                                    <div className="space-y-3">
                                      <div>
                                        <h4 className="font-semibold text-sm mb-1">Meal Strategy</h4>
                                        <ul className="text-sm text-muted-foreground space-y-1">
                                          {detail.mealStrategy.map((s, i) => <li key={i}>• {s}</li>)}
                                        </ul>
                                      </div>
                                      <div>
                                        <h4 className="font-semibold text-sm mb-1">What to Expect</h4>
                                        <ul className="text-sm text-muted-foreground space-y-1">
                                          {detail.whatToExpect.map((s, i) => <li key={i}>• {s}</li>)}
                                        </ul>
                                        {detail.whatToExpectNote && <p className="text-xs text-muted-foreground italic">{detail.whatToExpectNote}</p>}
                                      </div>
                                      <div>
                                        <h4 className="font-semibold text-sm mb-1">Coach Guidance</h4>
                                        <ul className="text-sm text-muted-foreground space-y-1">
                                          {detail.coachGuidance.map((s, i) => <li key={i}>• {s}</li>)}
                                        </ul>
                                      </div>
                                      <div>
                                        <h4 className="font-semibold text-sm mb-1">Who This Is For</h4>
                                        <ul className="text-sm text-muted-foreground space-y-1">
                                          {detail.whoThisIsFor.map((s, i) => <li key={i}>• {s}</li>)}
                                        </ul>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              ) : (
                                <CardContent className="pt-0 pb-4 px-4 border-t">
                                  <p className="text-sm text-muted-foreground pt-4 italic">No detailed copy configured for this protocol.</p>
                                </CardContent>
                              )}
                            </CollapsibleContent>
                          </Card>
                        </Collapsible>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
          </TabsContent>

          <TabsContent value="breathing" className="space-y-4">
            <AdminBreathingTab />
          </TabsContent>

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

          <TabsContent value="tags" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { setEditTag(null); setTagName(""); setTagDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Add Tag
              </Button>
            </div>
            <div className="grid gap-3">
              {tags.map((tag: any) => (
                <Card key={tag.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{tag.name}</p>
                        <p className="text-xs text-muted-foreground">/{tag.slug}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => { setEditTag(tag); setTagName(tag.name); setTagDialogOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete tag?</AlertDialogTitle>
                            <AlertDialogDescription>Sounds with this tag will no longer be filtered by it.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteTag.mutate(tag.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {tags.length === 0 && <p className="text-muted-foreground text-center py-8">No tags yet</p>}
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
                    <TableHead>Icon</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Audio</TableHead>
                    <TableHead>Featured</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sounds.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        {s.icon_url ? (
                          <img src={s.icon_url} alt={s.name} className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            <Music className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{(s as any).vibes_categories?.name || "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {(s.tags || []).map((t: string) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {s.audio_url ? (
                          <audio controls preload="none" className="h-8 w-32">
                            <source src={s.audio_url} />
                          </audio>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
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
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No sounds yet</TableCell></TableRow>
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

      {/* Tag edit dialog */}
      <Dialog open={tagDialogOpen} onOpenChange={(v) => { setTagDialogOpen(v); if (!v) { setEditTag(null); setTagName(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editTag ? "Edit Tag" : "Add Tag"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Tag Name</Label>
              <Input value={tagName} onChange={(e) => setTagName(e.target.value)} placeholder="e.g. Ambient" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTagDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => saveTag.mutate()} disabled={!tagName.trim() || saveTag.isPending}>
              {saveTag.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
