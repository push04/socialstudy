import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Users, MessageSquare, Calendar, Clock, Video, Sparkles } from "lucide-react";

type Session = { id: string; group_id: string; title: string | null; start_at: string; end_at: string; };

export default function Home() {
  const [uid, setUid] = useState<string | null>(null);
  const [next, setNext] = useState<Session | null>(null);
  const [streak, setStreak] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // On mount, fetch the current user and if present load their sessions
  useEffect(() => {
    let alive = true;
    (async () => {
      const u = await supabase.auth.getUser();
      const user = u.data.user ?? null;
      if (!alive) return;
      setUid(user?.id || null);
      if (!user) { setLoading(false); return; }

      // Fetch group memberships for the user
      const { data: gm } = await supabase.from("group_members").select("group_id").eq("user_id", user.id);
      const groupIds = (gm || []).map((g: any) => g.group_id);
      if (!groupIds.length) { setLoading(false); return; }

      // Next upcoming session
      const { data: ss } = await supabase
        .from("study_sessions")
        .select("id, group_id, title, start_at, end_at")
        .in("group_id", groupIds)
        .gte("start_at", new Date().toISOString())
        .order("start_at", { ascending: true })
        .limit(1);
      setNext(ss?.[0] || null);

      // Calculate streak: number of consecutive days with a completed session
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data: history } = await supabase
        .from("study_sessions")
        .select("end_at")
        .in("group_id", groupIds)
        .gte("end_at", since.toISOString())
        .lt("end_at", new Date().toISOString())
        .order("end_at", { ascending: false });
      const days = new Set((history || []).map((r: any) => new Date(new Date(r.end_at).toDateString()).getTime()));
      let s = 0;
      const today = new Date();
      for (let i = 0; i < 60; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        if (days.has(new Date(d.toDateString()).getTime())) s++; else break;
      }
      setStreak(s);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const isAuthed = !!uid;

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-8 md:p-12 shadow-glass animate-fade-in">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxkZWZzPjxwYXR0ZXJuIGlkPSJncmlkIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPjxwYXRoIGQ9Ik0gNDAgMCBMIDAgMCAwIDQwIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoNiwxODIsMjEyLDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40"></div>
        <div className="relative grid items-center gap-8 md:grid-cols-2">
          <div className="animate-slide-up">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-3 py-1 text-sm font-medium text-cyan-400 border border-cyan-500/20">
              <Sparkles size={14} />
              <span>StudySocial</span>
            </div>
            <h1 className="text-balance text-4xl font-extrabold leading-tight tracking-tight md:text-5xl lg:text-6xl">
              Crush goals. <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-300">Together.</span>
            </h1>
            <p className="mt-4 text-base md:text-lg text-white/80 leading-relaxed">
              Find study partners matched to your courses, schedule, and style. Collaborate in real-time with chat, video rooms, and an advanced Pomodoro timer.
            </p>
            {!isAuthed ? (
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/auth">
                  <Button size="lg" className="bg-cyan-600 hover:bg-cyan-500">Get started</Button>
                </Link>
                <a href="#features" className="inline-block">
                  <Button variant="outline" size="lg">See how matching works</Button>
                </a>
              </div>
            ) : (
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/groups">
                  <Button size="lg" className="bg-cyan-600 hover:bg-cyan-500">Find study buddies</Button>
                </Link>
                <Link to="/chat">
                  <Button variant="outline" size="lg">Open chat</Button>
                </Link>
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="badge">
                <Users size={12} className="mr-1" />
                Smart Matching
              </div>
              <div className="badge">
                <MessageSquare size={12} className="mr-1" />
                Realtime Chat
              </div>
              <div className="badge">
                <Video size={12} className="mr-1" />
                Video Rooms
              </div>
              <div className="badge">
                <Clock size={12} className="mr-1" />
                Pomodoro
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-5 col-span-2">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-cyan-500/10">
                  <Calendar size={20} className="text-cyan-400" />
                </div>
                <div className="text-sm font-medium text-white/80">Next session</div>
              </div>
              <div className="text-lg font-semibold">
                {loading ? "Loading..." : next
                  ? new Date(next.start_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })
                  : "No upcoming sessions"}
              </div>
            </Card>
            <Card className="p-5">
              <div className="text-sm text-white/80 mb-2">Current streak</div>
              <div className="text-3xl font-bold text-cyan-400">
                {loading ? "—" : streak}
              </div>
              <p className="text-xs text-white/60 mt-1">day{streak === 1 ? "" : "s"}</p>
            </Card>
            <Card className="p-5">
              <div className="text-sm text-white/80 mb-2">Quick access</div>
              <Link to="/calendar">
                <Button variant="ghost" size="sm" className="w-full">
                  <Calendar size={14} className="mr-1" />
                  Calendar
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </section>

      <section id="features" className="scroll-mt-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
          Everything you need to <span className="text-cyan-400">study smarter</span>
        </h2>
        <div className="grid-3 gap-5">
          <Card className="p-6 group">
            <div className="mb-4 p-3 rounded-xl bg-cyan-500/10 inline-block group-hover:bg-cyan-500/20 transition">
              <Users size={24} className="text-cyan-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Smart Matching</h3>
            <p className="text-white/75 leading-relaxed">
              Get paired with study partners based on your courses, schedule, and study style. Our algorithm finds compatible peers who share your goals.
            </p>
          </Card>
          <Card className="p-6 group">
            <div className="mb-4 p-3 rounded-xl bg-cyan-500/10 inline-block group-hover:bg-cyan-500/20 transition">
              <MessageSquare size={24} className="text-cyan-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Realtime Chat & Reactions</h3>
            <p className="text-white/75 leading-relaxed">
              Coordinate study sessions with instant messaging. React with emojis, share resources, and stay connected with your group.
            </p>
          </Card>
          <Card className="p-6 group">
            <div className="mb-4 p-3 rounded-xl bg-cyan-500/10 inline-block group-hover:bg-cyan-500/20 transition">
              <Video size={24} className="text-cyan-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Video Rooms</h3>
            <p className="text-white/75 leading-relaxed">
              Jump into face-to-face study sessions with built-in video rooms. Screen sharing, recording, and more.
            </p>
          </Card>
          <Card className="p-6 group">
            <div className="mb-4 p-3 rounded-xl bg-cyan-500/10 inline-block group-hover:bg-cyan-500/20 transition">
              <Clock size={24} className="text-cyan-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Advanced Pomodoro</h3>
            <p className="text-white/75 leading-relaxed">
              Stay focused with customizable work/break intervals, ambient sounds, and fullscreen mode. Track your productivity over time.
            </p>
          </Card>
          <Card className="p-6 group">
            <div className="mb-4 p-3 rounded-xl bg-cyan-500/10 inline-block group-hover:bg-cyan-500/20 transition">
              <Calendar size={24} className="text-cyan-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Smart Calendar</h3>
            <p className="text-white/75 leading-relaxed">
              Plan group sessions with drag-and-drop scheduling. Auto-detects your time zone and exports to Google Calendar.
            </p>
          </Card>
          <Card className="p-6 group">
            <div className="mb-4 p-3 rounded-xl bg-cyan-500/10 inline-block group-hover:bg-cyan-500/20 transition">
              <Sparkles size={24} className="text-cyan-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Groups & Roles</h3>
            <p className="text-white/75 leading-relaxed">
              Create study groups with unique join codes. Admins can manage settings, but everyone can start video calls.
            </p>
          </Card>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500/10 to-white/5 p-8 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            Built with Supabase, Vite & Tailwind
          </h2>
          <p className="text-white/75 mb-6">
            A modern, secure platform designed for students who want to achieve more together.
          </p>
          {!isAuthed && (
            <Link to="/auth">
              <Button size="lg" className="bg-cyan-600 hover:bg-cyan-500">
                Get started for free
              </Button>
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}