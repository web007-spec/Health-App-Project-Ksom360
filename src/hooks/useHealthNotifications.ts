import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { showBrowserNotification } from "@/lib/notifications";

interface HealthNotification {
  id: string;
  trainer_id: string;
  client_id: string;
  notification_type: string;
  message: string;
  sent_at: string;
  read_at: string | null;
  created_at: string;
}

export function useHealthNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch unread health notifications
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['health-notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('health_notifications')
        .select('*')
        .eq('trainer_id', user?.id)
        .is('read_at', null)
        .order('sent_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as HealthNotification[];
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Mark notification as read
  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('health_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-notifications'] });
    },
  });

  // Mark all as read
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('health_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('trainer_id', user?.id)
        .is('read_at', null);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-notifications'] });
    },
  });

  // Set up realtime subscription for new notifications
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('health-notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'health_notifications',
          filter: `trainer_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('New health notification:', payload);
          
          // Show browser notification
          const notification = payload.new as HealthNotification;
          showBrowserNotification('Health Alert', {
            body: notification.message,
            icon: '/favicon.ico',
            tag: `health-${notification.id}`,
          });

          // Invalidate query to refresh the list
          queryClient.invalidateQueries({ queryKey: ['health-notifications'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return {
    notifications,
    isLoading,
    unreadCount: notifications?.length || 0,
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
  };
}

// Function to trigger health notification from client sync
export async function triggerHealthNotification(
  clientId: string,
  notificationType: 'health_sync' | 'low_activity' | 'heart_rate_alert',
  data?: {
    steps?: number;
    calories?: number;
    heart_rate?: number;
    provider?: string;
  }
) {
  try {
    const { data: response, error } = await supabase.functions.invoke('send-health-notification', {
      body: {
        client_id: clientId,
        notification_type: notificationType,
        data,
      },
    });

    if (error) {
      console.error('Error triggering health notification:', error);
      return false;
    }

    console.log('Health notification triggered:', response);
    return true;
  } catch (error) {
    console.error('Failed to trigger health notification:', error);
    return false;
  }
}
