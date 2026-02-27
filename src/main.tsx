import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App.tsx";
import "./index.css";
import { disableServiceWorkersInNative, isNativeApp } from "./lib/nativePlatform";

// In native builds, remove service workers to prevent caching conflicts.
// On web, register the PWA service worker for offline support.
if (isNativeApp()) {
  disableServiceWorkersInNative();
} else if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <App />
  </ThemeProvider>
);
