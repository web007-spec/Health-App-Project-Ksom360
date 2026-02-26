import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, Settings, Mail, MessageSquare, CheckSquare, TrendingUp, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statusColors = {
  active: "bg-green-500/10 text-green-700 dark:text-green-400",
  paused: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  pending: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
};

interface ClientListItemProps {
  client: any;
  onChangeStatus?: (client: any) => void;
  onAssignTask?: (clientId: string) => void;
  onResendEmail?: (clientId: string) => void;
}

export function ClientListItem({ client, onChangeStatus, onAssignTask, onResendEmail }: ClientListItemProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-3 w-full p-3 hover:bg-muted/50 transition-colors rounded-lg text-left">
      <button
        className="flex items-center gap-3 flex-1 min-w-0"
        onClick={() => navigate(`/clients/${client.client_id}`)}
      >
        <Avatar className="h-11 w-11 shrink-0 ring-2 ring-border">
          <AvatarImage src={client.client?.avatar_url} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
            {client.client?.full_name?.charAt(0) || "C"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate text-sm">
            {client.client?.full_name || "New Client"}
          </p>
          <p className="text-xs text-muted-foreground truncate">{client.client?.email}</p>
        </div>
        <Badge
          variant="secondary"
          className={`${statusColors[client.status as keyof typeof statusColors]} text-[10px] px-1.5 py-0 shrink-0`}
        >
          {client.status}
        </Badge>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-muted-foreground">
            <Settings className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="z-[100] bg-background border-border w-56">
          <DropdownMenuItem onClick={() => onChangeStatus?.(client)}>
            <Settings className="h-4 w-4 mr-2" />
            Change Status
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAssignTask?.(client.client_id)}>
            <CheckSquare className="h-4 w-4 mr-2" />
            Assign Task
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate(`/clients/${client.client_id}/workout-history`)}>
            <TrendingUp className="h-4 w-4 mr-2" />
            Workout History
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate(`/clients/${client.client_id}/health`)}>
            <Heart className="h-4 w-4 mr-2" />
            Health
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onResendEmail?.(client.client_id)}>
            <Mail className="h-4 w-4 mr-2" />
            Resend Welcome Email
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
