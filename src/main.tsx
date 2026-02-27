import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App.tsx";
import "./index.css";
import { clearServiceWorkersAndCaches, disableServiceWorkersInNative, isNativeApp } from "./lib/nativePlatform";

const isLovablePreviewHost =
  window.location.hostname.includes("lovableproject.com") ||
  window.location.hostname.startsWith("id-preview--");

// Native + preview should never use service workers (prevents stale UI flashes).
if (isNativeApp() || isLovablePreviewHost) {
  (isNativeApp() ? disableServiceWorkersInNative() : clearServiceWorkersAndCaches("[Preview]")).catch(() => {});
} else if (import.meta.env.PROD && "serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <App />
  </ThemeProvider>
);

