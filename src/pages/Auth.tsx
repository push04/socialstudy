import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, toastError } from "../lib/supabase";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
// Note: avoid importing lucide-react icons to prevent runtime bundling issues
// If you wish to add icons, import them here and pass via leftIcon prop on Button.
// For now we omit icons to ensure the login/register page always renders.
// import { Mail, UserPlus, LogIn } from "lucide-react";

/**
 * Authentication page for SocialStudy. Supports magic link sign‑in and
 * traditional email/password flows. After a sign‑in or sign‑up, the
 * user is redirected to their profile. While awaiting network requests
 * the buttons show a loading state.
 */
export default function Auth() {
  const [magicEmail, setMagicEmail] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  // Handle magic‑link / PKCE return: exchange code for a session
  useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href);
        const hasCode = url.searchParams.get("code");
        if (!hasCode) return;
        try {
          // modern signature (object)
          // @ts-ignore
          const { error } = await supabase.auth.exchangeCodeForSession({ code: hasCode });
          if (error) throw error;
        } catch {
          // fallback signature (string)
          // @ts-ignore
          const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (error) throw error;
        }
        // Clean the URL and redirect
        window.history.replaceState({}, "", "/auth");
        (window as any).notify?.("Logged in via magic link");
        nav("/profile");
      } catch (e) { toastError(e); }
    })();
  }, [nav]);

  async function doMagic() {
    try {
      if (!magicEmail) return (window as any).notify?.("Enter email", "error");
      setLoading(true);
      const { error } = await supabase.auth.signInWithOtp({
        email: magicEmail,
        options: { emailRedirectTo: `${window.location.origin}/auth` },
      });
      if (error) throw error;
      (window as any).notify?.("Magic link sent");
    } catch (e) { toastError(e); }
    finally { setLoading(false); }
  }

  async function doSignUp() {
    try {
      if (!email || !password) return (window as any).notify?.("Enter email & password", "error");
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth` },
      });
      if (error) throw error;
      if (data.session) { (window as any).notify?.("Signed up"); nav("/profile"); }
      else { (window as any).notify?.("Check your email to confirm your account"); }
    } catch (e) { toastError(e); }
    finally { setLoading(false); }
  }

  async function doSignIn() {
    try {
      if (!email || !password) return (window as any).notify?.("Enter email & password", "error");
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.session) {
        (window as any).notify?.("Welcome back!");
        nav("/profile");
      }
    } catch (e) { toastError(e); }
    finally { setLoading(false); }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Welcome to StudySocial</h1>
        <p className="text-white/75">Sign in or create an account to get started</p>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Continue with Magic Link</h2>
          <div className="space-y-3">
            <div>
              <label className="label mb-2 block">Email address</label>
              <Input
                placeholder="you@example.edu"
                value={magicEmail}
                onChange={(e) => setMagicEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && doMagic()}
              />
            </div>
            <Button onClick={doMagic} loading={loading} className="w-full bg-cyan-600 hover:bg-cyan-500">
              Send magic link
            </Button>
          </div>
          <p className="mt-3 text-xs text-white/60 text-center">
            Check your inbox for a secure sign-in link
          </p>
        </Card>
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Email & Password</h2>
          <div className="space-y-3">
            <div>
              <label className="label mb-2 block">Email address</label>
              <Input
                placeholder="you@example.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="label mb-2 block">Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && doSignIn()}
              />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Button onClick={doSignIn} loading={loading} className="w-full bg-cyan-600 hover:bg-cyan-500">
              Sign in
            </Button>
            <Button variant="outline" onClick={doSignUp} loading={loading} className="w-full">
              Create account
            </Button>
          </div>
        </Card>
      </div>
      <div className="mt-8 p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500/10 to-white/5 text-center">
        <p className="text-sm text-white/75">
          By signing in, you agree to crush your goals together with study partners who share your drive for success.
        </p>
      </div>
    </div>
  );
}