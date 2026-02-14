import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { LogProgressDialog } from "@/components/LogProgressDialog";

interface Props {
  clientId: string;
}

export function ClientMetricsTab({ clientId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [notes, setNotes] = useState("");

  const { data: entries } = useQuery({
    queryKey: ["client-progress-entries", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("progress_entries")
        .select("*")
        .eq("client_id", clientId)
        .order("entry_date", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
  });

  const addEntryMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("progress_entries").insert({
        client_id: clientId,
        weight: weight ? parseFloat(weight) : null,
        body_fat_percentage: bodyFat ? parseFloat(bodyFat) : null,
        notes: notes || null,
        entry_date: new Date().toISOString().split("T")[0],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-progress-entries", clientId] });
      toast({ title: "Progress entry added" });
      setAddDialogOpen(false);
      setWeight("");
      setBodyFat("");
      setNotes("");
    },
    onError: () => {
      toast({ title: "Error adding entry", variant: "destructive" });
    },
  });

  const latest = entries?.[0];
  const previous = entries?.[1];
  const weightChange = latest?.weight && previous?.weight ? latest.weight - previous.weight : null;
  const bfChange = latest?.body_fat_percentage && previous?.body_fat_percentage 
    ? latest.body_fat_percentage - previous.body_fat_percentage : null;

  const TrendIcon = ({ value }: { value: number | null }) => {
    if (!value) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (value > 0) return <TrendingUp className="h-4 w-4 text-red-500" />;
    return <TrendingDown className="h-4 w-4 text-green-500" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Body Metrics</h2>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" /> Log Progress
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Progress Entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Weight (lbs)</Label>
                <Input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} placeholder="e.g., 175.5" />
              </div>
              <div>
                <Label>Body Fat %</Label>
                <Input type="number" step="0.1" value={bodyFat} onChange={e => setBodyFat(e.target.value)} placeholder="e.g., 18.5" />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." />
              </div>
              <Button
                onClick={() => addEntryMutation.mutate()}
                disabled={(!weight && !bodyFat) || addEntryMutation.isPending}
                className="w-full"
              >
                Save Entry
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Latest stats with trends */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Weight</p>
            {latest?.weight ? (
              <div className="flex items-center gap-2 mt-1">
                <p className="text-2xl font-bold">{latest.weight}<span className="text-sm text-muted-foreground ml-1">lbs</span></p>
                {weightChange !== null && (
                  <div className="flex items-center gap-1">
                    <TrendIcon value={weightChange} />
                    <span className="text-xs text-muted-foreground">{Math.abs(weightChange).toFixed(1)}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic mt-1">No data</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Body Fat</p>
            {latest?.body_fat_percentage ? (
              <div className="flex items-center gap-2 mt-1">
                <p className="text-2xl font-bold">{latest.body_fat_percentage}<span className="text-sm text-muted-foreground ml-1">%</span></p>
                {bfChange !== null && (
                  <div className="flex items-center gap-1">
                    <TrendIcon value={bfChange} />
                    <span className="text-xs text-muted-foreground">{Math.abs(bfChange).toFixed(1)}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic mt-1">No data</p>
            )}
          </CardContent>
        </Card>
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
