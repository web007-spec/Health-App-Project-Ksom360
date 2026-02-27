import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const statusColors = {
  active: "bg-green-500/10 text-green-700 dark:text-green-400",
  paused: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  pending: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
};

export function ClientListItem({ client }: { client: any }) {
  const navigate = useNavigate();

  return (
    <button
      className="flex items-center gap-3 w-full p-3 hover:bg-muted/50 transition-colors rounded-lg text-left"
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
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  );
}
