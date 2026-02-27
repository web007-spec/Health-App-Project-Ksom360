import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, Plus, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VoiceEntry {
  id?: string;
  voice_label: string;
  audio_url: string;
  file?: File;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  story?: any;
  sounds: any[];
}

export function ManageSleepStoryDialog({ open, onOpenChange, story, sounds }: Props) {
  const [name, setName] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [storyType, setStoryType] = useState("story");
  const [isPremium, setIsPremium] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [ambientSoundId, setAmbientSoundId] = useState("");
  const [voices, setVoices] = useState<VoiceEntry[]>([]);
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const qc = useQueryClient();

  useEffect(() => {
    if (story) {
      setName(story.name);
      setSubtitle(story.subtitle || "");
      setDescription(story.description || "");
      setStoryType(story.story_type);
      setIsPremium(story.is_premium);
      setIsPublished(story.is_published);
      setAmbientSoundId(story.ambient_sound_id || "");
      setVoices(
        (story.restore_story_voices || []).map((v: any) => ({
          id: v.id, voice_label: v.voice_label, audio_url: v.audio_url,
        }))
      );
    } else {
      setName(""); setSubtitle(""); setDescription(""); setStoryType("story");
      setIsPremium(false); setIsPublished(false); setAmbientSoundId(""); setVoices([]);
    }
  }, [story, open]);

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
        story_type: storyType,
        is_premium: isPremium,
        is_published: isPublished,
        ambient_sound_id: ambientSoundId || null,
      };

      let storyId = story?.id;
      if (story) {
        const { error } = await supabase.from("restore_sleep_stories").update(row).eq("id", story.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("restore_sleep_stories").insert(row).select("id").single();
        if (error) throw error;
        storyId = data.id;
      }

      for (const voice of voices) {
        let audioUrl = voice.audio_url;
        if (voice.file) {
          const ext = voice.file.name.split(".").pop();
          const path = `stories/${storyId}/${voice.voice_label}-${Date.now()}.${ext}`;
          const { error } = await supabase.storage.from("restore-audio").upload(path, voice.file);
          if (error) throw error;
          const { data: pub } = supabase.storage.from("restore-audio").getPublicUrl(path);
          audioUrl = pub.publicUrl;
        }
        if (!audioUrl) continue;
        if (voice.id) {
          await supabase.from("restore_story_voices").update({ audio_url: audioUrl, voice_label: voice.voice_label }).eq("id", voice.id);
        } else {
          await supabase.from("restore_story_voices").insert({ story_id: storyId, voice_label: voice.voice_label, audio_url: audioUrl });
        }
      }

      if (story?.restore_story_voices) {
        const keepIds = voices.filter((v) => v.id).map((v) => v.id);
        const toDelete = story.restore_story_voices.filter((v: any) => !keepIds.includes(v.id));
        for (const v of toDelete) {
          await supabase.from("restore_story_voices").delete().eq("id", v.id);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["restore-sleep-stories"] });
      toast.success(story ? "Story updated" : "Story created");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const hasVoiceLabel = (label: string) => voices.some((v) => v.voice_label === label);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{story ? "Edit Sleep Story" : "Create Sleep Story"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ocean Drift" />
          </div>
          <div>
            <Label>Subtitle</Label>
            <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="e.g. Gentle waves" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={storyType} onValueChange={setStoryType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="story">Sleep Story</SelectItem>
                <SelectItem value="long_loop">Long Loop</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
            <p className="text-xs text-muted-foreground mb-2">Upload male/female narration versions.</p>
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
                      if (file) setVoices((prev) => prev.map((v, i) => i === idx ? { ...v, file } : v));
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
