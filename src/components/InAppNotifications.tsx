import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, X, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function InAppNotifications() {
  const clientId = useEffectiveClientId();
  const queryClient = useQueryClient();

  const { data: notifications } = useQuery({
    queryKey: ["in-app-notifications", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_events")
        .select("*")
        .eq("user_id", clientId!)
        .is("opened_at", null)
        .is("dismissed_at", null)
        .is("suppression_reason", null)
        .order("sent_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
    refetchInterval: 60000,
  });

  const markOpenedMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase
        .from("notification_events")
        .update({ opened_at: new Date().toISOString() })
        .eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["in-app-notifications"] });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase
        .from("notification_events")
        .update({ dismissed_at: new Date().toISOString() })
        .eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["in-app-notifications"] });
    },
  });

  if (!notifications || notifications.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Notifications
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            {notifications.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {notifications.map((n) => (
          <div
            key={n.id}
            className="flex items-start gap-3 rounded-lg border border-border p-3 bg-card"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{n.title}</p>
              {n.body && (
                <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(n.sent_at), { addSuffix: true })}
              </p>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => markOpenedMutation.mutate(n.id)}
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => dismissMutation.mutate(n.id)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
