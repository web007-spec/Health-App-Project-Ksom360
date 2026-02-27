import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rahulkumar.ksom360',
  appName: 'KS360',
  webDir: 'dist',
  // For development: uncomment the server block below to load from a live dev server
  // server: {
  //   url: 'http://YOUR_LOCAL_IP:5173',
  //   cleartext: true
  // },
  ios: {
    // Prevent stale WebView cache — always load fresh bundled assets
    allowsLinkPreview: false,
  },
  // Force WebView to bypass stale cache on every app launch
  server: {
    // Append a unique build timestamp to all asset URLs to bust cache
    androidScheme: 'https',
    // Disable WebView caching so the latest JS/CSS bundle is always used
    // after a TestFlight update or Xcode rebuild
    iosScheme: 'capacitor',
    cleartext: false,
  },
  plugins: {
    CapacitorHealthConnect: {
      // Android Health Connect configuration
    },
    CapacitorHealthKit: {
      // iOS HealthKit configuration
    }
  }
};

export default config;
