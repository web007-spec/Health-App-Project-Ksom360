import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Copy, Check, UserCheck, Share2, MessageSquare } from "lucide-react";

interface AddClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddClientDialog({ open, onOpenChange }: AddClientDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const addClientMutation = useMutation({
    mutationFn: async () => {
      if (!email.trim() || !fullName.trim() || !password.trim()) {
        throw new Error("All fields are required");
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error("Please enter a valid email address");
      }
      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }
      const loginUrl = `${window.location.origin}/auth`;
      const { data, error } = await supabase.functions.invoke("create-client", {
        body: {
          email: email.trim(),
          fullName: fullName.trim(),
          password: password.trim(),
          loginUrl,
        },
      });
      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.error || "Failed to create client");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setCreatedCredentials({ email: email.trim(), password: password.trim(), name: fullName.trim() });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add client",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setEmail("");
    setFullName("");
    setPassword("");
    setCreatedCredentials(null);
    setCopied(false);
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addClientMutation.mutate();
  };

  const getShareText = () => {
    if (!createdCredentials) return "";
    return `Hey ${createdCredentials.name}! Your KSOM360 account is ready 💪\n\nLogin here: ${window.location.origin}/auth\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`;
  };

  const handleCopy = async () => {
    if (!createdCredentials) return;
    await navigator.clipboard.writeText(getShareText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareViaText = async () => {
    const text = getShareText();
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch (err) {
        // User cancelled or share failed, fall back to copy
        await navigator.clipboard.writeText(text);
        toast({ title: "Copied to clipboard!", description: "Paste it into your messaging app" });
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied to clipboard!", description: "Paste it into your messaging app to send via text" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={createdCredentials ? handleClose : onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {createdCredentials ? (
          <>
            <DialogHeader>
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
              <DialogTitle className="text-center">Client Created!</DialogTitle>
              <DialogDescription className="text-center">
                Share these credentials with <strong>{createdCredentials.name}</strong> so they can log in.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2 text-sm font-mono">
              <div><span className="text-muted-foreground">Login URL:</span> {window.location.origin}/auth</div>
              <div><span className="text-muted-foreground">Email:</span> {createdCredentials.email}</div>
              <div><span className="text-muted-foreground">Password:</span> {createdCredentials.password}</div>
            </div>

            <DialogFooter className="flex flex-col gap-2 sm:flex-col">
              <div className="flex gap-2 w-full">
                <Button variant="outline" onClick={handleCopy} className="gap-2 flex-1">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied!" : "Copy"}
                </Button>
                <Button variant="outline" onClick={handleShareViaText} className="gap-2 flex-1">
                  <MessageSquare className="h-4 w-4" />
                  Share via Text
                </Button>
              </div>
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
              <DialogDescription>
                Create a new client account. You'll get login credentials to share with them.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input id="fullName" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" placeholder="client@example.com" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input id="password" type="password" placeholder="Minimum 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
                <p className="text-xs text-muted-foreground">Client will use this password to log in</p>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
                <Button type="submit" disabled={addClientMutation.isPending}>
                  {addClientMutation.isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding...</>) : "Add Client"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
