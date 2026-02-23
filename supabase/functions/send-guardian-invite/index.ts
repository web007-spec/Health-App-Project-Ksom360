import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GuardianInviteRequest {
  guardianEmail: string;
  athleteName: string;
  token: string;
  appUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { guardianEmail, athleteName, token, appUrl }: GuardianInviteRequest = await req.json();

    const viewUrl = `${appUrl}/guardian/${token}`;

    const emailResponse = await resend.emails.send({
      from: "KSOM360 <noreply@ksom-360.app>",
      to: [guardianEmail],
      subject: `KSOM360 Athletic — Weekly Recovery Summary for ${athleteName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; background: #1e3a5f; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
              .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>KSOM360 Athletic</h1>
              <p>Weekly Recovery Summary Access</p>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>You have been invited by ${athleteName}'s coach to view their weekly recovery summary. This provides an overview of training readiness, sleep quality, and recovery habits.</p>
              <p>This is a read-only view — no account creation is required.</p>
              <center>
                <a href="${viewUrl}" class="button">View Recovery Summary</a>
              </center>
              <p style="font-size: 13px; color: #888;">This link expires in 7 days. If you need continued access, please contact the coach.<br/>Direct link: ${viewUrl}</p>
              <div class="footer">
                <p>This summary contains aggregated wellness data only. No detailed workout logs, nutrition data, or private notes are included.</p>
                <p style="color: #999; font-size: 12px;">If you did not expect this email, please disregard it.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (emailResponse?.error) {
      throw new Error(emailResponse.error.message || "Failed to send guardian invite");
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending guardian invite:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
