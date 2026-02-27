import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function Auth() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [tab, setTab] = useState<"signin" | "admin">("signin");
  const [signInData, setSignInData] = useState({ email: "", password: "" });
  const [adminPin, setAdminPin] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, onboarding_completed")
          .eq("id", session.user.id)
          .single();

        if (profile?.role === "client") {
          navigate(!profile.onboarding_completed ? "/client/onboarding" : "/client/dashboard");
        } else {
          navigate("/");
        }
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) checkSession();
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

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
          .select("role, onboarding_completed")
          .eq("id", data.user.id)
          .single();

        toast.success("Signed in successfully!");
        if (profile?.role === "client") {
          navigate(!profile.onboarding_completed ? "/client/onboarding" : "/client/dashboard");
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
      if (!data?.token_hash) throw new Error(data?.error || "Invalid PIN");

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

  const handleForgotPassword = async () => {
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
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="w-full max-w-sm">
        {/* Logo + Branding */}
        <div className="text-center mb-8">
          <img
            src="/logo.png"
            alt="KSOM360"
            className="h-20 w-20 rounded-2xl object-contain mx-auto mb-4 shadow-lg"
          />
          <h1 className="text-3xl font-bold text-foreground">KSOM360</h1>
          <p className="text-muted-foreground mt-1 text-sm">KSOM360 Fitness Coaching Platform</p>
        </div>

        {/* Auth Card */}
        <div className="bg-card rounded-2xl shadow-lg border border-border p-6 space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Welcome</h2>
            <p className="text-muted-foreground text-sm mt-0.5">Sign in to your account</p>
          </div>

          {/* Tab Toggle */}
          <div className="flex bg-muted rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={() => setTab("signin")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === "signin"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setTab("admin")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                tab === "admin"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              Admin PIN
            </button>
          </div>

          {/* Sign In Form */}
          {tab === "signin" && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="trainer@example.com"
                  value={signInData.email}
                  onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                  required
                  className="rounded-xl h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="signin-password">Password</Label>
                <div className="relative">
                  <Input
                    id="signin-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={signInData.password}
                    onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                    required
                    className="pr-10 rounded-xl h-11"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword
                      ? <EyeOff className="h-4 w-4 text-muted-foreground" />
                      : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full h-11 rounded-xl text-base font-semibold" disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</> : "Sign In"}
              </Button>
              <button
                type="button"
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
                onClick={handleForgotPassword}
                disabled={isLoading}
              >
                Forgot Password?
              </button>
            </form>
          )}

          {/* Admin PIN Form */}
          {tab === "admin" && (
            <form onSubmit={handleAdminPin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="admin-pin">PIN Code</Label>
                <Input
                  id="admin-pin"
                  type="password"
                  placeholder="Enter your PIN"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  autoFocus
                  required
                  className="rounded-xl h-11 text-center text-lg tracking-widest"
                />
              </div>
              <Button type="submit" className="w-full h-11 rounded-xl text-base font-semibold" disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying...</> : "Enter"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
