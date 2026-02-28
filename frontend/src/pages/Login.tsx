import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export default function Login() {
  const { login, token, isReady } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const redirectTo = useMemo(() => (location.state as { from: string })?.from || "/dashboard", [location.state]);

  useEffect(() => {
    if (!isReady) return;
    if (token) navigate("/dashboard", { replace: true });
  }, [isReady, token, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email.trim(), password);
      toast.success("Logged in");
      navigate(redirectTo, { replace: true });
    } catch (err: unknown) {
      let msg = "Login failed";
      if (err && typeof err === 'object' && 'detail' in err) {
        const detail = (err as { detail: unknown }).detail;
        msg = typeof detail === 'string' ? detail : JSON.stringify(detail);
      }
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-6">
      {/* premium background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
      <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-28 -right-28 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.10),transparent_40%),radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.08),transparent_45%)]" />

      <Card className="w-full max-w-md relative border-white/10 bg-white/5 text-white shadow-2xl backdrop-blur-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl tracking-tight">CI ERP</CardTitle>
          <p className="text-sm text-white/70">Sign in to continue</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm text-white/80">Email</label>
              <Input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@cierp.com"
                className="bg-white/10 border-white/10 text-white placeholder:text-white/40"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm text-white/80">Password</label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/10 border-white/10 text-white placeholder:text-white/40"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
