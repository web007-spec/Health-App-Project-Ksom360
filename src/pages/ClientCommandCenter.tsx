import { DashboardLayout } from "@/components/DashboardLayout";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { ClientOverviewTab } from "@/components/command-center/ClientOverviewTab";
import { ClientTrainingTab } from "@/components/command-center/ClientTrainingTab";
import { ClientTasksTab } from "@/components/command-center/ClientTasksTab";
import { ClientMetricsTab } from "@/components/command-center/ClientMetricsTab";
import { ClientFoodJournalTab } from "@/components/command-center/ClientFoodJournalTab";
import { ClientMacrosTab } from "@/components/command-center/ClientMacrosTab";
import { ClientSettingsTab } from "@/components/command-center/ClientSettingsTab";
import { Skeleton } from "@/components/ui/skeleton";

export default function ClientCommandCenter() {
  const { clientId } = useParams<{ clientId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: clientData, isLoading } = useQuery({
    queryKey: ["client-detail", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainer_clients")
        .select(`
          *,
          client:profiles!trainer_clients_client_id_fkey(*)
        `)
        .eq("trainer_id", user?.id)
        .eq("client_id", clientId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!clientId,
  });

  const statusColors: Record<string, string> = {
    active: "bg-green-500/10 text-green-700 dark:text-green-400",
    paused: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    pending: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!clientData) {
    return (
      <DashboardLayout>
        <div className="p-6 text-center">
          <p className="text-muted-foreground">Client not found</p>
          <Button variant="link" onClick={() => navigate("/clients")}>
            Back to Clients
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const client = clientData.client;
  const clientName = client?.full_name || client?.email || "Client";

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Client Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/clients")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Avatar className="h-14 w-14 ring-2 ring-border">
            <AvatarImage src={client?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
              {clientName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground truncate">{clientName}</h1>
              <Badge
                variant="secondary"
                className={`${statusColors[clientData.status] || ""} text-xs shrink-0`}
              >
                {clientData.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{client?.email}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => navigate("/messages")}
          >
            <MessageSquare className="h-4 w-4" />
            Message
          </Button>
        </div>

        {/* Tabbed Command Center */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="training">Training</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="food-journal">Food Journal</TabsTrigger>
            <TabsTrigger value="macros">Macros</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <ClientOverviewTab clientId={clientId!} trainerId={user?.id!} />
          </TabsContent>
          <TabsContent value="training">
            <ClientTrainingTab clientId={clientId!} trainerId={user?.id!} />
          </TabsContent>
          <TabsContent value="tasks">
            <ClientTasksTab clientId={clientId!} trainerId={user?.id!} />
          </TabsContent>
          <TabsContent value="metrics">
            <ClientMetricsTab clientId={clientId!} />
          </TabsContent>
          <TabsContent value="food-journal">
            <ClientFoodJournalTab clientId={clientId!} />
          </TabsContent>
          <TabsContent value="macros">
            <ClientMacrosTab clientId={clientId!} trainerId={user?.id!} />
          </TabsContent>
          <TabsContent value="settings">
            <ClientSettingsTab clientId={clientId!} trainerId={user?.id!} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
