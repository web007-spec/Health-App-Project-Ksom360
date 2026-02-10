import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateClientRequest {
  email: string;
  fullName: string;
  password: string;
  loginUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authenticated trainer
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify the trainer is authenticated
    const {
      data: { user: trainer },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !trainer) {
      throw new Error("Unauthorized");
    }

    const { email, fullName, password, loginUrl }: CreateClientRequest = await req.json();

    console.log("Creating client:", { email, fullName, trainerId: trainer.id });

    // Create the Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Create the client user with admin privileges (doesn't auto-login)
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password: password.trim(),
      email_confirm: true,
      user_metadata: {
        full_name: fullName.trim(),
        role: "client",
      },
    });

     if (createError) {
       console.error("Error creating user:", createError);
       // Duplicate email: report as a non-200 error *payload* so the UI can show a friendly message
       if (
         createError.message?.includes("already been registered") ||
         createError.message?.includes("email_exists") ||
         createError.code === "email_exists"
       ) {
         return new Response(
           JSON.stringify({
             success: false,
             error: "A client with this email address already exists. Please use a different email address.",
           }),
           {
             status: 200,
             headers: {
               "Content-Type": "application/json",
               ...corsHeaders,
             },
           }
         );
       }
       throw createError;
     }

    if (!authData.user) {
      throw new Error("Failed to create user account");
    }

    console.log("User created:", authData.user.id);

    // Create trainer-client relationship using admin client
    const { error: relationError } = await supabaseAdmin
      .from("trainer_clients")
      .insert({
        trainer_id: trainer.id,
        client_id: authData.user.id,
        status: "active",
      });

    if (relationError) {
      console.error("Error creating trainer-client relationship:", relationError);
      throw relationError;
    }

    console.log("Trainer-client relationship created");

    // Generate a password reset link so we don't send the password in plain text
    let emailSent = false;
    let emailErrorMessage: string | null = null;

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email.trim(),
      options: {
        redirectTo: loginUrl,
      },
    });

    if (linkError) {
      console.error("Failed to generate login link:", linkError);
      emailErrorMessage = "Failed to generate login link";
    } else {
      // Send welcome email with magic link instead of password
      const { data: emailData, error: emailError } = await supabaseAdmin.functions.invoke(
        "send-client-welcome-email",
        {
          body: {
            email: email.trim(),
            fullName: fullName.trim(),
            loginLink: linkData?.properties?.action_link || loginUrl,
            loginUrl,
          },
        }
      );

      if (emailError) {
        console.error("Failed to send welcome email:", emailError);
        emailErrorMessage = "Failed to send welcome email";
      } else if (emailData?.success) {
        emailSent = true;
      } else {
        emailErrorMessage = emailData?.error || "Failed to send welcome email";
        console.error("Welcome email not sent:", emailErrorMessage);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId: authData.user.id,
        emailSent,
        emailErrorMessage,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in create-client function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
