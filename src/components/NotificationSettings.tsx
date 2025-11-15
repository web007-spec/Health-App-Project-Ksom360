import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Mail, TestTube } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { showBrowserNotification } from "@/lib/notifications";

export function NotificationSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [reminderHours, setReminderHours] = useState("24");

  // Fetch notification preferences
  const { data: preferences, isLoading } = useQuery({
    queryKey: ["notification-preferences", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Update local state when preferences are loaded
  useEffect(() => {
    if (preferences) {
      setEmailEnabled(preferences.email_enabled);
      setPushEnabled(preferences.push_enabled);
      setReminderHours(preferences.reminder_hours_before.toString());
    }
  }, [preferences]);

  // Save notification preferences
  const savePreferencesMutation = useMutation({
    mutationFn: async () => {
      const preferenceData = {
        user_id: user?.id,
        email_enabled: emailEnabled,
        push_enabled: pushEnabled,
        reminder_hours_before: parseInt(reminderHours),
        updated_at: new Date().toISOString(),
      };

      if (preferences) {
        const { error } = await supabase
          .from("notification_preferences")
          .update(preferenceData)
          .eq("user_id", user?.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("notification_preferences")
          .insert(preferenceData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      toast({
        title: "Settings saved",
        description: "Your notification preferences have been updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save notification settings",
        variant: "destructive",
      });
    },
  });

  const requestPushPermission = async () => {
    if (!("Notification" in window)) {
      toast({
        title: "Not supported",
        description: "Push notifications are not supported in your browser",
        variant: "destructive",
      });
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setPushEnabled(true);
      toast({
        title: "Permission granted",
        description: "You will now receive push notifications",
      });
    } else {
      setPushEnabled(false);
      toast({
        title: "Permission denied",
        description: "Push notifications have been disabled",
        variant: "destructive",
      });
    }
  };

  const handleSave = () => {
    savePreferencesMutation.mutate();
  };

  const handleTestNotification = async () => {
    const success = await showBrowserNotification("Test Notification", {
      body: "Your workout reminders will look like this!",
      icon: "/favicon.ico",
    });

    if (success) {
      toast({
        title: "Test successful",
        description: "Check your notification!",
      });
    } else {
      toast({
        title: "Test failed",
        description: "Please enable notifications in your browser settings",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Workout Reminders
        </CardTitle>
        <CardDescription>
          Get notified about your upcoming scheduled workouts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email Notifications */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Notifications
            </Label>
            <p className="text-sm text-muted-foreground">
              Receive workout reminders via email
            </p>
          </div>
          <Switch
            checked={emailEnabled}
            onCheckedChange={setEmailEnabled}
          />
        </div>

        {/* Push Notifications */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Push Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive browser push notifications
              </p>
            </div>
            <div className="flex items-center gap-2">
              {pushEnabled && Notification.permission === "granted" ? (
                <Switch
                  checked={pushEnabled}
                  onCheckedChange={setPushEnabled}
                />
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={requestPushPermission}
                >
                  Enable
                </Button>
              )}
            </div>
          </div>
          
          {pushEnabled && Notification.permission === "granted" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestNotification}
              className="w-full"
            >
              <TestTube className="h-4 w-4 mr-2" />
              Test Notification
            </Button>
          )}
        </div>

        {/* Reminder Timing */}
        <div className="space-y-2">
          <Label>Reminder Timing</Label>
          <Select value={reminderHours} onValueChange={setReminderHours}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 hour before</SelectItem>
              <SelectItem value="2">2 hours before</SelectItem>
              <SelectItem value="4">4 hours before</SelectItem>
              <SelectItem value="12">12 hours before</SelectItem>
              <SelectItem value="24">24 hours before</SelectItem>
              <SelectItem value="48">48 hours before</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            You'll be notified this long before your scheduled workouts
          </p>
        </div>

        <Button 
          onClick={handleSave} 
          disabled={savePreferencesMutation.isPending}
          className="w-full"
        >
          {savePreferencesMutation.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
