import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Loader2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function Auth() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<"main" | "signin" | "admin">("main");

  const [signInData, setSignInData] = useState({ email: "", password: "" });
  const [adminPin, setAdminPin] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: signInData.email,
        password: signInData.password,
      });
      if (error) throw error;

      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, full_name")
          .eq("id", data.user.id)
          .single();

        toast.success("Signed in successfully!");
        if (profile?.role === "client") {
          if (!profile.full_name || profile.full_name.trim() === "") {
            navigate("/client/onboarding");
          } else {
            navigate("/client/dashboard");
          }
        } else {
          navigate("/");
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPin.trim()) {
      toast.error("Please enter your PIN");
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-pin-login", {
        body: { pin: adminPin.trim() },
      });

      if (error) throw error;
      if (!data?.token_hash) {
        throw new Error(data?.error || "Invalid PIN");
      }

      // Use the token to verify OTP and sign in
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: data.token_hash,
        type: "magiclink",
      });

      if (verifyError) throw verifyError;

      toast.success("Welcome back!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Invalid PIN");
    } finally {
      setIsLoading(false);
      setAdminPin("");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="KSOM360" className="h-20 w-20 rounded-2xl object-contain mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-foreground">KSOM360</h1>
          <p className="text-muted-foreground mt-2">Your complete fitness coaching platform</p>
        </div>

        {mode === "main" && (
          <div className="space-y-3">
            <Button
              className="w-full h-14 text-lg gap-3"
              onClick={() => setMode("admin")}
            >
              <Shield className="h-5 w-5" />
              Admin Access
            </Button>
            <Button
              variant="outline"
              className="w-full h-12"
              onClick={() => setMode("signin")}
            >
              Sign In with Email
            </Button>
          </div>
        )}

        {mode === "admin" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setMode("main")}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <CardTitle className="text-lg">Admin Access</CardTitle>
                  <CardDescription>Enter your PIN to sign in</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdminPin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-pin">PIN Code</Label>
                  <Input
                    id="admin-pin"
                    type="password"
                    placeholder="Enter your PIN"
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Enter"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {mode === "signin" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setMode("main")}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <CardTitle className="text-lg">Sign In</CardTitle>
                  <CardDescription>Enter your email and password</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="your@email.com"
                    value={signInData.email}
                    onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={signInData.password}
                    onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="w-full text-sm text-muted-foreground"
                  onClick={async () => {
                    if (!signInData.email) {
                      toast.error("Please enter your email address first");
                      return;
                    }
                    setIsLoading(true);
                    try {
                      const { error } = await supabase.auth.resetPasswordForEmail(signInData.email, {
                        redirectTo: `${window.location.origin}/auth`,
                      });
                      if (error) throw error;
                      toast.success("Password reset link sent! Check your email.");
                    } catch (error: any) {
                      toast.error(error.message || "Failed to send reset link");
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  disabled={isLoading}
                >
                  Forgot Password?
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
