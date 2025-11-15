import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, MessageSquare, TrendingUp, Plus, Settings } from "lucide-react";
import { useState } from "react";
import { AddClientDialog } from "@/components/AddClientDialog";
import { ClientStatusDialog } from "@/components/ClientStatusDialog";

export default function Clients() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [addClientDialogOpen, setAddClientDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<{
    id: string;
    status: "active" | "paused" | "pending";
    name: string;
  } | null>(null);

  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainer_clients")
        .select(`
          *,
          client:profiles!trainer_clients_client_id_fkey(*)
        `)
        .eq("trainer_id", user?.id)
        .order("assigned_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const filteredClients = clients?.filter((client) =>
    client.client?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.client?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeClients = filteredClients?.filter(c => c.status === "active") || [];
  const pausedClients = filteredClients?.filter(c => c.status === "paused") || [];
  const allClients = filteredClients || [];

  const statusColors = {
    active: "bg-green-500/10 text-green-700 dark:text-green-400",
    paused: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    pending: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  };

  const ClientCard = ({ client }: any) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={client.client?.avatar_url} />
            <AvatarFallback className="bg-primary/10 text-primary text-lg">
              {client.client?.full_name?.charAt(0) || "C"}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-lg truncate">
                  {client.client?.full_name || "New Client"}
                </h3>
                <p className="text-sm text-muted-foreground truncate">
                  {client.client?.email}
                </p>
              </div>
              <Badge className={statusColors[client.status as keyof typeof statusColors]}>
                {client.status}
              </Badge>
            </div>

            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 gap-2">
                <MessageSquare className="h-4 w-4" />
                Message
              </Button>
              <Button size="sm" variant="outline" className="flex-1 gap-2">
                <TrendingUp className="h-4 w-4" />
                Progress
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => {
                  setSelectedClient({
                    id: client.id,
                    status: client.status,
                    name: client.client?.full_name || "Client",
                  });
                  setStatusDialogOpen(true);
                }}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-3 text-xs text-muted-foreground">
              Joined {new Date(client.assigned_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Clients</h1>
            <p className="text-muted-foreground mt-1">Manage your client relationships</p>
          </div>
          <Button className="gap-2" onClick={() => setAddClientDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Client
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">
              All Clients ({allClients.length})
            </TabsTrigger>
            <TabsTrigger value="active">
              Active ({activeClients.length})
            </TabsTrigger>
            <TabsTrigger value="paused">
              Paused ({pausedClients.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading clients...</p>
              </div>
            ) : allClients.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No clients found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {allClients.map((client) => (
                  <ClientCard key={client.id} client={client} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            {activeClients.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No active clients</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeClients.map((client) => (
                  <ClientCard key={client.id} client={client} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="paused" className="space-y-4">
            {pausedClients.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No paused clients</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pausedClients.map((client) => (
                  <ClientCard key={client.id} client={client} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Client Dialog */}
      <AddClientDialog
        open={addClientDialogOpen}
        onOpenChange={setAddClientDialogOpen}
      />

      {/* Client Status Dialog */}
      {selectedClient && (
        <ClientStatusDialog
          open={statusDialogOpen}
          onOpenChange={setStatusDialogOpen}
          clientRelationId={selectedClient.id}
          currentStatus={selectedClient.status}
          clientName={selectedClient.name}
        />
      )}
    </DashboardLayout>
  );
}