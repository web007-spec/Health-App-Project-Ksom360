import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useMemo, useRef, useState } from "react";
import { Swords, Plus, Trash2, Save, Loader2 } from "lucide-react";

interface ClientSportProfileEditorProps {
  clientId: string;
  trainerId: string;
}

const SPORTS = [
  { value: "softball", label: "Softball 🥎" },
  { value: "basketball", label: "Basketball 🏀" },
];

const SPORT_LABELS: Record<string, string> = {
  softball: "Softball",
  basketball: "Basketball",
  baseball: "Baseball",
};

const BASEBALL_POSITIONS = ["Pitcher", "Catcher", "1st Base", "2nd Base", "3rd Base", "Shortstop", "Left Field", "Center Field", "Right Field", "Designated Hitter", "Utility"];
const BASKETBALL_POSITIONS = ["Point Guard", "Shooting Guard", "Small Forward", "Power Forward", "Center", "Guard", "Forward", "Utility"];

type SeasonStatus = "in_season" | "off_season";
type EditableProfile = {
  id: string;
  sport: string;
  position: string | null;
  jersey_number: string | null;
  team_name: string | null;
  bats: string | null;
  throws: string | null;
  season_override: string | null;
  season_status?: string | null;
  client_id: string;
  trainer_id: string;
};

function resolveSeasonStatus(profile: EditableProfile): SeasonStatus {
  if (profile.season_override === "in_season" || profile.season_override === "off_season") {
    return profile.season_override;
  }
  return profile.season_status === "in_season" ? "in_season" : "off_season";
}

function normalizeForSave(profile: EditableProfile) {
  const seasonOverride = profile.season_override === "in_season" || profile.season_override === "off_season"
    ? profile.season_override
    : null;

  return {
    sport: profile.sport,
    position: profile.position || null,
    jersey_number: profile.jersey_number || null,
    team_name: profile.team_name || null,
    bats: profile.bats || null,
    throws: profile.throws || null,
    season_override: seasonOverride,
    season_status: seasonOverride ?? "off_season",
  };
}

function snapshotProfile(profile: EditableProfile) {
  return JSON.stringify(normalizeForSave(profile));
}

