import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Plus, X, Users } from "lucide-react";

interface CollectionClientsTabProps {
  collectionId: string;
}

export function CollectionClientsTab({ collectionId }: CollectionClientsTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  // Fetch all trainer's clients
  const { data: allClients } = useQuery({
    queryKey: ["trainer-clients", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .eq("role", "client")
        .eq("trainer_id", user!.id)
        .order("full_name");
      if (error) throw error;
      return data as { id: string; full_name: string | null; email: string | null; avatar_url: string | null }[];
    },
    enabled: !!user?.id,
  });

  // Fetch assigned clients
  const { data: assignedAccess } = useQuery({
    queryKey: ["collection-client-access", collectionId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("client_workout_collection_access")
        .select("id, client_id, profiles:client_id(id, full_name, email, avatar_url)")
        .eq("collection_id", collectionId);
      if (error) throw error;
      return data as { id: string; client_id: string; profiles: { id: string; full_name: string | null; email: string | null; avatar_url: string | null } }[];
    },
    enabled: !!collectionId,
  });

  const assignedClientIds = new Set(assignedAccess?.map((a: any) => a.client_id) || []);

  const assignClient = useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase
        .from("client_workout_collection_access")
        .insert({ collection_id: collectionId, client_id: clientId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collection-client-access", collectionId] });
    },
  });

  const removeClient = useMutation({
    mutationFn: async (accessId: string) => {
      const { error } = await supabase
        .from("client_workout_collection_access")
        .delete()
        .eq("id", accessId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collection-client-access", collectionId] });
      toast({ title: "Client removed" });
    },
  });

  const assignAll = useMutation({
    mutationFn: async () => {
      const unassigned = (allClients || []).filter((c) => !assignedClientIds.has(c.id));
      if (unassigned.length === 0) return;
      const rows = unassigned.map((c) => ({ collection_id: collectionId, client_id: c.id }));
      const { error } = await supabase
        .from("client_workout_collection_access")
        .insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collection-client-access", collectionId] });
      toast({ title: "All clients assigned" });
    },
  });

  const filteredClients = (allClients || []).filter((c) => {
    const q = search.toLowerCase();
    return (
      c.full_name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  });

  const unassignedClients = filteredClients.filter((c) => !assignedClientIds.has(c.id));

  const getInitials = (name?: string | null) =>
    (name || "?")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Assign to</h2>
        <p className="text-sm text-muted-foreground">
          Choose clients to assign to this Collection.
        </p>
      </div>

      <div className="flex border border-border rounded-lg overflow-hidden min-h-[400px]">
        {/* Left: client picker */}
        <div className="flex-1 border-r border-border flex flex-col">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search for your clients and groups"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 border-0 bg-muted/50"
              />
            </div>
          </div>

          <div className="px-4 py-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Most Recent ({filteredClients.length})
            </span>
            {unassignedClients.length > 0 && (
              <button
                className="text-xs font-medium text-primary flex items-center gap-1 hover:underline"
                onClick={() => assignAll.mutate()}
              >
                <Plus className="h-3 w-3" />
                Add all clients
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredClients.map((client) => {
              const isAssigned = assignedClientIds.has(client.id);
              return (
                <button
                  key={client.id}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border/50 ${
                    isAssigned ? "opacity-50" : ""
                  }`}
                  disabled={isAssigned || assignClient.isPending}
                  onClick={() => assignClient.mutate(client.id)}
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={client.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {getInitials(client.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {client.full_name || "Unnamed"}
                      {isAssigned && <span className="text-muted-foreground ml-1">· Added</span>}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                  </div>
                </button>
              );
            })}

            {filteredClients.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No clients found</p>
            )}
          </div>
        </div>

        {/* Right: assigned clients */}
        <div className="flex-1 flex flex-col">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-foreground">
              Assigned Clients ({assignedAccess?.length || 0})
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto">
            {(!assignedAccess || assignedAccess.length === 0) ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <Users className="h-8 w-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No clients selected</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Search and add clients to make the collection available for
                </p>
              </div>
            ) : (
              assignedAccess.map((access: any) => {
                const client = access.profiles;
                return (
                  <div
                    key={access.id}
                    className="flex items-center gap-3 px-4 py-3 border-b border-border/50 group"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={client?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {getInitials(client?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {client?.full_name || "Unnamed"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{client?.email}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      onClick={() => removeClient.mutate(access.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
