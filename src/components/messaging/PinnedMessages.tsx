import { Pin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, parseISO } from "date-fns";

interface PinnedMessagesProps {
  messages: any[];
  onClose: () => void;
  onJumpToMessage: (messageId: string) => void;
}

export function PinnedMessages({ messages, onClose, onJumpToMessage }: PinnedMessagesProps) {
  if (!messages.length) return null;

  return (
    <div className="border-b bg-card/50">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Pin className="h-4 w-4 text-primary" />
          <span>{messages.length} pinned message{messages.length > 1 ? "s" : ""}</span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <ScrollArea className="max-h-32">
        <div className="px-4 pb-2 space-y-1">
          {messages.map((msg) => (
            <button
              key={msg.id}
              onClick={() => onJumpToMessage(msg.id)}
              className="w-full text-left p-2 rounded-md hover:bg-muted transition-colors"
            >
              <p className="text-xs font-medium text-muted-foreground">
                {msg.sender?.full_name || "User"} · {format(parseISO(msg.created_at), "MMM d, p")}
              </p>
              <p className="text-sm truncate">{msg.content || "📎 Attachment"}</p>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
