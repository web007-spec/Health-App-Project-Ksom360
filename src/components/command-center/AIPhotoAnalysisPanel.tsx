import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Camera, Sparkles, Loader2, Copy, Check, RefreshCw, Upload } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AIPhotoAnalysisPanelProps {
  clientId: string;
  trainerId: string;
}

export function AIPhotoAnalysisPanel({ clientId, trainerId }: AIPhotoAnalysisPanelProps) {
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: contextData } = useQuery({
    queryKey: ["ai-photo-context", clientId],
    queryFn: async () => {
      const { data: settings } = await supabase
        .from("client_feature_settings")
        .select("engine_mode, current_level")
        .eq("client_id", clientId)
        .maybeSingle();
      return {
        engine_mode: settings?.engine_mode || "performance",
        current_level: settings?.current_level || 1,
        status: "moderate",
      };
    },
  });

  // Fetch recent progress photos (stored as JSON in `photos` column)
  const { data: progressPhotos } = useQuery({
    queryKey: ["progress-photos", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("progress_entries")
        .select("photos, entry_date")
        .eq("client_id", clientId)
        .not("photos", "is", null)
        .order("entry_date", { ascending: false })
        .limit(6);
      return data || [];
    },
  });

  const allPhotos = (progressPhotos || []).flatMap(entry => {
    const photos: { url: string; date: string; type: string }[] = [];
    const p = entry.photos as any;
    if (!p) return photos;
    if (typeof p === "string") {
      photos.push({ url: p, date: entry.entry_date, type: "Photo" });
    } else if (Array.isArray(p)) {
      p.forEach((url: string, i: number) => photos.push({ url, date: entry.entry_date, type: `Photo ${i + 1}` }));
    } else {
      if (p.front) photos.push({ url: p.front, date: entry.entry_date, type: "Front" });
      if (p.side) photos.push({ url: p.side, date: entry.entry_date, type: "Side" });
      if (p.back) photos.push({ url: p.back, date: entry.entry_date, type: "Back" });
    }
    return photos;
  });

  const togglePhoto = (url: string) => {
    setImageUrls(prev =>
      prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]
    );
  };

  const handleAnalyze = async () => {
    if (imageUrls.length === 0) {
      toast.error("Select at least one photo to analyze.");
      return;
    }
    setIsAnalyzing(true);
    setAnalysis("");
    try {
      const { data, error } = await supabase.functions.invoke("ai-progress-photo-analysis", {
        body: {
          image_urls: imageUrls,
          client_context: contextData,
          comparison_notes: notes || undefined,
        },
      });
      if (error) throw error;
      if (data?.analysis) {
        setAnalysis(data.analysis);
      } else if (data?.error) {
        toast.error(data.error);
      }
    } catch (err: any) {
      toast.error(err?.message || "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(analysis);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Camera className="h-4 w-4 text-primary" />
          AI Photo Analysis
          <Badge variant="outline" className="text-[10px]">Draft</Badge>
        </CardTitle>
        <CardDescription>Select progress photos to get AI-powered visual assessment.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {allPhotos.length > 0 ? (
          <>
            <Label className="text-xs">Select Photos to Analyze ({imageUrls.length} selected)</Label>
            <div className="grid grid-cols-4 gap-2">
              {allPhotos.slice(0, 8).map((photo, i) => (
                <button
                  key={i}
                  onClick={() => togglePhoto(photo.url)}
                  className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all ${
                    imageUrls.includes(photo.url)
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-muted-foreground/50"
                  }`}
                >
                  <img src={photo.url} alt={photo.type} className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 inset-x-0 bg-black/60 px-1 py-0.5">
                    <p className="text-[9px] text-white truncate">{photo.type} · {photo.date}</p>
                  </div>
                  {imageUrls.includes(photo.url) && (
                    <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-6 text-sm text-muted-foreground">
            <Camera className="h-8 w-8 mx-auto mb-2 opacity-30" />
            No progress photos available for this client.
          </div>
        )}

        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Coach notes for context (optional, e.g., 'Compare shoulder development')"
          className="text-sm"
          rows={2}
        />

        <Button
          className="w-full gap-1.5"
          onClick={handleAnalyze}
          disabled={isAnalyzing || imageUrls.length === 0}
        >
          {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Analyze {imageUrls.length > 1 ? `${imageUrls.length} Photos` : "Photo"}
        </Button>

        {analysis && (
          <>
            <Separator />
            <div className="space-y-3">
              <Badge variant="secondary" className="text-[10px]">Visual Assessment</Badge>
              <div className="text-sm text-foreground bg-muted/50 rounded-lg p-3 whitespace-pre-wrap leading-relaxed border border-border max-h-72 overflow-y-auto">
                {analysis}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-xs gap-1" onClick={handleCopy}>
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={handleAnalyze} disabled={isAnalyzing}>
                  <RefreshCw className="h-3 w-3" /> Re-analyze
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">⚠️ AI observations only — not a medical assessment.</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
