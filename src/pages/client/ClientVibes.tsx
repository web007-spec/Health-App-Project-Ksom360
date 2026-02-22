import { useEffect, useState, useCallback } from "react";
import { ClientLayout } from "@/components/ClientLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAudioMixer } from "@/hooks/useAudioMixer";
import { VibesHomeTab } from "@/components/vibes/VibesHomeTab";
import { VibesSoundsTab } from "@/components/vibes/VibesSoundsTab";
import { VibesMixesTab } from "@/components/vibes/VibesMixesTab";
import { VibesMyMixesTab } from "@/components/vibes/VibesMyMixesTab";
import { VibesSleepTab } from "@/components/vibes/VibesSleepTab";
import { VibesMiniPlayer } from "@/components/vibes/VibesMiniPlayer";
import { RestoreEntryScreen, RestoreSection } from "@/components/vibes/RestoreEntryScreen";
import { RestoreGuidedTab } from "@/components/vibes/RestoreGuidedTab";
import { RestoreSleepTab } from "@/components/vibes/RestoreSleepTab";
import { useSearchParams } from "react-router-dom";

export default function ClientVibes() {
  const mixer = useAudioMixer();
  const [searchParams] = useSearchParams();
  const [mixRefreshKey, setMixRefreshKey] = useState(0);
  const [section, setSection] = useState<RestoreSection>("home");

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
      setSection("soundlab");
    })();
  }, [searchParams]);

  const handleMixSaved = useCallback(() => {
    setMixRefreshKey((k) => k + 1);
  }, []);

  return (
    <ClientLayout>
      <div className="min-h-screen bg-[hsl(260,20%,5%)] pb-40">
        <div className="p-4 space-y-4">
          {/* Restore entry screen — always visible */}
          <RestoreEntryScreen activeSection={section} onSectionChange={setSection} />

          {/* Section content */}
          {section === "home" && (
            <VibesHomeTab sounds={sounds} mixer={mixer} />
          )}

          {section === "guided" && (
            <RestoreGuidedTab />
          )}

          {section === "sleep" && (
            <RestoreSleepTab sounds={sounds} mixer={mixer} />
          )}

          {section === "soundlab" && (
            <Tabs defaultValue="home">
              <TabsList className="w-full grid grid-cols-5">
                <TabsTrigger value="home">Home</TabsTrigger>
                <TabsTrigger value="sounds">Sounds</TabsTrigger>
                <TabsTrigger value="my-mixes">My Mixes</TabsTrigger>
                <TabsTrigger value="mixes">Mixes</TabsTrigger>
                <TabsTrigger value="sleep">Sleep</TabsTrigger>
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
              <TabsContent value="sleep">
                <VibesSleepTab sounds={sounds} mixer={mixer} />
              </TabsContent>
            </Tabs>
          )}
        </div>

        <VibesMiniPlayer mixer={mixer} onMixSaved={handleMixSaved} />
      </div>
    </ClientLayout>
  );
}
