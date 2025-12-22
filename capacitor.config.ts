import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.e2639f10dea7413a8fe8ad86d72b42ec',
  appName: 'everfit-stride-cloud',
  webDir: 'dist',
  server: {
    url: 'https://e2639f10-dea7-413a-8fe8-ad86d72b42ec.lovableproject.com?forceHideBadge=true',
    cleartext: true
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
