import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  CATEGORY_CONFIG,
  CATEGORY_ORDER,
  getDurationLabel,
} from "@/lib/fastingCategoryConfig";

interface FastingProtocol {
  id: string;
  name: string;
  category: string;
  description: string | null;
  duration_days: number;
  fast_target_hours: number;
  difficulty_level: string;
}

export default function ClientPrograms() {
  const navigate = useNavigate();

  const { data: protocols, isLoading } = useQuery({
    queryKey: ["fasting-protocols"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fasting_protocols")
        .select("*")
        .order("duration_days");
      if (error) throw error;
      return (data as any[]).map((d) => ({
        ...d,
        difficulty_level: d.difficulty_level || "beginner",
      })) as FastingProtocol[];
    },
  });

  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    config: CATEGORY_CONFIG[cat],
    items: protocols?.filter((p) => p.category === cat) || [],
  })).filter((g) => g.items.length > 0);

  return (
    <ClientLayout>
      <div className="px-3 pt-4 pb-8 space-y-6 w-full">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/choose-protocol")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">All Programs</h1>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          grouped.map((group) => {
            const Icon = group.config.icon;
            return (
              <div key={group.category} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${group.config.color}`} />
                  <h2 className={`text-xs font-bold uppercase tracking-wider ${group.config.color}`}>
                    {group.config.label}
                  </h2>
                </div>
                {group.items.map((protocol) => {
                  const CatIcon = group.config.icon;
                  return (
                    <Card
                      key={protocol.id}
                      className={`cursor-pointer border-l-4 ${group.config.borderColor} transition-colors hover:bg-muted/30`}
                      onClick={() => navigate(`/client/protocol/${protocol.id}`)}
                    >
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-full ${group.config.bgColor} flex items-center justify-center shrink-0`}>
                            <CatIcon className={`h-5 w-5 ${group.config.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base">{protocol.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {getDurationLabel(protocol.duration_days)}
                            </p>
                          </div>
                        </div>
                        {protocol.description && (
                          <p className="text-sm text-muted-foreground leading-relaxed pl-[52px]">
                            {protocol.description}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </ClientLayout>
  );
}
