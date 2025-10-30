import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Button } from "./ui/Button";
import { Sparkles, Menu, X } from "lucide-react";

export function Nav() {
  const { pathname } = useLocation();
  const [uid, setUid] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => mounted && setUid(data.user?.id || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUid(session?.user?.id || null);
    });
    return () => { sub.subscription.unsubscribe(); mounted = false; };
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    setUid(null);
    nav("/");
  }

  function linkCls(path: string) {
    const active = pathname === path;
    return "rounded-lg px-3 py-2 text-sm font-medium transition " + (active ? "bg-cyan-500/15 text-cyan-400" : "text-white/75 hover:text-white hover:bg-white/5");
  }

  function handleMobileLink() {
    setMobileMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-30 mb-6 glass">
      <div className="container-max">
        <div className="flex items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 font-extrabold tracking-tight text-white">
              <Sparkles size={20} className="text-cyan-400" />
              <span>StudySocial</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              <Link to="/" className={linkCls("/")}>Home</Link>
              <Link to="/groups" className={linkCls("/groups")}>Groups</Link>
              <Link to="/chat" className={linkCls("/chat")}>Chat</Link>
              <Link to="/calendar" className={linkCls("/calendar")}>Calendar</Link>
              <Link to="/timer" className={linkCls("/timer")}>Timer</Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            {!uid ? (
              <Link to="/auth">
                <Button size="sm" className="bg-cyan-600 hover:bg-cyan-500">Login / Register</Button>
              </Link>
            ) : (
              <>
                <Link to="/profile" className="hidden md:block">
                  <Button variant="outline" size="sm">Profile</Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={logout} className="hidden md:block">Logout</Button>
              </>
            )}
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden rounded-lg p-2 text-white hover:bg-white/10 transition"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/10 animate-in slide-in-from-top-2">
            <nav className="flex flex-col gap-2">
              <Link to="/" className={linkCls("/")} onClick={handleMobileLink}>🏠 Home</Link>
              <Link to="/groups" className={linkCls("/groups")} onClick={handleMobileLink}>👥 Groups</Link>
              <Link to="/chat" className={linkCls("/chat")} onClick={handleMobileLink}>💬 Chat</Link>
              <Link to="/calendar" className={linkCls("/calendar")} onClick={handleMobileLink}>📅 Calendar</Link>
              <Link to="/timer" className={linkCls("/timer")} onClick={handleMobileLink}>⏱️ Timer</Link>
              {uid && (
                <>
                  <Link to="/profile" className={linkCls("/profile")} onClick={handleMobileLink}>👤 Profile</Link>
                  <button
                    onClick={() => { logout(); handleMobileLink(); }}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-left text-white/75 hover:text-white hover:bg-white/5 transition"
                  >
                    🚪 Logout
                  </button>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}