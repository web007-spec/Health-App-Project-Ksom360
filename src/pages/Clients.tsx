import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, MessageSquare, TrendingUp, Plus, Settings, CheckSquare, Mail, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { AddClientDialog } from "@/components/AddClientDialog";
import { ClientListItem } from "@/components/ClientListItem";
import { useIsMobile } from "@/hooks/use-mobile";
import { ClientStatusDialog } from "@/components/ClientStatusDialog";
import { AssignTaskDialog } from "@/components/AssignTaskDialog";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Clients() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const isMobile = useIsMobile();
  const [addClientDialogOpen, setAddClientDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [assignTaskDialogOpen, setAssignTaskDialogOpen] = useState(false);
  const [selectedClientForTask, setSelectedClientForTask] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<{
    id: string;
    status: "active" | "paused" | "pending";
    name: string;
  } | null>(null);

  const resendEmailMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const loginUrl = `${window.location.origin}/auth`;
      const { data, error } = await supabase.functions.invoke("resend-client-welcome-email", {
        body: {
          clientId,
          loginUrl,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error("Failed to send email");

      return data;
    },
    onSuccess: (_, clientId) => {
      const client = clients?.find(c => c.client_id === clientId);
      toast({
        title: "Email sent",
        description: `Welcome email has been resent to ${client?.client?.full_name || "client"}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send welcome email",
        variant: "destructive",
      });
    },
  });

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
    <Card 
      className="hover:shadow-lg transition-all group border-border/60 cursor-pointer"
      onClick={() => navigate(`/clients/${client.client_id}`)}
    >
      <CardContent className="p-0">
        {/* Header with avatar and status */}
        <div className="flex items-center gap-4 p-5 pb-4">
          <Avatar className="h-12 w-12 ring-2 ring-border">
            <AvatarImage src={client.client?.avatar_url} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {client.client?.full_name?.charAt(0) || "C"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground">
              {client.client?.full_name || "New Client"}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge 
                variant="secondary"
                className={`${statusColors[client.status as keyof typeof statusColors]} text-xs px-2 py-0 shrink-0`}
              >
                {client.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground break-all mt-0.5">
              {client.client?.email}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border/60 mx-5" />

        {/* Actions row */}
        <div className="p-4 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1">
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-9 w-9 text-muted-foreground hover:text-primary"
              title="Message"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-9 w-9 text-muted-foreground hover:text-primary"
              title="Assign Task"
              onClick={() => {
                setSelectedClientForTask(client.client_id);
                setAssignTaskDialogOpen(true);
              }}
            >
              <CheckSquare className="h-4 w-4" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-9 w-9 text-muted-foreground hover:text-primary"
              title="Workout History"
              onClick={() => navigate(`/clients/${client.client_id}/workout-history`)}
            >
              <TrendingUp className="h-4 w-4" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-9 w-9 text-muted-foreground hover:text-primary"
              title="Health"
              onClick={() => navigate(`/clients/${client.client_id}/health`)}
            >
              <Heart className="h-4 w-4" />
            </Button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:text-foreground">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[100] bg-background border-border w-56">
              <DropdownMenuItem
                onClick={() => {
                  setSelectedClient({
                    id: client.id,
                    status: client.status,
                    name: client.client?.full_name || "Client",
                  });
                  setStatusDialogOpen(true);
                }}
              >
                <Settings className="h-4 w-4 mr-2" />
                Change Status
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => resendEmailMutation.mutate(client.client_id)}
                disabled={resendEmailMutation.isPending}
              >
                <Mail className="h-4 w-4 mr-2" />
                Resend Welcome Email
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Footer */}
        <div className="px-5 pb-4 pt-0">
          <p className="text-xs text-muted-foreground">
            Joined {new Date(client.assigned_at).toLocaleDateString()}
          </p>
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
            ) : isMobile ? (
              <Card>
                <CardContent className="p-1 divide-y divide-border">
                  {allClients.map((client) => (
                    <ClientListItem key={client.id} client={client} />
                  ))}
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
            ) : isMobile ? (
              <Card>
                <CardContent className="p-1 divide-y divide-border">
                  {activeClients.map((client) => (
                    <ClientListItem key={client.id} client={client} />
                  ))}
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
            ) : isMobile ? (
              <Card>
                <CardContent className="p-1 divide-y divide-border">
                  {pausedClients.map((client) => (
                    <ClientListItem key={client.id} client={client} />
                  ))}
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

      {/* Assign Task Dialog */}
      {selectedClientForTask && (
        <AssignTaskDialog
          clientId={selectedClientForTask}
          open={assignTaskDialogOpen}
          onOpenChange={setAssignTaskDialogOpen}
        />
      )}
    </DashboardLayout>
  );
}