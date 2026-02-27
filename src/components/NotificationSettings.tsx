import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Mail, TestTube, Smartphone, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { showBrowserNotification } from "@/lib/notifications";
import {
  isPushSupported,
  getPushPermissionStatus,
  getVapidPublicKey,
  subscribeToPush,
  savePushSubscription,
  unsubscribeFromPush,
  removePushSubscription,
} from "@/lib/pushNotifications";
import { Badge } from "@/components/ui/badge";

export function NotificationSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [reminderHours, setReminderHours] = useState("24");
  const [subscribing, setSubscribing] = useState(false);
  const pushSupported = isPushSupported();
  const permissionStatus = getPushPermissionStatus();

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
      setEmailEnabled(preferences.email_enabled ?? true);
      setPushEnabled(preferences.push_enabled ?? false);
      setReminderHours((preferences.reminder_hours_before ?? 24).toString());
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

  const handleEnablePush = async () => {
    if (!user?.id) return;
    setSubscribing(true);

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast({
          title: "Permission denied",
          description: "Please allow notifications in your browser settings to receive push alerts",
          variant: "destructive",
        });
        setSubscribing(false);
        return;
      }

      // Get VAPID public key
      const vapidKey = await getVapidPublicKey();
      if (!vapidKey) {
        toast({
          title: "Setup required",
          description: "Push notification keys need to be configured. Please contact support.",
          variant: "destructive",
        });
        setSubscribing(false);
        return;
      }

      // Subscribe to push
      const subscription = await subscribeToPush(vapidKey);
      if (!subscription) {
        toast({
          title: "Subscription failed",
          description: "Could not subscribe to push notifications. Please try again.",
          variant: "destructive",
        });
        setSubscribing(false);
        return;
      }

      // Save subscription to DB
      await savePushSubscription(user.id, subscription);
      setPushEnabled(true);

      toast({
        title: "Push notifications enabled! 🔔",
        description: "You'll now receive notifications even when the app is closed",
      });
    } catch (err) {
      console.error("Error enabling push:", err);
      toast({
        title: "Error",
        description: "Failed to enable push notifications",
        variant: "destructive",
      });
    } finally {
      setSubscribing(false);
    }
  };

  const handleDisablePush = async () => {
    if (!user?.id) return;
    try {
      await unsubscribeFromPush();
      await removePushSubscription(user.id);
      setPushEnabled(false);
      toast({
        title: "Push notifications disabled",
        description: "You will no longer receive push notifications",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to disable push notifications",
        variant: "destructive",
      });
    }
  };

  const handleSave = () => {
    savePreferencesMutation.mutate();
  };

  const handleTestNotification = async () => {
    const success = await showBrowserNotification("🏋️ Workout Reminder", {
      body: "You have an Upper Body workout scheduled in 1 hour!",
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      tag: "test-notification",
    });

    if (success) {
      toast({
        title: "Test sent!",
        description: "Check your notifications — that's how reminders will appear",
      });
    } else {
      toast({
        title: "Test failed",
        description: "Please enable notifications in your browser settings first",
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
          Notification Settings
        </CardTitle>
        <CardDescription>
          Get notified about workouts, health alerts, and more — even on your lock screen
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Push Notifications */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Push Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive alerts on your lock screen, even when the app is closed
              </p>
            </div>
            <div className="flex items-center gap-2">
              {pushEnabled && permissionStatus === "granted" ? (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                  <Switch
                    checked={pushEnabled}
                    onCheckedChange={(checked) => {
                      if (!checked) handleDisablePush();
                    }}
                  />
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEnablePush}
                  disabled={subscribing || !pushSupported}
                >
                  {subscribing ? "Setting up..." : !pushSupported ? "Not supported" : "Enable"}
                </Button>
              )}
            </div>
          </div>

          {!pushSupported && (
            <p className="text-xs text-muted-foreground">
              Push notifications are not supported in this browser. Try Chrome or Edge on desktop, or install the app on your phone.
            </p>
          )}

          {pushEnabled && permissionStatus === "granted" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestNotification}
              className="w-full"
            >
              <TestTube className="h-4 w-4 mr-2" />
              Send Test Notification
            </Button>
          )}
        </div>

        {/* Email Notifications */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Notifications
            </Label>
            <p className="text-sm text-muted-foreground">
              Receive workout reminders and health reports via email
            </p>
          </div>
          <Switch
            checked={emailEnabled}
            onCheckedChange={setEmailEnabled}
          />
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
