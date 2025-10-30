import { useEffect, useRef, useState } from "react";
import { supabase, toastError, getUserOrWarn } from "../lib/supabase";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { VideoRoom } from "../components/VideoRoom";
import logo from "../assets/logo.svg";

// Predefined set of emoji reactions available for messages
const EMOJIS = ["👍", "🔥", "🎯", "🎉", "💪", "🧠", "📚", "⏰", "✅", "🥳"];

/**
 * Chat page. Allows users to pick a group, view messages in realtime via
 * Supabase’s realtime API, send messages, react with emojis, and start
 * a video room. Messages align left/right based on the current user.
 */
export default function Chat() {
  const [groups, setGroups] = useState<any[]>([]);
  const [gid, setGid] = useState<string>("");
  const [msgs, setMsgs] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [videoOpen, setVideoOpen] = useState(false);
  // Track whether the current user is the admin of the selected group. We
  // still compute this even though all members can open the video room.
  const [isAdmin, setIsAdmin] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<any>(null);

  // Fetch groups the current user is a member of
  async function myGroups() {
    const u = await getUserOrWarn(); if (!u) return [];
    const { data } = await supabase
      .from("group_members")
      .select("group_id, study_groups(id, name, created_by)")
      .eq("user_id", u.id);
    return (data || []).map((m: any) => m.study_groups);
  }
  // Load messages for a given group
  async function loadMessages(id: string) {
    const { data } = await supabase.from("messages").select("*, profiles(full_name, avatar_url)").eq("group_id", id).order("created_at", { ascending: true });
    setMsgs(data || []);
    // Scroll to bottom after a slight delay to allow DOM to update
    setTimeout(() => boxRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }), 50);
  }
  // On mount, load groups
  useEffect(() => { (async () => { setGroups(await myGroups()); })(); }, []);
  // Subscribe to realtime messages when gid changes
  useEffect(() => {
    if (!gid) return;
    // Load messages and check admin status whenever the group changes
    (async () => {
      await loadMessages(gid);
      // Determine if the current user is the admin of this group
      try {
        const u = await getUserOrWarn(); if (!u) { setIsAdmin(false); return; }
        const { data: gdata } = await supabase.from("study_groups").select("created_by").eq("id", gid).maybeSingle();
        setIsAdmin(gdata?.created_by === u.id);
      } catch {
        setIsAdmin(false);
      }
    })();
    // Subscribe to realtime inserts for messages in this group
    if (subRef.current) supabase.removeChannel(subRef.current);
    subRef.current = supabase.channel("realtime:messages").on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `group_id=eq.${gid}` }, p => {
      setMsgs(x => [...x, p.new]);
      setTimeout(() => boxRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }), 30);
    }).subscribe();
    return () => { if (subRef.current) supabase.removeChannel(subRef.current); };
  }, [gid]);
  // React to a message with an emoji
  async function react(message_id: number, emoji: string) {
    try {
      const u = await getUserOrWarn(); if (!u) return;
      await supabase.from("message_reactions").upsert({ message_id, user_id: u.id, emoji });
    } catch (e) { toastError(e); }
  }

  // Format message timestamp with relative dates
  function formatTimestamp(date: string) {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  }
  return (
    <Card className="p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <label className="text-sm text-white/85" htmlFor="groupSel">Group</label>
        <select id="groupSel" className="select w-64 bg-white/10 text-white" value={gid} onChange={e => setGid(e.target.value)}>
          <option value="">Select group</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        {/* Start the video room. Any member can open the room. If the user is the
            admin of the group, show a badge to indicate their role. */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            disabled={!gid}
            title={!gid ? "Select a group" : "Open video room"}
            onClick={() => {
              if (!gid) return (window as any).notify?.("Select a group", "error");
              setVideoOpen(true);
            }}
          >
            Start Video Room
          </Button>
          {gid && isAdmin ? (
            <span className="badge bg-accent/20 text-accent px-2 py-0.5 text-xs">Admin</span>
          ) : null}
        </div>
      </div>
      {/* Messages list */}
      <div ref={boxRef} className="mb-2 flex h-80 flex-col gap-2 overflow-auto rounded-xl border border-white/15 bg-white/10 p-2 text-white">
        {msgs.map((m) => (
          <div key={m.id} className={"chat-bubble " + ((window as any).__uid === m.user_id ? "chat-me" : "chat-them")}> 
            <div className="mb-1 flex items-center gap-2 text-sm text-white/80">
              <img className="h-6 w-6 rounded-full border border-white/20" src={m.profiles?.avatar_url || logo} alt="" />
              <span className="font-semibold">{m.profiles?.full_name || "Anon"}</span>
              <span className="text-xs opacity-60">{formatTimestamp(m.created_at)}</span>
            </div>
            <div className="whitespace-pre-wrap">{m.content}</div>
            <div className="mt-1 flex flex-wrap items-center gap-1">
              {EMOJIS.map(e => <button key={e} className="badge hover:bg-white/20" onClick={() => react(m.id, e)}>{e}</button>)}
            </div>
          </div>
        ))}
      </div>
      {/* Input box */}
      <div className="flex items-center gap-2">
        <input 
          className="input bg-white/10 text-white placeholder:text-white/60" 
          placeholder="Write a message…" 
          value={input} 
          onChange={e => setInput(e.target.value)}
          onKeyDown={async (e) => {
          if (e.key === "Enter") {
            const gid2 = gid; if (!gid2) return;
            const u = await getUserOrWarn(); if (!u) return;
            try {
              await supabase.from("messages").insert({ group_id: gid2, content: input, user_id: u.id });
              setInput("");
            } catch (e) { toastError(e); }
          }
        }} />
        <Button onClick={async () => {
          const gid2 = gid; if (!gid2) return;
          const u = await getUserOrWarn(); if (!u) return;
          try {
            await supabase.from("messages").insert({ group_id: gid2, content: input, user_id: u.id });
            setInput("");
          } catch (e) { toastError(e); }
        }}>Send</Button>
      </div>
      {/* Video room overlay */}
      <VideoRoom open={videoOpen} roomKey={gid || "adhoc"} onClose={() => setVideoOpen(false)} />
    </Card>
  );
}