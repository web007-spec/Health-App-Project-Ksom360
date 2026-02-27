import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, RefreshCw, ShieldOff, ShieldCheck, Link2, Copy, Check } from "lucide-react";
import { format } from "date-fns";

interface ParentLinkSectionProps {
  clientId: string;
  trainerId: string;
  athleteName: string;
}

export function ParentLinkSection({ clientId, trainerId, athleteName }: ParentLinkSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [coachNote, setCoachNote] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: link, isLoading } = useQuery({
    queryKey: ["guardian-link", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guardian_links")
        .select("*")
        .eq("athlete_user_id", clientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const sendInviteMutation = useMutation({
    mutationFn: async () => {
      if (!email.trim()) throw new Error("Email is required");

      // Revoke any existing active link
      if (link && link.status !== "revoked") {
        await supabase
          .from("guardian_links")
          .update({ status: "revoked", revoked_at: new Date().toISOString() } as any)
          .eq("id", link.id);
      }

      // Create new link
      const { data: newLink, error } = await supabase
        .from("guardian_links")
        .insert({
          athlete_user_id: clientId,
          trainer_id: trainerId,
          guardian_email: email.trim(),
          coach_note: coachNote.trim() || null,
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Send email
      const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      await supabase.functions.invoke("send-guardian-invite", {
        body: {
          guardianEmail: email.trim(),
          athleteName,
          token: (newLink as any).token,
          appUrl,
        },
      });

      return newLink;
    },
    onSuccess: () => {
      toast({ title: "Invite sent", description: "Guardian invite email has been sent." });
      queryClient.invalidateQueries({ queryKey: ["guardian-link", clientId] });
      setEmail("");
      setCoachNote("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      if (!link) throw new Error("No active link");
      // Reset expiry
      const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await supabase
        .from("guardian_links")
        .update({ expires_at: newExpiry, status: "invited" } as any)
        .eq("id", link.id);

      const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      await supabase.functions.invoke("send-guardian-invite", {
        body: {
          guardianEmail: link.guardian_email,
          athleteName,
          token: link.token,
          appUrl,
        },
      });
    },
    onSuccess: () => {
      toast({ title: "Invite resent", description: "Guardian invite has been resent with a new 7-day expiry." });
      queryClient.invalidateQueries({ queryKey: ["guardian-link", clientId] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async () => {
      if (!link) throw new Error("No active link");
      const { error } = await supabase
        .from("guardian_links")
        .update({ status: "revoked", revoked_at: new Date().toISOString() } as any)
        .eq("id", link.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Access revoked", description: "Guardian access has been revoked." });
      queryClient.invalidateQueries({ queryKey: ["guardian-link", clientId] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleCopyLink = async () => {
    if (!link) return;
    const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    await navigator.clipboard.writeText(`${appUrl}/guardian/${link.token}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusColors: Record<string, string> = {
    invited: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    linked: "bg-green-500/10 text-green-700 dark:text-green-400",
    revoked: "bg-red-500/10 text-red-700 dark:text-red-400",
  };

  const activeLink = link && link.status !== "revoked";
  const isExpired = link && new Date(link.expires_at) < new Date() && link.status !== "revoked";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Parent / Guardian Link</CardTitle>
            <CardDescription>
              Send a read-only weekly recovery summary to a parent or guardian.
            </CardDescription>
          </div>
          {activeLink && (
            <Badge variant="secondary" className={statusColors[link.status] || ""}>
              {isExpired ? "Expired" : link.status}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeLink && !isExpired ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{link.guardian_email}</span>
              </div>
              <div className="text-muted-foreground text-xs">
                Expires: {format(new Date(link.expires_at), "MMM d, yyyy")}
              </div>
              {link.coach_note && (
                <div className="text-muted-foreground text-xs mt-1">
                  Note: {link.coach_note}
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleCopyLink}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy Link"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => resendMutation.mutate()}
                disabled={resendMutation.isPending}
              >
                {resendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Resend Invite
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="gap-2"
                onClick={() => revokeMutation.mutate()}
                disabled={revokeMutation.isPending}
              >
                {revokeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
                Revoke Access
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {isExpired && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Previous invite has expired. Send a new one below.
              </p>
            )}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Guardian Email</label>
              <Input
                type="email"
                placeholder="parent@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Coach Note (optional, visible to guardian)</label>
              <Textarea
                placeholder="e.g. Great week of training, sleep could improve."
                value={coachNote}
                onChange={(e) => setCoachNote(e.target.value)}
                rows={2}
              />
            </div>
            <Button
              onClick={() => sendInviteMutation.mutate()}
              disabled={sendInviteMutation.isPending || !email.trim()}
              className="gap-2"
            >
              {sendInviteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              Send Invite
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
