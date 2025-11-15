import { ClientLayout } from "@/components/ClientLayout";
import { NotificationSettings } from "@/components/NotificationSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

export default function ClientSettings() {
  return (
    <ClientLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your preferences and notifications</p>
        </div>

        <div className="max-w-2xl space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Workout Reminders</AlertTitle>
            <AlertDescription>
              Enable notifications to get reminded about your upcoming scheduled workouts. 
              Browser notifications work instantly, while email reminders require additional setup by your trainer.
            </AlertDescription>
          </Alert>

          <NotificationSettings />
        </div>
      </div>
    </ClientLayout>
  );
}
