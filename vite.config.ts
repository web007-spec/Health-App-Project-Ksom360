import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // Stamp build timestamp into index.html for WebView cache-busting
    {
      name: 'html-build-timestamp',
      transformIndexHtml(html: string) {
        return html.replace('__BUILD_TIMESTAMP__', new Date().toISOString());
      },
    },
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false, // Don't auto-inject registerSW.js — we handle it in main.tsx to avoid conflicts with Capacitor
      includeAssets: ["favicon.ico", "robots.txt"],
      manifest: {
        name: "KSOM360",
        short_name: "KSOM360",
        description: "Your personal fitness and nutrition coaching platform",
        theme_color: "#111111",
        background_color: "#111111",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB limit
        globPatterns: ["**/*.{js,css,html,ico,woff2}"],
        globIgnores: ["**/*.png", "**/*.jpg", "**/*.jpeg", "**/*.webp", "**/*.svg"],
        navigateFallbackDenylist: [/^\/~oauth/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "image-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 1 week
              },
              networkTimeoutSeconds: 3,
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  // Inject build timestamp into index.html for cache-busting on native WebView
  define: {
    __BUILD_TIMESTAMP__: JSON.stringify(new Date().toISOString()),
  },
  build: {
    rollupOptions: {
      external: [
        '@johnjasonhudson/capacitor-healthkit',
        '@nicholasquinn/capacitor-healthconnect',
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
