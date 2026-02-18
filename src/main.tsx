import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App.tsx";
import "./index.css";
import { disableServiceWorkersInNative } from "./lib/nativePlatform";

// In native builds, remove service workers to prevent caching conflicts
disableServiceWorkersInNative();

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <App />
  </ThemeProvider>
);