function getSaveErrorMessage(error: any) {
  const message = error?.message || "";
  if (message.includes("client_sport_profiles_client_id_trainer_id_sport_key")) {
    return "This sport already exists for this client.";
  }
  if (message.includes("client_sport_profiles_client_id_trainer_id_key")) {
    return "This sport profile conflicted with an older rule. Please try again.";
  }
  return "Please try again.";
}

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
      return (data || []) as EditableProfile[];
    },
  });

  const [editProfiles, setEditProfiles] = useState<EditableProfile[]>([]);
  const [savedSnapshots, setSavedSnapshots] = useState<Record<string, string>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [blockedAutosaveIds, setBlockedAutosaveIds] = useState<Set<string>>(new Set());
  const [newSport, setNewSport] = useState("");
  const hasInitializedAutosave = useRef(false);

  useEffect(() => {
    const loaded = (profiles || []).map((p) => ({ ...p }));
    setEditProfiles(loaded);

    const nextSnapshots: Record<string, string> = {};
    loaded.forEach((p) => {
      nextSnapshots[p.id] = snapshotProfile(p);
    });
    setSavedSnapshots(nextSnapshots);
    setBlockedAutosaveIds(new Set());
    hasInitializedAutosave.current = false;
  }, [profiles]);

  const isDirty = (profile: EditableProfile) => {
    const saved = savedSnapshots[profile.id];
    if (!saved) return true;
    return saved !== snapshotProfile(profile);
  };

  const dirtyProfiles = useMemo(
    () => editProfiles.filter((profile) => isDirty(profile)),
    [editProfiles, savedSnapshots],
  );

  const saveMutation = useMutation({
    mutationFn: async ({ profile }: { profile: EditableProfile }) => {
      const payload = normalizeForSave(profile);

      if (profile.id && !profile.id.startsWith("new-")) {
        const { error } = await supabase
          .from("client_sport_profiles")
          .update(payload)
          .eq("id", profile.id);
        if (error) throw error;

        return {
          savedId: profile.id,
          tempId: null as string | null,
          snapshot: snapshotProfile(profile),
        };
      }

      const { data, error } = await supabase
        .from("client_sport_profiles")
        .insert({ ...payload, client_id: clientId, trainer_id: trainerId })
        .select("*")
        .single();

      if (error) throw error;

      return {
        savedId: data.id,
        tempId: profile.id,
        snapshot: snapshotProfile({ ...profile, id: data.id }),
      };
    },
    onSuccess: ({ savedId, tempId, snapshot }) => {
      if (tempId) {
        setEditProfiles((prev) => prev.map((p) => (p.id === tempId ? { ...p, id: savedId } : p)));
      }

      setSavedSnapshots((prev) => {
        const next = { ...prev };
        if (tempId) delete next[tempId];
        next[savedId] = snapshot;
        return next;
      });

      setSavingIds((prev) => {
        const next = new Set(prev);
        if (tempId) next.delete(tempId);
        next.delete(savedId);
        return next;
      });

      setBlockedAutosaveIds((prev) => {
        const next = new Set(prev);
        if (tempId) next.delete(tempId);
        next.delete(savedId);
        return next;
      });

      queryClient.invalidateQueries({ queryKey: ["client-sport-profiles", clientId] });
      queryClient.invalidateQueries({ queryKey: ["sport-profile", clientId] });
    },
    onError: (error, variables) => {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(variables.profile.id);
        return next;
      });

      setBlockedAutosaveIds((prev) => {
        const next = new Set(prev);
        next.add(variables.profile.id);
        return next;
      });

      toast({
        title: "Could not save this sport profile",
        description: getSaveErrorMessage(error),
        variant: "destructive",
      });
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
    onSuccess: (_data, id) => {
      setEditProfiles((prev) => prev.filter((p) => p.id !== id));
      setSavedSnapshots((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setBlockedAutosaveIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["client-sport-profiles", clientId] });
      queryClient.invalidateQueries({ queryKey: ["sport-profile", clientId] });
      toast({ title: "Sport profile removed" });
    },
  });

  useEffect(() => {
    if (!hasInitializedAutosave.current) {
      hasInitializedAutosave.current = true;
      return;
    }

    if (dirtyProfiles.length === 0) return;

    const timer = setTimeout(() => {
      dirtyProfiles.forEach((profile) => {
        if (savingIds.has(profile.id) || blockedAutosaveIds.has(profile.id)) return;

        setSavingIds((prev) => new Set(prev).add(profile.id));
        saveMutation.mutate({ profile });
      });
    }, 900);

    return () => clearTimeout(timer);
  }, [blockedAutosaveIds, dirtyProfiles, saveMutation, savingIds]);

  const addSport = () => {
    if (!newSport) return;

    const exists = editProfiles.some((p) => p.sport === newSport);
    if (exists) {
      toast({ title: "Already added", variant: "destructive" });
      return;
    }

    setEditProfiles((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        sport: newSport,
        position: "",
        jersey_number: "",
        team_name: "",
        bats: "",
        throws: "",
        season_status: "off_season",
        season_override: null,
        client_id: clientId,
        trainer_id: trainerId,
      },
    ]);

    setNewSport("");
  };

  const updateField = (profileId: string, field: keyof EditableProfile, value: string) => {
    setEditProfiles((prev) => prev.map((p) => (p.id === profileId ? { ...p, [field]: value } : p)));
    setBlockedAutosaveIds((prev) => {
      if (!prev.has(profileId)) return prev;
      const next = new Set(prev);
      next.delete(profileId);
      return next;
    });
  };

  const saveProfile = async (profile: EditableProfile) => {
    setBlockedAutosaveIds((prev) => {
      const next = new Set(prev);
      next.delete(profile.id);
      return next;
    });
    setSavingIds((prev) => new Set(prev).add(profile.id));
    await saveMutation.mutateAsync({ profile });
    toast({ title: `${SPORT_LABELS[profile.sport] || "Sport"} profile saved` });
  };

  const saveAllChanges = async () => {
    const pending = editProfiles.filter((profile) => isDirty(profile));
    if (!pending.length) return;

    for (const profile of pending) {
      setBlockedAutosaveIds((prev) => {
        const next = new Set(prev);
        next.delete(profile.id);
        return next;
      });
      setSavingIds((prev) => new Set(prev).add(profile.id));
      await saveMutation.mutateAsync({ profile });
    }

    toast({ title: "All sport profile changes saved" });
  };

  const getPositions = (sport: string) => (sport === "basketball" ? BASKETBALL_POSITIONS : BASEBALL_POSITIONS);

  const inSeasonProfiles = editProfiles.filter((profile) => resolveSeasonStatus(profile) === "in_season");
  const outOfSeasonProfiles = editProfiles.filter((profile) => resolveSeasonStatus(profile) === "off_season");

  if (isLoading) return null;

  const renderProfileCard = (profile: EditableProfile) => {
    const profileIsSaving = savingIds.has(profile.id);
    const profileIsDirty = isDirty(profile);

    return (
      <div key={profile.id} className="rounded-lg border p-4 space-y-4 bg-card">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="secondary" className="text-sm">
            {profile.sport === "basketball" ? "🏀 Basketball" : "🥎 Softball"}
          </Badge>
          <div className="flex items-center gap-2">
            <Badge variant={profileIsDirty ? "outline" : "secondary"} className="text-[10px] uppercase tracking-wider">
              {profileIsSaving ? "Saving" : profileIsDirty ? "Unsaved" : "Saved"}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => {
                if (profile.id.startsWith("new-")) {
                  setEditProfiles((prev) => prev.filter((p) => p.id !== profile.id));
                  return;
                }

                deleteMutation.mutate(profile.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Position</Label>
            <Select value={profile.position || ""} onValueChange={(v) => updateField(profile.id, "position", v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {getPositions(profile.sport).map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Jersey #</Label>
            <Input value={profile.jersey_number || ""} onChange={(e) => updateField(profile.id, "jersey_number", e.target.value)} placeholder="#" className="mt-1" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Team Name</Label>
            <Input value={profile.team_name || ""} onChange={(e) => updateField(profile.id, "team_name", e.target.value)} placeholder="Team name" className="mt-1" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Season Status</Label>
            <Select
              value={profile.season_override || "auto"}
              onValueChange={(v) => updateField(profile.id, "season_override", v === "auto" ? "" : v)}
            >
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
                <Select value={profile.bats || ""} onValueChange={(v) => updateField(profile.id, "bats", v)}>
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
                <Select value={profile.throws || ""} onValueChange={(v) => updateField(profile.id, "throws", v)}>
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

        <Button
          size="sm"
          className="w-full gap-2"
          onClick={() => saveProfile(profile)}
          disabled={profileIsSaving || !profileIsDirty}
        >
          {profileIsSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save {SPORT_LABELS[profile.sport] || "Sport"} Profile
        </Button>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Swords className="h-5 w-5 text-primary" />
              Sport Profiles
            </CardTitle>
            <CardDescription>Changes auto-save as you edit, and you can save all pending updates anytime.</CardDescription>
          </div>
          {dirtyProfiles.length > 0 && (
            <Button size="sm" className="gap-2 shrink-0" onClick={saveAllChanges}>
              <Save className="h-4 w-4" />
              Save All ({dirtyProfiles.length})
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">In Season Program</h4>
            <Badge variant="default" className="text-[10px] uppercase tracking-wider">{inSeasonProfiles.length} Sports</Badge>
          </div>
          {inSeasonProfiles.length ? (
            <div className="space-y-4">{inSeasonProfiles.map(renderProfileCard)}</div>
          ) : (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No sports marked in season yet.</div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Out of Season Program</h4>
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">{outOfSeasonProfiles.length} Sports</Badge>
          </div>
          {outOfSeasonProfiles.length ? (
            <div className="space-y-4">{outOfSeasonProfiles.map(renderProfileCard)}</div>
          ) : (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No out-of-season sports yet.</div>
          )}
        </section>

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label className="text-xs">Add a Sport</Label>
            <Select value={newSport} onValueChange={setNewSport}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Choose sport..." /></SelectTrigger>
              <SelectContent>
                {SPORTS.filter((s) => !editProfiles.some((p) => p.sport === s.value)).map((s) => (
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
