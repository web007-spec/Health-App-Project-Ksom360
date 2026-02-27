import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, ChevronRight, Lock, ShieldCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORY_CONFIG, getDifficultyLabel, getDurationLabel } from "@/lib/fastingCategoryConfig";
import { usePlanGating } from "@/hooks/usePlanGating";
import type { PlanGatingMetadata } from "@/lib/planGating";
import { useState } from "react";
import { PlanLockedDialog } from "@/components/PlanLockedDialog";

interface FastingProtocol {
  id: string;
  name: string;
  category: string;
  description: string | null;
  duration_days: number;
  fast_target_hours: number;
  difficulty_level: string;
  engine_allowed: string[];
  min_level_required: number;
  max_level_allowed: number | null;
  plan_type: string;
  intensity_tier: string;
  is_extended_fast: boolean;
  is_youth_safe: boolean;
}

const FEATURED_NAMES = ["14-Day Weight Kickstart", "21-Day Deep Focus", "21-Day Rhythm Restore"];

export function ProgramsSelector({ navigate }: { navigate: (path: string) => void }) {
  const { evaluatePlan, isReady } = usePlanGating();
  const [lockedMessage, setLockedMessage] = useState<string | null>(null);

  const { data: protocols } = useQuery({
    queryKey: ["fasting-protocols-featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fasting_protocols")
        .select("*")
        .in("name", FEATURED_NAMES);
      if (error) throw error;
      return (data as any[]).map((d) => ({
        ...d,
        difficulty_level: d.difficulty_level || "beginner",
      })) as FastingProtocol[];
    },
  });

  const sorted = FEATURED_NAMES.map((n) => protocols?.find((p) => p.name === n)).filter(Boolean) as FastingProtocol[];

  function getGating(protocol: FastingProtocol) {
    if (!isReady) return null;
    const meta: PlanGatingMetadata = {
      id: protocol.id,
      name: protocol.name,
      engine_allowed: protocol.engine_allowed || ["metabolic", "performance"],
      min_level_required: protocol.min_level_required || 1,
      max_level_allowed: protocol.max_level_allowed,
      plan_type: (protocol.plan_type as any) || "fasting",
      intensity_tier: (protocol.intensity_tier as any) || "low",
      is_extended_fast: protocol.is_extended_fast || false,
      is_youth_safe: protocol.is_youth_safe || false,
    };
    return evaluatePlan(meta);
  }

  // Filter out invisible protocols
  const visibleProtocols = sorted.filter((p) => {
    const g = getGating(p);
    return g === null || g.isVisible;
  });

  function handleClick(protocol: FastingProtocol) {
    const g = getGating(protocol);
    if (g && !g.isAccessible) {
      setLockedMessage(g.lockMessage || "This program is currently locked.");
      return;
    }
    navigate(`/client/protocol/${protocol.id}`);
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-blue-400" />
            <h2 className="text-xl font-bold">Programs</h2>
          </div>
          <button
            className="text-sm font-semibold text-blue-400 flex items-center gap-1"
            onClick={() => navigate("/client/programs")}
          >
            View All <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {visibleProtocols.map((protocol) => {
          const config = CATEGORY_CONFIG[protocol.category];
          const Icon = config?.icon || CalendarDays;
          const gating = getGating(protocol);
          const isLocked = gating && !gating.isAccessible;
          const isCoachApproved = gating?.isCoachApproved;

          return (
            <Card
              key={protocol.id}
              className={`cursor-pointer border-l-4 ${config?.borderColor || "border-l-blue-500"} transition-colors ${
                isLocked ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/30"
              }`}
              onClick={() => handleClick(protocol)}
            >
              <CardContent className="px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full ${config?.bgColor || "bg-blue-500/20"} flex items-center justify-center shrink-0`}>
                    <Icon className={`h-5 w-5 ${config?.color || "text-blue-400"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold text-base">{protocol.name}</h3>
                      {isLocked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                      {isCoachApproved && <ShieldCheck className="h-3.5 w-3.5 text-primary" />}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getDurationLabel(protocol.duration_days)}
                    </p>
                    {isLocked && gating?.lockMessage && (
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">{gating.lockMessage}</p>
                    )}
                    {isCoachApproved && (
                      <Badge variant="outline" className="text-[10px] border-primary/30 text-primary mt-0.5">
                        Coach Approved
                      </Badge>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0 capitalize">
                    {getDifficultyLabel(protocol.difficulty_level)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <PlanLockedDialog
        open={!!lockedMessage}
        onOpenChange={(open) => !open && setLockedMessage(null)}
        lockMessage={lockedMessage || ""}
        onViewRecommended={() => {
          setLockedMessage(null);
          navigate("/client/choose-protocol");
        }}
      />
    </>
  );
}
