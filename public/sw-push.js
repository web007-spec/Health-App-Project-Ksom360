// Custom Service Worker for Web Push Notifications
// This file handles push events when the app is in the background or closed

self.addEventListener("push", (event) => {
  let data = { title: "EverFit Stride", body: "You have a new notification", icon: "/pwa-192x192.png" };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (e) {
    console.error("Error parsing push data:", e);
  }

  const options = {
    body: data.body,
    icon: data.icon || "/pwa-192x192.png",
    badge: data.badge || "/pwa-192x192.png",
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: [
      { action: "open", title: "Open" },
      { action: "dismiss", title: "Dismiss" },
    ],
    requireInteraction: true,
    tag: data.tag || "everfit-notification",
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(urlToOpen);
          return;
        }
      }
      // Otherwise open a new window
      return clients.openWindow(urlToOpen);
    })
  );
});

self.addEventListener("notificationclose", (event) => {
  // Analytics: track dismissed notifications if needed
  console.log("Notification dismissed:", event.notification.tag);
});
