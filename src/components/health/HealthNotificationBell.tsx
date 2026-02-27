import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useHealthNotifications } from "@/hooks/useHealthNotifications";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

export function HealthNotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading } = useHealthNotifications();

  const handleNotificationClick = (notification: {
    id: string;
    client_id: string;
    notification_type: string;
  }) => {
    markAsRead(notification.id);
    setOpen(false);
    navigate(`/clients/${notification.client_id}/health`);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'health_sync':
        return '🔄';
      case 'low_activity':
        return '⚠️';
      case 'heart_rate_alert':
        return '❤️';
      default:
        return '📢';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold">Health Alerts</h4>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs"
              onClick={() => markAllAsRead()}
            >
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : notifications && notifications.length > 0 ? (
            <div className="divide-y">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex gap-3">
                    <span className="text-lg">
                      {getNotificationIcon(notification.notification_type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.sent_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No new health alerts
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
