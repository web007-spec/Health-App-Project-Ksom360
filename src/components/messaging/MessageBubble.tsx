import { useState, useRef } from "react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Paperclip, Pin, Reply, SmilePlus, Check, CheckCheck } from "lucide-react";

const QUICK_REACTIONS = ["👍", "❤️", "🔥", "😂", "💪", "👏"];

interface MessageBubbleProps {
  message: any;
  isOwn: boolean;
  isGroup: boolean;
  showSenderName: boolean;
  reactions: any[];
  onReact: (emoji: string) => void;
  onRemoveReaction: (reactionId: string) => void;
  onReply: () => void;
  onPin: () => void;
  replyToMessage?: any;
  userId?: string;
}

export function MessageBubble({
  message,
  isOwn,
  isGroup,
  showSenderName,
  reactions,
  onReact,
  onRemoveReaction,
  onReply,
  onPin,
  replyToMessage,
  userId,
}: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const sender = message.sender;

  const groupedReactions = reactions.reduce((acc: Record<string, any[]>, r: any) => {
    if (!acc[r.emoji]) acc[r.emoji] = [];
    acc[r.emoji].push(r);
    return acc;
  }, {});

  return (
    <div
      className={cn("flex gap-2 group relative", isOwn ? "justify-end" : "justify-start")}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {!isOwn && isGroup && (
        <Avatar className="h-7 w-7 mt-1 shrink-0">
          <AvatarImage src={sender?.avatar_url} />
          <AvatarFallback className="text-[10px] bg-muted">
            {sender?.full_name?.charAt(0) || "?"}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={cn("max-w-[75%] relative")}>
        {/* Action buttons - appear on hover */}
        {showActions && (
          <div className={cn(
            "absolute -top-8 z-10 flex items-center gap-0.5 bg-card border rounded-lg shadow-sm p-0.5",
            isOwn ? "right-0" : "left-0"
          )}>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <SmilePlus className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" side="top">
                <div className="flex gap-1">
                  {QUICK_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => onReact(emoji)}
                      className="text-xl hover:scale-125 transition-transform p-1"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onReply}>
              <Reply className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onPin}>
              <Pin className={cn("h-3.5 w-3.5", message.is_pinned && "text-primary fill-primary")} />
            </Button>
          </div>
        )}

        {showSenderName && !isOwn && isGroup && (
          <p className="text-xs text-muted-foreground mb-0.5 px-1">
            {sender?.full_name || "User"}
          </p>
        )}

        {/* Reply preview */}
        {replyToMessage && (
          <div className={cn(
            "text-xs px-3 py-1.5 rounded-t-xl border-l-2 border-primary/50 mb-0.5",
            isOwn ? "bg-primary/20 text-primary-foreground/70" : "bg-muted/80 text-muted-foreground"
          )}>
            <p className="font-medium text-[11px]">{replyToMessage.sender?.full_name || "User"}</p>
            <p className="truncate">{replyToMessage.content || "📎 Attachment"}</p>
          </div>
        )}

        {/* Pinned indicator */}
        {message.is_pinned && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-0.5 px-1">
            <Pin className="h-3 w-3" />
            <span>Pinned</span>
          </div>
        )}

        <div className={cn(
          "rounded-2xl p-3",
          isOwn
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted rounded-bl-md"
        )}>
          {message.image_url && (
            <img
              src={message.image_url}
              alt="Shared image"
              className="rounded-lg max-w-full max-h-60 object-cover mb-1 cursor-pointer"
              onClick={() => window.open(message.image_url, "_blank")}
            />
          )}
          {message.file_url && (
            <a
              href={message.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center gap-2 text-sm underline",
                isOwn ? "text-primary-foreground" : "text-foreground"
              )}
            >
              <Paperclip className="h-3.5 w-3.5 shrink-0" />
              {message.file_name || "Download file"}
            </a>
          )}
          {message.content && <p className="text-sm whitespace-pre-wrap">{message.content}</p>}
        </div>

        {/* Reactions */}
        {Object.keys(groupedReactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1 px-1">
            {Object.entries(groupedReactions).map(([emoji, reactors]: [string, any[]]) => {
              const myReaction = reactors.find((r) => r.user_id === userId);
              return (
                <button
                  key={emoji}
                  onClick={() => myReaction ? onRemoveReaction(myReaction.id) : onReact(emoji)}
                  className={cn(
                    "inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full border transition-colors",
                    myReaction ? "bg-primary/10 border-primary/30" : "bg-muted border-transparent hover:border-border"
                  )}
                >
                  <span>{emoji}</span>
                  <span className="text-[10px] text-muted-foreground">{reactors.length}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Timestamp & read status */}
        <div className="flex items-center gap-1 mt-0.5 px-1">
          <p className="text-[10px] text-muted-foreground">
            {format(parseISO(message.created_at), "p")}
          </p>
          {isOwn && (
            <CheckCheck className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
      </div>
    </div>
  );
}
