import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useCreateDemoClient() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-demo-client`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create demo client');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Demo Client Created!",
        description: (
          <div className="space-y-2">
            <p>Email: <strong>{data.client.email}</strong></p>
            <p>Password: <strong>{data.client.password}</strong></p>
            <p className="text-xs text-muted-foreground mt-2">
              Save these credentials to test the client view
            </p>
          </div>
        ),
        duration: 10000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}