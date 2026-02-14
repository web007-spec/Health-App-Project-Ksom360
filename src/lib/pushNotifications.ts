import { supabase } from "@/integrations/supabase/client";

// Convert base64 URL to Uint8Array for applicationServerKey
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Get the VAPID public key from the server
export async function getVapidPublicKey(): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke("generate-vapid-keys");
    if (error) throw error;
    return data?.publicKey || null;
  } catch (err) {
    console.error("Failed to get VAPID key:", err);
    return null;
  }
}

// Register the push service worker and get subscription
export async function subscribeToPush(vapidPublicKey: string): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("Push notifications not supported");
    return null;
  }

  try {
    // Register the push service worker
    const registration = await navigator.serviceWorker.register("/sw-push.js", {
      scope: "/",
    });

    await navigator.serviceWorker.ready;

    const reg = registration as any;

    // Check existing subscription
    let subscription = await reg.pushManager.getSubscription();

    if (!subscription) {
      // Subscribe with the VAPID key
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    }

    return subscription;
  } catch (err) {
    console.error("Failed to subscribe to push:", err);
    return null;
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return true;

    const subscription = await (registration as any).pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }
    return true;
  } catch (err) {
    console.error("Failed to unsubscribe from push:", err);
    return false;
  }
}

// Save subscription to the database
export async function savePushSubscription(
  userId: string,
  subscription: PushSubscription
): Promise<boolean> {
  try {
    const subscriptionJson = subscription.toJSON();

    const { error } = await supabase
      .from("notification_preferences")
      .upsert(
        {
          user_id: userId,
          push_enabled: true,
          push_subscription: subscriptionJson as any,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Failed to save push subscription:", err);
    return false;
  }
}

// Remove subscription from the database
export async function removePushSubscription(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("notification_preferences")
      .update({
        push_enabled: false,
        push_subscription: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Failed to remove push subscription:", err);
    return false;
  }
}

// Check if push is supported
export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

// Get current permission status
export function getPushPermissionStatus(): NotificationPermission | "unsupported" {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}
