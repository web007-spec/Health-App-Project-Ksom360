import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users } from "lucide-react";

interface Contact {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: Contact[];
  onCreateGroup: (name: string, memberIds: string[]) => void;
  isLoading?: boolean;
}

export function CreateGroupDialog({ open, onOpenChange, contacts, onCreateGroup, isLoading }: CreateGroupDialogProps) {
  const [groupName, setGroupName] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleMember = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = () => {
    if (!groupName.trim() || selectedIds.size === 0) return;
    onCreateGroup(groupName.trim(), Array.from(selectedIds));
    setGroupName("");
    setSelectedIds(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Create Group Chat
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="group-name">Group Name</Label>
            <Input
              id="group-name"
              placeholder="e.g. Morning Crew, Weight Loss Group"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          <div>
            <Label>Select Members ({selectedIds.size} selected)</Label>
            <ScrollArea className="h-60 mt-2 border rounded-lg">
              <div className="p-2 space-y-1">
                {contacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => toggleMember(contact.id)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted transition-colors"
                  >
                    <Checkbox checked={selectedIds.has(contact.id)} />
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={contact.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {contact.full_name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left min-w-0">
                      <p className="text-sm font-medium truncate">{contact.full_name || "User"}</p>
                      <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleCreate}
            disabled={!groupName.trim() || selectedIds.size === 0 || isLoading}
          >
            {isLoading ? "Creating..." : "Create Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
