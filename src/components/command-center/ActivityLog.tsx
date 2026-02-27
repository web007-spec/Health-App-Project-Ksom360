import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityLogProps {
  clientId: string;
}

const TYPE_LABELS: Record<string, string> = {
  plan: "Plan Override",
  level: "Level Change",
  engine: "Engine Change",
  safety: "Safety Toggle",
  insight: "Insight Action",
  approval: "Suggestion Approved",
  dismissal: "Suggestion Dismissed",
};

const TYPE_COLORS: Record<string, string> = {
  plan: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  level: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  engine: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  safety: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  insight: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  approval: "bg-green-500/15 text-green-400 border-green-500/30",
  dismissal: "bg-red-500/15 text-red-400 border-red-500/30",
};

export function ActivityLog({ clientId }: ActivityLogProps) {
  const { data: logs = [] } = useQuery({
    queryKey: ["cc-activity-log", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coach_override_log")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Activity Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {logs.map((log: any) => (
                <div key={log.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30">
                  <Badge variant="outline" className={`text-[10px] shrink-0 mt-0.5 ${TYPE_COLORS[log.override_type] || ""}`}>
                    {TYPE_LABELS[log.override_type] || log.override_type}
                  </Badge>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    {log.old_value && log.new_value && (
                      <p className="text-xs text-foreground">
                        {log.old_value} → {log.new_value}
                      </p>
                    )}
                    {log.new_value && !log.old_value && (
                      <p className="text-xs text-foreground">{log.new_value}</p>
                    )}
                    {log.reason && (
                      <p className="text-[11px] text-muted-foreground">{log.reason}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
