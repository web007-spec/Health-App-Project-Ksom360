import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

interface Props {
  clientId: string;
}

export function ClientMetricsTab({ clientId }: Props) {
  const { data: entries } = useQuery({
    queryKey: ["client-progress-entries", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("progress_entries")
        .select("*")
        .eq("client_id", clientId)
        .order("entry_date", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Body Metrics</h2>

      {/* Latest stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Weight", value: entries?.[0]?.weight, unit: "lbs" },
          { label: "Body Fat", value: entries?.[0]?.body_fat_percentage, unit: "%" },
        ].map((metric) => (
          <Card key={metric.label}>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">{metric.label}</p>
              {metric.value ? (
                <p className="text-2xl font-bold mt-1">{metric.value}<span className="text-sm text-muted-foreground ml-1">{metric.unit}</span></p>
              ) : (
                <p className="text-sm text-muted-foreground italic mt-1">No data</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Progress History</CardTitle>
        </CardHeader>
        <CardContent>
          {entries && entries.length > 0 ? (
            <div className="space-y-3">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{format(new Date(entry.entry_date), "MMM dd, yyyy")}</p>
                    {entry.notes && <p className="text-xs text-muted-foreground">{entry.notes}</p>}
                  </div>
                  <div className="flex gap-4 text-sm">
                    {entry.weight && <span>{entry.weight} lbs</span>}
                    {entry.body_fat_percentage && <span>{entry.body_fat_percentage}%</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No metrics recorded yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
