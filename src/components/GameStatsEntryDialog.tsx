import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Swords } from "lucide-react";

interface GameStatsEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: any;
  clientId: string;
}

const BASEBALL_FIELDS = [
  { key: "at_bats", label: "At Bats", abbr: "AB" },
  { key: "hits", label: "Hits", abbr: "H" },
  { key: "singles", label: "Singles", abbr: "1B" },
  { key: "doubles", label: "Doubles", abbr: "2B" },
  { key: "triples", label: "Triples", abbr: "3B" },
  { key: "home_runs", label: "Home Runs", abbr: "HR" },
  { key: "runs", label: "Runs", abbr: "R" },
  { key: "rbis", label: "RBIs", abbr: "RBI" },
  { key: "walks", label: "Walks", abbr: "BB" },
  { key: "strikeouts", label: "Strikeouts", abbr: "K" },
  { key: "stolen_bases", label: "Stolen Bases", abbr: "SB" },
  { key: "errors", label: "Errors", abbr: "E" },
] as const;

const BASKETBALL_FIELDS = [
  { key: "points", label: "Points", abbr: "PTS" },
  { key: "rebounds", label: "Rebounds", abbr: "REB" },
  { key: "assists", label: "Assists", abbr: "AST" },
  { key: "steals", label: "Steals", abbr: "STL" },
  { key: "blocks", label: "Blocks", abbr: "BLK" },
  { key: "turnovers", label: "Turnovers", abbr: "TO" },
  { key: "fouls", label: "Fouls", abbr: "PF" },
  { key: "minutes_played", label: "Minutes", abbr: "MIN" },
  { key: "fg_made", label: "FG Made", abbr: "FGM" },
  { key: "fg_attempted", label: "FG Att", abbr: "FGA" },
  { key: "three_pt_made", label: "3PT Made", abbr: "3PM" },
  { key: "three_pt_attempted", label: "3PT Att", abbr: "3PA" },
  { key: "ft_made", label: "FT Made", abbr: "FTM" },
  { key: "ft_attempted", label: "FT Att", abbr: "FTA" },
] as const;

export function GameStatsEntryDialog({ open, onOpenChange, event, clientId }: GameStatsEntryDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [stats, setStats] = useState<Record<string, number>>({});
  const [result, setResult] = useState<string>("");
  const [opponent, setOpponent] = useState(event?.title || "");
  const [notes, setNotes] = useState("");
  const [sport, setSport] = useState<string>("");

  // Fetch sport profiles to determine which sports to show
  const { data: sportProfiles } = useQuery({
    queryKey: ["client-sport-profiles-dialog", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_sport_profiles")
        .select("sport")
        .eq("client_id", clientId);
      if (error) throw error;
      return data;
    },
    enabled: open && !!clientId,
  });

  const availableSports = sportProfiles?.map(p => p.sport) || ["baseball"];
  const activeSport = sport || availableSports[0] || "baseball";
  const fields = activeSport === "basketball" ? BASKETBALL_FIELDS : BASEBALL_FIELDS;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const gameDate = event?.start_time?.split("T")[0] || new Date().toISOString().split("T")[0];
      const payload: any = {
        client_id: clientId,
        sport_event_id: event?.id || null,
        game_date: gameDate,
        opponent: opponent || null,
        result: result || null,
        notes: notes || null,
        sport: activeSport,
      };
      fields.forEach(f => { payload[f.key] = stats[f.key] || 0; });
      const { error } = await supabase
        .from("game_stat_entries" as any)
        .insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["game-stat-entries"] });
      toast({ title: `Game stats saved! ${activeSport === "basketball" ? "🏀" : "⚾"}` });
      setStats({});
      setResult("");
      setOpponent("");
      setNotes("");
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Failed to save stats", variant: "destructive" });
    },
  });

  const updateStat = (key: string, value: string) => {
    const num = parseInt(value) || 0;
    setStats(prev => ({ ...prev, [key]: num }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Swords className="h-5 w-5 text-rose-500" />
            Log Game Stats
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Sport selector if multiple sports */}
          {availableSports.length > 1 && (
            <Tabs value={activeSport} onValueChange={v => { setSport(v); setStats({}); }}>
              <TabsList className="w-full">
                {availableSports.includes("baseball") && <TabsTrigger value="baseball" className="flex-1">⚾ Baseball</TabsTrigger>}
                {availableSports.includes("basketball") && <TabsTrigger value="basketball" className="flex-1">🏀 Basketball</TabsTrigger>}
              </TabsList>
            </Tabs>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Opponent</Label>
              <Input value={opponent} onChange={e => setOpponent(e.target.value)} placeholder="vs Team" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Result</Label>
              <Select value={result} onValueChange={setResult}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Pick..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="win">Win 🏆</SelectItem>
                  <SelectItem value="loss">Loss</SelectItem>
                  <SelectItem value="tie">Tie</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              {activeSport === "basketball" ? "Game Stats" : "Batting Stats"}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {fields.map(field => (
                <div key={field.key}>
                  <Label className="text-[10px] text-muted-foreground">{field.abbr}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={stats[field.key] || ""}
                    onChange={e => updateStat(field.key, e.target.value)}
                    placeholder="0"
                    className="h-9 text-center"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="How did you feel? Any highlights?" rows={2} className="mt-1 resize-none" />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Skip</Button>
            <Button className="flex-1" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save Stats"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
