import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Swords, Plus, Trash2, Save } from "lucide-react";

interface ClientSportProfileEditorProps {
  clientId: string;
  trainerId: string;
}

const SPORTS = [
  { value: "softball", label: "Softball 🥎" },
  { value: "basketball", label: "Basketball 🏀" },
];

const BASEBALL_POSITIONS = ["Pitcher", "Catcher", "1st Base", "2nd Base", "3rd Base", "Shortstop", "Left Field", "Center Field", "Right Field", "Designated Hitter", "Utility"];
const BASKETBALL_POSITIONS = ["Point Guard", "Shooting Guard", "Small Forward", "Power Forward", "Center", "Guard", "Forward", "Utility"];

export function ClientSportProfileEditor({ clientId, trainerId }: ClientSportProfileEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["client-sport-profiles", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_sport_profiles")
        .select("*")
        .eq("client_id", clientId);
      if (error) throw error;
      return data;
    },
  });

  const [editProfiles, setEditProfiles] = useState<any[]>([]);
  const [newSport, setNewSport] = useState("");

  useEffect(() => {
    if (profiles) setEditProfiles(profiles.map(p => ({ ...p })));
  }, [profiles]);

  const saveMutation = useMutation({
    mutationFn: async (profile: any) => {
      const { id, created_at, updated_at, ...rest } = profile;
      if (id && !id.startsWith("new-")) {
        const { error } = await supabase
          .from("client_sport_profiles")
          .update(rest)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("client_sport_profiles")
          .insert({ ...rest, client_id: clientId, trainer_id: trainerId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-sport-profiles", clientId] });
      queryClient.invalidateQueries({ queryKey: ["sport-profile", clientId] });
      toast({ title: "Sport profile saved! 🎉" });
    },
    onError: () => {
      toast({ title: "Failed to save", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("client_sport_profiles")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-sport-profiles", clientId] });
      queryClient.invalidateQueries({ queryKey: ["sport-profile", clientId] });
      toast({ title: "Sport profile removed" });
    },
  });

  const addSport = () => {
    if (!newSport) return;
    const exists = editProfiles.some(p => p.sport === newSport);
    if (exists) {
      toast({ title: "Already added", variant: "destructive" });
      return;
    }
    setEditProfiles(prev => [...prev, {
      id: `new-${Date.now()}`,
      sport: newSport,
      position: "",
      jersey_number: "",
      team_name: "",
      bats: "",
      throws: "",
      season_status: "auto",
      season_override: null,
      client_id: clientId,
      trainer_id: trainerId,
    }]);
    setNewSport("");
  };

  const updateField = (index: number, field: string, value: string) => {
    setEditProfiles(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const getPositions = (sport: string) => sport === "basketball" ? BASKETBALL_POSITIONS : BASEBALL_POSITIONS;

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Swords className="h-5 w-5 text-rose-500" />
          Sport Profiles
        </CardTitle>
        <CardDescription>Set up sport-specific details for this athlete.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {editProfiles.map((profile, index) => (
          <div key={profile.id} className="rounded-lg border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="text-sm">
                {profile.sport === "basketball" ? "🏀 Basketball" : "🥎 Softball"}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => {
                  if (profile.id.startsWith("new-")) {
                    setEditProfiles(prev => prev.filter((_, i) => i !== index));
                  } else {
                    deleteMutation.mutate(profile.id);
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Position</Label>
                <Select value={profile.position || ""} onValueChange={v => updateField(index, "position", v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {getPositions(profile.sport).map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Jersey #</Label>
                <Input value={profile.jersey_number || ""} onChange={e => updateField(index, "jersey_number", e.target.value)} placeholder="#" className="mt-1" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Team Name</Label>
                <Input value={profile.team_name || ""} onChange={e => updateField(index, "team_name", e.target.value)} placeholder="Team name" className="mt-1" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Season Status</Label>
                <Select value={profile.season_override || "auto"} onValueChange={v => updateField(index, "season_override", v === "auto" ? "" : v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Auto-detect" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto-detect from schedule</SelectItem>
                    <SelectItem value="in_season">In Season</SelectItem>
                    <SelectItem value="off_season">Off Season</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(profile.sport === "softball" || profile.sport === "baseball") && (
                <>
                  <div>
                    <Label className="text-xs">Bats</Label>
                    <Select value={profile.bats || ""} onValueChange={v => updateField(index, "bats", v)}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Right">Right</SelectItem>
                        <SelectItem value="Left">Left</SelectItem>
                        <SelectItem value="Switch">Switch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Throws</Label>
                    <Select value={profile.throws || ""} onValueChange={v => updateField(index, "throws", v)}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Right">Right</SelectItem>
                        <SelectItem value="Left">Left</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>

            <Button size="sm" className="w-full gap-2" onClick={() => saveMutation.mutate(profile)} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4" />
              Save {profile.sport === "basketball" ? "Basketball" : "Baseball"} Profile
            </Button>
          </div>
        ))}

        {/* Add Sport */}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label className="text-xs">Add a Sport</Label>
            <Select value={newSport} onValueChange={setNewSport}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Choose sport..." /></SelectTrigger>
              <SelectContent>
                {SPORTS.filter(s => !editProfiles.some(p => p.sport === s.value)).map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={addSport} disabled={!newSport} size="icon" className="shrink-0">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
