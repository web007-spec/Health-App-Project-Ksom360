import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, RefreshCw, Trash2, Plus, AlertCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

interface ClientSportScheduleCardProps {
  clientId: string;
  trainerId: string;
}

export function ClientSportScheduleCard({ clientId, trainerId }: ClientSportScheduleCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [feedUrl, setFeedUrl] = useState("");
  const [feedName, setFeedName] = useState("TeamSnap");
  const [showAdd, setShowAdd] = useState(false);

  const { data: feeds, isLoading } = useQuery({
    queryKey: ["client-ical-feeds", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_ical_feeds")
        .select("*")
        .eq("client_id", clientId)
        .eq("trainer_id", trainerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addFeedMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("client_ical_feeds").insert({
        client_id: clientId,
        trainer_id: trainerId,
        feed_url: feedUrl,
        feed_name: feedName,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-ical-feeds", clientId] });
      setFeedUrl("");
      setFeedName("TeamSnap");
      setShowAdd(false);
      toast({ title: "Feed added", description: "Now sync it to import events." });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (feedId: string) => {
      const { data, error } = await supabase.functions.invoke("sync-ical-feed", {
        body: { feed_id: feedId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["client-ical-feeds", clientId] });
      queryClient.invalidateQueries({ queryKey: ["sport-schedule-events"] });
      toast({ title: "Synced!", description: `${data.events_synced} events imported.` });
    },
    onError: (e: Error) => {
      toast({ title: "Sync failed", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (feedId: string) => {
      const { error } = await supabase.from("client_ical_feeds").delete().eq("id", feedId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-ical-feeds", clientId] });
      queryClient.invalidateQueries({ queryKey: ["sport-schedule-events"] });
      toast({ title: "Feed removed" });
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Sport Schedule (iCal Sync)
            </CardTitle>
            <CardDescription>
              Sync your client's team schedule from TeamSnap or any app that provides an iCal feed URL.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Feed
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showAdd && (
          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <div className="space-y-2">
              <Label>Feed Name</Label>
              <Input
                value={feedName}
                onChange={(e) => setFeedName(e.target.value)}
                placeholder="e.g. TeamSnap, Google Calendar"
              />
            </div>
            <div className="space-y-2">
              <Label>iCal Feed URL</Label>
              <Input
                value={feedUrl}
                onChange={(e) => setFeedUrl(e.target.value)}
                placeholder="https://go.teamsnap.com/..."
                type="url"
              />
              <p className="text-xs text-muted-foreground">
                In TeamSnap: Settings → Calendar Sync → Copy the iCal/webcal URL
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => addFeedMutation.mutate()}
                disabled={!feedUrl || addFeedMutation.isPending}
              >
                Save Feed
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {isLoading && <p className="text-sm text-muted-foreground">Loading feeds...</p>}

        {feeds && feeds.length === 0 && !showAdd && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No sport calendar feeds added yet. Click "Add Feed" to sync a schedule.
          </p>
        )}

        {feeds?.map((feed) => (
          <div key={feed.id} className="flex items-center justify-between border rounded-lg p-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{feed.feed_name}</span>
                {feed.sync_error ? (
                  <Badge variant="destructive" className="text-xs">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Error
                  </Badge>
                ) : feed.last_synced_at ? (
                  <Badge variant="secondary" className="text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Synced
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">Not synced</Badge>
                )}
              </div>
              {feed.last_synced_at && (
                <p className="text-xs text-muted-foreground">
                  Last synced: {format(new Date(feed.last_synced_at), "MMM d, h:mm a")}
                </p>
              )}
              {feed.sync_error && (
                <p className="text-xs text-destructive">{feed.sync_error}</p>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => syncMutation.mutate(feed.id)}
                disabled={syncMutation.isPending}
              >
                <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => deleteMutation.mutate(feed.id)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
