import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResendEmailRequest {
  clientId: string;
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

    const { clientId, loginUrl }: ResendEmailRequest = await req.json();

    console.log("Resending welcome email for client:", clientId);

    // Get client details
    const { data: clientProfile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("email, full_name")
      .eq("id", clientId)
      .single();

    if (profileError || !clientProfile) {
      throw new Error("Client not found");
    }

    // Verify trainer-client relationship
    const { data: relationship, error: relationError } = await supabaseClient
      .from("trainer_clients")
      .select("id")
      .eq("trainer_id", trainer.id)
      .eq("client_id", clientId)
      .single();

    if (relationError || !relationship) {
      throw new Error("Client not found or unauthorized");
    }

    console.log("Sending welcome email to:", clientProfile.email);

    const emailResponse = await resend.emails.send({
      from: "FitCoach Pro <onboarding@resend.dev>",
      to: [clientProfile.email],
      subject: "Welcome to FitCoach Pro - Access Your Account",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                border-radius: 10px 10px 0 0;
                text-align: center;
              }
              .content {
                background: #f9f9f9;
                padding: 30px;
                border-radius: 0 0 10px 10px;
              }
              .credentials {
                background: white;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                border-left: 4px solid #667eea;
              }
              .button {
                display: inline-block;
                background: #667eea;
                color: white;
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 6px;
                margin: 20px 0;
                font-weight: 600;
              }
              .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #ddd;
                color: #666;
                font-size: 14px;
              }
              code {
                background: #f4f4f4;
                padding: 2px 8px;
                border-radius: 4px;
                font-family: 'Courier New', monospace;
                color: #667eea;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Welcome to FitCoach Pro!</h1>
            </div>
            <div class="content">
              <p>Hi ${clientProfile.full_name},</p>
              
              <p>Your trainer has set up an account for you on FitCoach Pro. You can now access your personalized fitness dashboard, track your progress, and view your workout plans.</p>
              
              <div class="credentials">
                <h3>Your Login Email:</h3>
                <p><code>${clientProfile.email}</code></p>
                <p style="margin-top: 15px;"><strong>Note:</strong> If you haven't set up your password yet or forgot it, please use the "Forgot Password" link on the login page to set a new password.</p>
              </div>
              
              <center>
                <a href="${loginUrl}" class="button">Login to Your Account</a>
              </center>
              
              <div class="footer">
                <p>If you have any questions or need assistance, please contact your trainer.</p>
                <p style="margin-top: 10px;">Best regards,<br>The FitCoach Pro Team</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Welcome email sent successfully",
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
    console.error("Error in resend-client-welcome-email function:", error);
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
