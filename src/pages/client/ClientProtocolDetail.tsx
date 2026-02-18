import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, CalendarDays, BarChart3, Utensils, Droplets, Users, TrendingUp, Lightbulb } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  CATEGORY_CONFIG,
  getDifficultyLabel,
} from "@/lib/fastingCategoryConfig";
import { PROTOCOL_DETAIL_COPY } from "@/lib/protocolDetailContent";

function generateWeeklyProgression(durationDays: number, fastTargetHours: number) {
  const weeks = Math.ceil(durationDays / 7);
  if (weeks <= 1 || durationDays === 0) return null;

  const startHours = Math.max(12, fastTargetHours - (weeks - 1));
  const progression = [];
  for (let w = 1; w <= weeks; w++) {
    const fh = Math.min(startHours + (w - 1), fastTargetHours);
    progression.push({ week: w, fastHours: fh, eatHours: 24 - fh });
  }
  return progression;
}

function getDailySchedule(fastHours: number) {
  const stopHour = 20;
  const breakHour = (stopHour + fastHours) % 24;
  const fmt = (h: number) => {
    const period = h >= 12 ? "PM" : "AM";
    const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${display}:00 ${period}`;
  };
  return { stopEating: fmt(stopHour), breakFast: fmt(breakHour) };
}

export default function ClientProtocolDetail() {
  const { id } = useParams<{ id: string }>();
  const clientId = useEffectiveClientId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: protocol, isLoading } = useQuery({
    queryKey: ["fasting-protocol", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fasting_protocols")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return {
        ...data,
        difficulty_level: (data as any).difficulty_level || "beginner",
      };
    },
    enabled: !!id,
  });

  const selectProtocolMutation = useMutation({
    mutationFn: async (protocolId: string) => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { error } = await supabase
        .from("client_feature_settings")
        .update({
          selected_protocol_id: protocolId,
          protocol_start_date: today,
        })
        .eq("client_id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings"] });
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings-fasting"] });
      toast.success("Protocol selected!");
      navigate("/client/dashboard");
    },
    onError: () => toast.error("Failed to select protocol"),
  });

  if (isLoading || !protocol) {
    return (
      <ClientLayout>
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </ClientLayout>
    );
  }

  const config = CATEGORY_CONFIG[protocol.category];
  const Icon = config?.icon;
  const customCopy = id ? PROTOCOL_DETAIL_COPY[id] : undefined;
  const autoProgression = generateWeeklyProgression(protocol.duration_days, protocol.fast_target_hours);
  const autoSchedule = getDailySchedule(protocol.fast_target_hours);
  const eatHours = 24 - protocol.fast_target_hours;

  return (
    <ClientLayout>
      <div className="pb-24 w-full">
        {/* Back button */}
        <div className="px-3 pt-4 pb-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/programs")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>

        {/* Header */}
        <div className="px-5 space-y-3">
          <div className="flex items-center gap-3">
            {config && (
              <div className={`h-14 w-14 rounded-full ${config.bgColor} flex items-center justify-center shrink-0`}>
                <Icon className={`h-7 w-7 ${config.color}`} />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold leading-tight">{protocol.name}</h1>
              <p className={`text-xs font-bold uppercase tracking-wider mt-1 ${config?.color || "text-muted-foreground"}`}>
                {protocol.category}
              </p>
            </div>
          </div>
          {protocol.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{protocol.description}</p>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 px-5 mt-6">
          <div className="rounded-xl bg-muted/50 p-3 text-center space-y-1">
            <Clock className="h-5 w-5 mx-auto text-blue-400" />
            <p className="text-xl font-bold">{customCopy?.statsLabel || `${protocol.fast_target_hours}h`}</p>
            <p className="text-[11px] text-muted-foreground leading-tight">Fasting Window</p>
          </div>
          <div className="rounded-xl bg-muted/50 p-3 text-center space-y-1">
            <CalendarDays className="h-5 w-5 mx-auto text-blue-400" />
            <p className="text-xl font-bold">
              {protocol.duration_days === 0 ? "∞" : `${protocol.duration_days}`}
            </p>
            <p className="text-[11px] text-muted-foreground leading-tight">
              {protocol.duration_days === 0 ? "Ongoing" : "Days"}
            </p>
          </div>
          <div className="rounded-xl bg-muted/50 p-3 text-center space-y-1">
            <BarChart3 className="h-5 w-5 mx-auto text-blue-400" />
            <p className="text-xl font-bold capitalize">
              {getDifficultyLabel(protocol.difficulty_level).slice(0, 5)}
            </p>
            <p className="text-[11px] text-muted-foreground leading-tight">Difficulty</p>
          </div>
        </div>

        <div className="px-5 mt-8 space-y-8">
          {/* How This Protocol Works */}
          <Section title="How This Protocol Works" icon={<Lightbulb className="h-5 w-5 text-blue-400" />}>
            {customCopy ? (
              <div className="space-y-3">
                {customCopy.howItWorks.map((p, i) => (
                  <p key={i} className="text-sm text-muted-foreground leading-relaxed">{p}</p>
                ))}
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {protocol.name} is a {protocol.duration_days === 0 ? "flexible ongoing" : `${protocol.duration_days}-day`} fasting
                  program designed to help your body transition from sugar-burning to fat-burning safely and sustainably.
                </p>
                {autoProgression && (
                  <p className="text-sm text-muted-foreground leading-relaxed mt-3">
                    Instead of repeating the same fasting schedule each day, the fasting window gradually increases week by week,
                    allowing your metabolism to adapt while maintaining steady energy and appetite control.
                  </p>
                )}
              </>
            )}
          </Section>

          {/* Weekly Progression */}
          {(customCopy?.progression || autoProgression) && (
            <Section title="Weekly Progression" icon={<TrendingUp className="h-5 w-5 text-blue-400" />}>
              <div className="space-y-2">
                {customCopy?.progression ? (
                  customCopy.progression.map((w, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3">
                      <span className="font-semibold text-sm">{w.label}</span>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Fasting: <strong className="text-foreground">{w.fastHours}</strong></span>
                        <span>Eating: <strong className="text-foreground">{w.eatHours}</strong></span>
                      </div>
                    </div>
                  ))
                ) : (
                  autoProgression!.map((w) => (
                    <div key={w.week} className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3">
                      <span className="font-semibold text-sm">Week {w.week}</span>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Fasting: <strong className="text-foreground">{w.fastHours}h</strong></span>
                        <span>Eating: <strong className="text-foreground">{w.eatHours}h</strong></span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {customCopy?.progressionNote && (
                <p className="text-sm text-muted-foreground mt-3">{customCopy.progressionNote}</p>
              )}
            </Section>
          )}

          {/* Daily Schedule */}
          <Section title="Daily Schedule Example" icon={<Clock className="h-5 w-5 text-blue-400" />}>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between rounded-lg bg-muted/40 px-4 py-3">
                <span className="text-muted-foreground">Stop eating</span>
                <span className="font-semibold">{customCopy?.schedule.stopEating || autoSchedule.stopEating}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-muted/40 px-4 py-3">
                <span className="text-muted-foreground">Break fast</span>
                <span className="font-semibold">{customCopy?.schedule.breakFast || autoSchedule.breakFast}</span>
              </div>
            </div>
            <div className="mt-3 text-sm text-muted-foreground space-y-1">
              <p>{customCopy ? "Typical meals:" : "Meals typically include:"}</p>
              <ul className="list-disc list-inside pl-1 space-y-0.5">
                {(customCopy?.scheduleMeals || ["Lunch", "Dinner", "Optional protein snack"]).map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs italic">
                {customCopy?.scheduleNote || "Adjust timing to fit your routine."}
              </p>
            </div>
          </Section>

          {/* Meal Strategy */}
          <Section title="Meal Strategy" icon={<Utensils className="h-5 w-5 text-blue-400" />}>
            {customCopy ? (
              <div className="text-sm text-muted-foreground space-y-2">
                {customCopy.mealStrategy.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Start meals with protein to stabilize appetite and energy.
                </p>
                <div className="mt-3 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Focus on:</p>
                  <ul className="list-disc list-inside pl-1 space-y-0.5">
                    <li>Protein-rich meals</li>
                    <li>Vegetables</li>
                    <li>Healthy fats</li>
                    <li>Moderate carbohydrates</li>
                  </ul>
                  <p className="mt-2">Avoid late-night eating during this protocol.</p>
                </div>
              </>
            )}
          </Section>

          {/* What To Expect */}
          <Section title="What To Expect" icon={<BarChart3 className="h-5 w-5 text-blue-400" />}>
            {customCopy ? (
              <div className="space-y-2">
                {customCopy.whatToExpect.map((item, i) => (
                  <div key={i} className="rounded-lg bg-muted/40 px-4 py-3">
                    <span className="text-sm text-muted-foreground">{item}</span>
                  </div>
                ))}
                {customCopy.whatToExpectNote && (
                  <p className="text-sm text-muted-foreground mt-3">{customCopy.whatToExpectNote}</p>
                )}
              </div>
            ) : autoProgression ? (
              <div className="space-y-2">
                {autoProgression.map((w) => (
                  <div key={w.week} className="rounded-lg bg-muted/40 px-4 py-3">
                    <span className="font-semibold text-sm">Week {w.week}: </span>
                    <span className="text-sm text-muted-foreground">
                      {w.week === 1 && "Hunger adjustment and routine building"}
                      {w.week === 2 && "Reduced cravings and steadier energy"}
                      {w.week === 3 && "Appetite regulation and consistent fat-burning"}
                      {w.week > 3 && "Deeper adaptation and sustained results"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Gradual adaptation and sustained results.</p>
            )}
          </Section>

          {/* Coach Guidance */}
          <Section title="Coach Guidance" icon={<Droplets className="h-5 w-5 text-blue-400" />}>
            <ul className="text-sm text-muted-foreground space-y-2">
              {(customCopy?.coachGuidance || [
                "Stay hydrated during fasting hours.",
                "Keep meals simple and protein-focused.",
                "Stop eating when comfortably satisfied.",
                "Daily movement supports metabolic health.",
              ]).map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </Section>

          {/* Who This Is For */}
          <Section title="Who This Is For" icon={<Users className="h-5 w-5 text-blue-400" />}>
            {customCopy ? (
              <div className="space-y-2">
                {customCopy.whoThisIsFor.map((p, i) => (
                  <p key={i} className="text-sm text-muted-foreground leading-relaxed">{p}</p>
                ))}
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Clients who want structured {protocol.category.toLowerCase()} support without aggressive fasting.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Ideal for {getDifficultyLabel(protocol.difficulty_level).toLowerCase()}-level clients
                  {protocol.difficulty_level === "beginner" ? " and those returning to fasting." : "."}
                </p>
              </>
            )}
          </Section>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t p-4 safe-area-bottom">
        <Button
          className="w-full h-12 text-base font-semibold"
          onClick={() => selectProtocolMutation.mutate(protocol.id)}
          disabled={selectProtocolMutation.isPending}
        >
          {selectProtocolMutation.isPending ? "Starting..." : "Ready To Start"}
        </Button>
      </div>
    </ClientLayout>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-base font-bold">{title}</h2>
      </div>
      <div>{children}</div>
    </div>
  );
}
