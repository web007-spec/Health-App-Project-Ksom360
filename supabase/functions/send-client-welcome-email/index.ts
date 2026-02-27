import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  fullName: string;
  loginLink: string;
  loginUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName, loginLink, loginUrl }: WelcomeEmailRequest = await req.json();

    console.log("Sending welcome email to:", email);

    const emailResponse = await resend.emails.send({
      from: "KSOM360 <noreply@ksom-360.app>",
      to: [email],
      subject: "Welcome to FitCoach Pro - Your Account Details",
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
              .info-box {
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
              <p>Hi ${fullName},</p>
              
              <p>Your trainer has created an account for you on FitCoach Pro. You can now access your personalized fitness dashboard, track your progress, and view your workout plans.</p>
              
              <div class="info-box">
                <h3>Your Account:</h3>
                <p><strong>Email:</strong> <code>${email}</code></p>
                <p>Click the button below to sign in and set up your account.</p>
              </div>
              
              <center>
                <a href="${loginLink}" class="button">Sign In to Your Account</a>
              </center>

              <p style="font-size: 13px; color: #888;">If the button doesn't work, copy and paste this link into your browser:<br/>${loginLink}</p>
              
              <div class="footer">
                <p>If you have any questions or need help getting started, please don't hesitate to reach out to your trainer.</p>
                <p style="color: #999; font-size: 12px;">If you didn't expect this email, please contact your trainer or ignore this message.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Email provider response:", emailResponse);

    if (emailResponse?.error) {
      throw new Error(emailResponse.error.message || "Failed to send welcome email");
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
