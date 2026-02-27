import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Smartphone, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { useConnectHealth, useDisconnectHealth, useSyncHealth, useHealthConnections, getPlatform, isNativePlatform } from '@/hooks/useHealthData';
import { useAuth } from '@/hooks/useAuth';
import { useEffectiveClientId } from '@/hooks/useEffectiveClientId';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface HealthConnectionCardProps {
  provider: 'apple_health' | 'health_connect';
}

const providerInfo = {
  apple_health: {
    name: 'Apple Health',
    icon: Heart,
    description: 'Sync heart rate, calories, steps, and workouts from your Apple Watch or iPhone.',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  health_connect: {
    name: 'Samsung Health / Health Connect',
    icon: Smartphone,
    description: 'Sync health data from Samsung Galaxy Watch, Google Fit, and other Android devices.',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
};

export function HealthConnectionCard({ provider }: HealthConnectionCardProps) {
  const { data: connections, isLoading } = useHealthConnections();
  const connectMutation = useConnectHealth();
  const disconnectMutation = useDisconnectHealth();
  const syncMutation = useSyncHealth();
  const { user } = useAuth();
  const effectiveId = useEffectiveClientId();
  
  // Trainer previewing as client on WEB — disable sync/connect
  // On native device, allow sync even when impersonating (HealthKit data belongs to this device)
  const isImpersonating = effectiveId !== user?.id && !isNativePlatform();
  
  const info = providerInfo[provider];
  const Icon = info.icon;
  const connection = connections?.find(c => c.provider === provider);
  const isConnected = connection?.is_connected || false;
  
  const platform = getPlatform();
  const isNative = isNativePlatform();
  
  // Only show relevant provider for the platform
  if (platform === 'ios' && provider !== 'apple_health') return null;
  if (platform === 'android' && provider !== 'health_connect') return null;
  
  const handleConnect = async () => {
    try {
      await connectMutation.mutateAsync();
      toast.success(`Connected to ${info.name}`);
    } catch (error) {
      toast.error('Failed to connect. Please try again.');
    }
  };
  
  const handleDisconnect = async () => {
    try {
      await disconnectMutation.mutateAsync();
      toast.success(`Disconnected from ${info.name}`);
    } catch (error) {
      toast.error('Failed to disconnect. Please try again.');
    }
  };
  
  const handleSync = async () => {
    try {
      const result = await syncMutation.mutateAsync();
      toast.success(`Synced ${result.count} health records`);
    } catch (error) {
      toast.error('Failed to sync. Please try again.');
    }
  };
  
  if (!isNative) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${info.bgColor}`}>
              <Icon className={`h-6 w-6 ${info.color}`} />
            </div>
            <div>
              <CardTitle className="text-lg">{info.name}</CardTitle>
              <CardDescription>Not available on web</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Health sync is only available in the mobile app. Download the app to sync your health data from your wearable device.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${info.bgColor}`}>
              <Icon className={`h-6 w-6 ${info.color}`} />
            </div>
            <div>
              <CardTitle className="text-lg">{info.name}</CardTitle>
              <CardDescription>{info.description}</CardDescription>
            </div>
          </div>
          <Badge variant={isConnected ? 'default' : 'secondary'}>
            {isConnected ? (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Connected
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3 mr-1" />
                Not Connected
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isConnected && connection?.last_sync_at && (
            <p className="text-sm text-muted-foreground">
              Last synced {formatDistanceToNow(new Date(connection.last_sync_at), { addSuffix: true })}
            </p>
          )}
          
          <div className="flex gap-2">
            {isImpersonating ? (
              <p className="text-sm text-muted-foreground italic">
                Health sync can only be done from the client's own device.
              </p>
            ) : isConnected ? (
              <>
                <Button 
                  onClick={handleSync} 
                  disabled={syncMutation.isPending}
                  className="flex-1"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                  {syncMutation.isPending ? 'Syncing...' : 'Sync Now'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleDisconnect}
                  disabled={disconnectMutation.isPending}
                >
                  Disconnect
                </Button>
              </>
            ) : (
              <Button 
                onClick={handleConnect} 
                disabled={connectMutation.isPending}
                className="w-full"
              >
                {connectMutation.isPending ? 'Connecting...' : `Connect ${info.name}`}
              </Button>
            )}
          </div>
          
          {isConnected && connection?.permissions && (
            <div className="flex flex-wrap gap-1">
              {connection.permissions.map((permission) => (
                <Badge key={permission} variant="outline" className="text-xs">
                  {permission.replace('_', ' ')}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
