import { useEffect, useState, useCallback } from "react";
import { ClientLayout } from "@/components/ClientLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAudioMixer } from "@/hooks/useAudioMixer";
import { preloadAudioUrls } from "@/lib/vibesMixer";
import { VibesHomeTab } from "@/components/vibes/VibesHomeTab";
import { VibesSoundsTab } from "@/components/vibes/VibesSoundsTab";
import { VibesMixesTab } from "@/components/vibes/VibesMixesTab";
import { VibesMyMixesTab } from "@/components/vibes/VibesMyMixesTab";
import { VibesSleepTab } from "@/components/vibes/VibesSleepTab";
import { VibesMiniPlayer } from "@/components/vibes/VibesMiniPlayer";
import { RestoreStateHeader } from "@/components/vibes/RestoreEntryScreen";
import { RestoreQuickStart } from "@/components/vibes/RestoreQuickStart";
import { RestoreModuleGrid, type RestoreModule } from "@/components/vibes/RestoreModuleGrid";
import { RestoreBreathingTab } from "@/components/vibes/RestoreBreathingTab";
import { RestoreSleepTab } from "@/components/vibes/RestoreSleepTab";

import { BreathingPlayer } from "@/components/vibes/BreathingPlayer";
import { type BreathingExercise } from "@/lib/breathingExercises";
import { useSearchParams, Navigate } from "react-router-dom";
import { useClientFeatureSettings } from "@/hooks/useClientFeatureSettings";
import { ArrowLeft } from "lucide-react";

type ViewState =
  | { type: "home" }
  | { type: "module"; module: RestoreModule }
  | { type: "breathing-session"; exercise: BreathingExercise }
  | { type: "soundlab" };

export default function ClientVibes() {
  const { settings, isLoading: settingsLoading } = useClientFeatureSettings();
  const mixer = useAudioMixer();
  const [searchParams] = useSearchParams();
  const [mixRefreshKey, setMixRefreshKey] = useState(0);
  const [view, setView] = useState<ViewState>({ type: "home" });

  const { data: sounds = [] } = useQuery({
    queryKey: ["vibes-sounds-client"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vibes_sounds")
        .select("*, vibes_categories(name, slug)")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (sounds.length > 0) {
      const urls = sounds.map((s: any) => s.audio_url).filter(Boolean);
      preloadAudioUrls(urls);
    }
  }, [sounds]);

  const { data: categories = [] } = useQuery({
    queryKey: ["vibes-categories-client"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vibes_categories").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    mixer.restoreFromStorage();
  }, []);

  useEffect(() => {
    const slug = searchParams.get("mix");
    if (!slug) return;
    (async () => {
      const { data: mix } = await supabase
        .from("vibes_mixes")
        .select("id")
        .eq("share_slug", slug)
        .single();
      if (!mix) return;
      const { data: items } = await supabase
        .from("vibes_mix_items")
        .select("sound_id, volume, vibes_sounds(name, audio_url, icon_url)")
        .eq("mix_id", mix.id);
      if (!items) return;
      const loaded = items.map((it: any) => ({
        soundId: it.sound_id,
        name: it.vibes_sounds?.name || "Sound",
        url: it.vibes_sounds?.audio_url || "",
        volume: it.volume,
        iconUrl: it.vibes_sounds?.icon_url,
      }));
      mixer.loadMix(loaded);
      setView({ type: "soundlab" });
    })();
  }, [searchParams]);

  const handleMixSaved = useCallback(() => {
    setMixRefreshKey((k) => k + 1);
  }, []);

  if (settingsLoading) {
    return (
      <ClientLayout>
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </ClientLayout>
    );
  }

  if (!settings.restore_enabled) {
    return <Navigate to="/client/dashboard" replace />;
  }

  // Breathing session — full screen
  if (view.type === "breathing-session") {
    return (
      <BreathingPlayer
        exercise={view.exercise}
        onBack={() => setView({ type: "module", module: "breathing" })}
      />
    );
  }

  return (
    <ClientLayout>
      <div className="min-h-screen bg-[hsl(220,20%,5%)] pb-40">
        <div className="p-4 space-y-6">
          {/* Back button when in a module */}
          {view.type !== "home" && (
            <button
              onClick={() => setView({ type: "home" })}
              className="flex items-center gap-1.5 text-white/40 hover:text-white/60 text-xs font-medium transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          )}

          {/* State Header — always visible */}
          <RestoreStateHeader />

          {/* HOME VIEW */}
          {view.type === "home" && (
            <div className="space-y-8">
              <RestoreQuickStart
                onStartBreathing={(ex) =>
                  setView({ type: "breathing-session", exercise: ex })
                }
                onNavigateGuided={() =>
                  setView({ type: "module", module: "breathing" })
                }
              />
              <RestoreModuleGrid
                onModuleSelect={(mod) =>
                  mod === "soundlab"
                    ? setView({ type: "soundlab" })
                    : setView({ type: "module", module: mod })
                }
              />
            </div>
          )}

          {/* BREATHING MODULE */}
          {view.type === "module" && view.module === "breathing" && (
            <RestoreBreathingTab
              onStartSession={(ex) =>
                setView({ type: "breathing-session", exercise: ex })
              }
            />
          )}

          {/* SLEEP MODULE */}
          {view.type === "module" && view.module === "sleep" && (
            <RestoreSleepTab sounds={sounds} mixer={mixer} />
          )}

          {/* SOUND LAB MODULE */}
          {view.type === "soundlab" && (
            <div className="space-y-4">
              <Tabs defaultValue="home">
                <TabsList className="w-full grid grid-cols-4 bg-white/[0.06] border border-white/[0.06]">
                  <TabsTrigger value="home" className="text-white/50 data-[state=active]:text-white/90 data-[state=active]:bg-white/[0.08]">Home</TabsTrigger>
                  <TabsTrigger value="sounds" className="text-white/50 data-[state=active]:text-white/90 data-[state=active]:bg-white/[0.08]">Sounds</TabsTrigger>
                  <TabsTrigger value="my-mixes" className="text-white/50 data-[state=active]:text-white/90 data-[state=active]:bg-white/[0.08]">My Mixes</TabsTrigger>
                  <TabsTrigger value="mixes" className="text-white/50 data-[state=active]:text-white/90 data-[state=active]:bg-white/[0.08]">Mixes</TabsTrigger>
                </TabsList>

                <TabsContent value="home">
                  <VibesHomeTab sounds={sounds} mixer={mixer} />
                </TabsContent>
                <TabsContent value="sounds">
                  <VibesSoundsTab sounds={sounds} categories={categories} mixer={mixer} />
                </TabsContent>
                <TabsContent value="my-mixes">
                  <VibesMyMixesTab mixer={mixer} sounds={sounds} refreshKey={mixRefreshKey} />
                </TabsContent>
                <TabsContent value="mixes">
                  <VibesMixesTab mixer={mixer} />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>

        <VibesMiniPlayer mixer={mixer} onMixSaved={handleMixSaved} />
      </div>
    </ClientLayout>
  );
}
