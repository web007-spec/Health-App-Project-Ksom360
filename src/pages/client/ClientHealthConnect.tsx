import { ClientLayout } from '@/components/ClientLayout';
import { HealthConnectionCard } from '@/components/health/HealthConnectionCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Shield, Info } from 'lucide-react';
import { getPlatform, isNativePlatform } from '@/hooks/useHealthData';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function ClientHealthConnect() {
  const platform = getPlatform();
  const isNative = isNativePlatform();
  
  return (
    <ClientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Connect Health App</h1>
          <p className="text-muted-foreground">
            Sync your wearable device data to track your progress automatically
          </p>
        </div>
        
        {!isNative && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Mobile App Required</AlertTitle>
            <AlertDescription>
              Health sync requires the mobile app. Download the app on your phone to connect your Apple Watch, Samsung Galaxy Watch, or other fitness devices.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid gap-6 md:grid-cols-2">
          <HealthConnectionCard provider="apple_health" />
          <HealthConnectionCard provider="health_connect" />
        </div>
        
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Your Privacy</CardTitle>
            </div>
            <CardDescription>
              We take your health data privacy seriously
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Activity className="h-4 w-4 mt-0.5 text-primary" />
                <span>Your trainer can view your health metrics to optimize your training program</span>
              </li>
              <li className="flex items-start gap-2">
                <Activity className="h-4 w-4 mt-0.5 text-primary" />
                <span>Data is synced securely and encrypted during transfer</span>
              </li>
              <li className="flex items-start gap-2">
                <Activity className="h-4 w-4 mt-0.5 text-primary" />
                <span>You can disconnect at any time to stop sharing data</span>
              </li>
              <li className="flex items-start gap-2">
                <Activity className="h-4 w-4 mt-0.5 text-primary" />
                <span>We only access the specific health metrics you approve</span>
              </li>
            </ul>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>What Data Gets Synced?</CardTitle>
            <CardDescription>
              The following health metrics will be shared with your trainer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-medium">Activity Data</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Daily step count</li>
                  <li>• Calories burned</li>
                  <li>• Active minutes</li>
                  <li>• Workouts from your watch</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Health Metrics</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Heart rate (average, resting, max)</li>
                  <li>• Workout heart rate zones</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}
