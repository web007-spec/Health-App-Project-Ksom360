import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, X, Plus, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "breathwork", label: "Breathwork" },
  { value: "focus", label: "Focus" },
  { value: "wind_down", label: "Wind Down" },
  { value: "sleep", label: "Sleep" },
];

const TIME_OPTIONS = ["morning", "midday", "evening", "night"];

interface VoiceEntry {
  id?: string;
  voice_label: string;
  audio_url: string;
  file?: File;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  session?: any;
  sounds: any[];
}

export function ManageGuidedSessionDialog({ open, onOpenChange, session, sounds }: Props) {
  const [name, setName] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("breathwork");
  const [durationMin, setDurationMin] = useState(5);
  const [isPremium, setIsPremium] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [ambientSoundId, setAmbientSoundId] = useState("");
  const [timePriority, setTimePriority] = useState<string[]>([]);
  const [inhale, setInhale] = useState(4);
  const [hold, setHold] = useState(7);
  const [exhale, setExhale] = useState(8);
  const [voices, setVoices] = useState<VoiceEntry[]>([]);
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const qc = useQueryClient();

  useEffect(() => {
    if (session) {
      setName(session.name);
      setSubtitle(session.subtitle || "");
      setDescription(session.description || "");
      setCategory(session.category);
      setDurationMin(Math.round(session.duration_seconds / 60));
      setIsPremium(session.is_premium);
      setIsPublished(session.is_published);
      setAmbientSoundId(session.ambient_sound_id || "");
      setTimePriority(session.time_of_day_priority || []);
      const bp = session.breathing_pattern as any;
      if (bp) { setInhale(bp.inhale || 4); setHold(bp.hold || 7); setExhale(bp.exhale || 8); }
      setVoices(
        (session.restore_session_voices || []).map((v: any) => ({
          id: v.id,
          voice_label: v.voice_label,
          audio_url: v.audio_url,
        }))
      );
    } else {
      setName(""); setSubtitle(""); setDescription(""); setCategory("breathwork");
      setDurationMin(5); setIsPremium(false); setIsPublished(false); setAmbientSoundId("");
      setTimePriority([]); setInhale(4); setHold(7); setExhale(8); setVoices([]);
    }
  }, [session, open]);

  const toggleTime = (t: string) => {
    setTimePriority((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  };

  const addVoice = (label: string) => {
    setVoices((prev) => [...prev, { voice_label: label, audio_url: "" }]);
  };

  const removeVoice = (idx: number) => {
    setVoices((prev) => prev.filter((_, i) => i !== idx));
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const row = {
        trainer_id: user.id,
        name,
        subtitle: subtitle || null,
        description: description || null,
        category,
        duration_seconds: durationMin * 60,
        is_premium: isPremium,
        is_published: isPublished,
        ambient_sound_id: ambientSoundId || null,
        time_of_day_priority: timePriority.length ? timePriority : null,
        breathing_pattern: { inhale, hold, exhale },
      };

      let sessionId = session?.id;

      if (session) {
        const { error } = await supabase.from("restore_guided_sessions").update(row).eq("id", session.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("restore_guided_sessions").insert(row).select("id").single();
        if (error) throw error;
        sessionId = data.id;
      }

      // Upload voice files and upsert voice records
      for (const voice of voices) {
        let audioUrl = voice.audio_url;
        if (voice.file) {
          const ext = voice.file.name.split(".").pop();
          const path = `sessions/${sessionId}/${voice.voice_label}-${Date.now()}.${ext}`;
          const { error } = await supabase.storage.from("restore-audio").upload(path, voice.file);
          if (error) throw error;
          const { data: pub } = supabase.storage.from("restore-audio").getPublicUrl(path);
          audioUrl = pub.publicUrl;
        }
        if (!audioUrl) continue;

        if (voice.id) {
          await supabase.from("restore_session_voices").update({ audio_url: audioUrl, voice_label: voice.voice_label }).eq("id", voice.id);
        } else {
          await supabase.from("restore_session_voices").insert({ session_id: sessionId, voice_label: voice.voice_label, audio_url: audioUrl });
        }
      }

      // Delete removed voices
      if (session?.restore_session_voices) {
        const keepIds = voices.filter((v) => v.id).map((v) => v.id);
        const toDelete = session.restore_session_voices.filter((v: any) => !keepIds.includes(v.id));
        for (const v of toDelete) {
          await supabase.from("restore_session_voices").delete().eq("id", v.id);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["restore-guided-sessions"] });
      toast.success(session ? "Session updated" : "Session created");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const hasVoiceLabel = (label: string) => voices.some((v) => v.voice_label === label);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{session ? "Edit Guided Session" : "Create Guided Session"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Calm Breathing" />
          </div>
          <div>
            <Label>Subtitle</Label>
            <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="e.g. 4-7-8 pattern" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Duration (min)</Label>
              <Input type="number" min={1} max={120} value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))} />
            </div>
          </div>

          {/* Breathing pattern */}
          <div>
            <Label>Breathing Pattern (seconds)</Label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              <div>
                <span className="text-xs text-muted-foreground">Inhale</span>
                <Input type="number" min={1} max={20} value={inhale} onChange={(e) => setInhale(Number(e.target.value))} />
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Hold</span>
                <Input type="number" min={0} max={20} value={hold} onChange={(e) => setHold(Number(e.target.value))} />
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Exhale</span>
                <Input type="number" min={1} max={20} value={exhale} onChange={(e) => setExhale(Number(e.target.value))} />
              </div>
            </div>
          </div>

          {/* Time of day priority */}
          <div>
            <Label>Time-of-Day Priority</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {TIME_OPTIONS.map((t) => (
                <Badge key={t} variant={timePriority.includes(t) ? "default" : "outline"} className="cursor-pointer capitalize" onClick={() => toggleTime(t)}>
                  {t} {timePriority.includes(t) && <X className="h-3 w-3 ml-1" />}
                </Badge>
              ))}
            </div>
          </div>

          {/* Ambient sound */}
          <div>
            <Label>Ambient Sound Layer</Label>
            <Select value={ambientSoundId} onValueChange={setAmbientSoundId}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {sounds.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Voice versions */}
          <div>
            <Label>Voice Narration</Label>
            <p className="text-xs text-muted-foreground mb-2">Upload male/female voice versions. Sessions work without audio too.</p>
            <div className="space-y-2">
              {voices.map((voice, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 border rounded-lg">
                  <Badge variant="secondary" className="capitalize shrink-0">{voice.voice_label}</Badge>
                  <input
                    ref={(el) => { fileRefs.current[idx] = el; }}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setVoices((prev) => prev.map((v, i) => i === idx ? { ...v, file } : v));
                      }
                    }}
                  />
                  <Button variant="outline" size="sm" className="flex-1 justify-start text-xs" onClick={() => fileRefs.current[idx]?.click()}>
                    <Upload className="h-3 w-3 mr-1" />
                    {voice.file?.name || (voice.audio_url ? "Replace audio" : "Upload audio")}
                  </Button>
                  <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => removeVoice(idx)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              {!hasVoiceLabel("male") && (
                <Button variant="outline" size="sm" onClick={() => addVoice("male")}>
                  <Plus className="h-3 w-3 mr-1" /> Male Voice
                </Button>
              )}
              {!hasVoiceLabel("female") && (
                <Button variant="outline" size="sm" onClick={() => addVoice("female")}>
                  <Plus className="h-3 w-3 mr-1" /> Female Voice
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label>Premium</Label>
            <Switch checked={isPremium} onCheckedChange={setIsPremium} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Published</Label>
            <Switch checked={isPublished} onCheckedChange={setIsPublished} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!name || mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
