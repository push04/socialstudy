import { useEffect, useMemo, useState } from "react";
import Modal from "./Modal";
import { useNavigate } from "react-router-dom";

type Action = { id: string; label: string; hint?: string; to: string };

const ACTIONS: Action[] = [
  { id: "home",     label: "Home",            hint: "Go to landing",    to: "/" },
  { id: "calendar", label: "Calendar",        hint: "Plan sessions",    to: "/calendar" },
  { id: "timer",    label: "Pomodoro",        hint: "Focus mode",       to: "/timer" },
  { id: "groups",   label: "Groups",          hint: "Find your squad",  to: "/groups" },
  { id: "chat",     label: "Chat & Video",    hint: "Coordinate fast",  to: "/chat" },
];

export default function CommandPalette({ open, onClose }:{ open:boolean; onClose:()=>void }){
  const nav = useNavigate();
  const [q, setQ] = useState("");

  useEffect(()=>{
    function onKey(e: KeyboardEvent){
      if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k"){
        e.preventDefault();
        if(open) onClose();
        else (document.getElementById("open-cmd") as HTMLButtonElement | null)?.click();
      }
    }
    document.addEventListener("keydown", onKey);
    return ()=> document.removeEventListener("keydown", onKey);
  },[open, onClose]);

  const results = useMemo(()=>{
    const s = q.trim().toLowerCase();
    if(!s) return ACTIONS;
    return ACTIONS.filter(a => a.label.toLowerCase().includes(s) || (a.hint||"").toLowerCase().includes(s));
  },[q]);

  return (
    <Modal open={open} onClose={onClose} title="Command Palette">
      <div className="space-y-3">
        <input
          autoFocus
          value={q}
          onChange={e=>setQ(e.target.value)}
          placeholder="Type to search…"
          className="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
        />
        <div className="max-h-72 overflow-y-auto rounded-md border border-white/10 divide-y divide-white/10">
          {results.map(r => (
            <button
              key={r.id}
              onClick={()=>{ onClose(); nav(r.to); }}
              className="w-full text-left px-3 py-2 hover:bg-white/10 transition"
            >
              <div className="font-medium">{r.label}</div>
              {r.hint && <div className="text-xs text-white/60">{r.hint}</div>}
            </button>
          ))}
          {results.length === 0 && <div className="px-3 py-2 text-sm text-white/60">No matches</div>}
        </div>
        <div className="text-xs text-white/60">Tip: Press <kbd className="px-1 rounded bg-white/10 border border-white/20">Ctrl</kbd>+<kbd className="px-1 rounded bg-white/10 border border-white/20">K</kbd> to open quickly.</div>
      </div>
    </Modal>
  );
}
