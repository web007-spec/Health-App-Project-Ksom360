import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Upload } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TAG_OPTIONS = ["nature", "rain", "asmr", "colored-noise", "brainwaves", "musical", "sleep", "meditation", "ambient"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sound?: any;
  categories: any[];
}

export function AddSoundDialog({ open, onOpenChange, sound, categories }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const iconRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  useEffect(() => {
    if (sound) {
      setName(sound.name);
      setDescription(sound.description || "");
      setCategoryId(sound.category_id || "");
      setTags(sound.tags || []);
      setIsFeatured(sound.is_featured);
      setIsPremium(sound.is_premium);
    } else {
      setName(""); setDescription(""); setCategoryId(""); setTags([]); setIsFeatured(false); setIsPremium(false);
    }
    setAudioFile(null); setIconFile(null);
  }, [sound, open]);

  const toggleTag = (tag: string) => {
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      let audioUrl = sound?.audio_url || "";
      let iconUrl = sound?.icon_url || "";

      if (audioFile) {
        const ext = audioFile.name.split(".").pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("vibes-audio").upload(path, audioFile);
        if (error) throw error;
        const { data: pub } = supabase.storage.from("vibes-audio").getPublicUrl(path);
        audioUrl = pub.publicUrl;
      }
      if (iconFile) {
        const ext = iconFile.name.split(".").pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("vibes-icons").upload(path, iconFile);
        if (error) throw error;
        const { data: pub } = supabase.storage.from("vibes-icons").getPublicUrl(path);
        iconUrl = pub.publicUrl;
      }

      if (!audioUrl && !sound) throw new Error("Audio file is required");

      const row = {
        name,
        description: description || null,
        category_id: categoryId || null,
        tags,
        is_featured: isFeatured,
        is_premium: isPremium,
        audio_url: audioUrl,
        icon_url: iconUrl || null,
      };

      if (sound) {
        const { error } = await supabase.from("vibes_sounds").update(row).eq("id", sound.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("vibes_sounds").insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vibes-sounds"] });
      toast.success(sound ? "Sound updated" : "Sound added");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{sound ? "Edit Sound" : "Add Sound"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rain" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" rows={2} />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {categories.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {TAG_OPTIONS.map((tag) => (
                <Badge
                  key={tag}
                  variant={tags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleTag(tag)}
                >
                  {tag} {tags.includes(tag) && <X className="h-3 w-3 ml-1" />}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <Label>Audio File {!sound && "*"}</Label>
            <input ref={audioRef} type="file" accept="audio/*" className="hidden" onChange={(e) => setAudioFile(e.target.files?.[0] || null)} />
            <Button variant="outline" className="w-full mt-1" onClick={() => audioRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" /> {audioFile?.name || (sound ? "Replace audio" : "Choose audio file")}
            </Button>
          </div>
          <div>
            <Label>Icon Image</Label>
            <input ref={iconRef} type="file" accept="image/*" className="hidden" onChange={(e) => setIconFile(e.target.files?.[0] || null)} />
            <Button variant="outline" className="w-full mt-1" onClick={() => iconRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" /> {iconFile?.name || (sound?.icon_url ? "Replace icon" : "Choose icon")}
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <Label>Featured on Home</Label>
            <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Premium (future)</Label>
            <Switch checked={isPremium} onCheckedChange={setIsPremium} />
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
