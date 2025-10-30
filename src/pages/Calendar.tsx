import { useEffect, useMemo, useState } from "react";
import { supabase, getUserOrWarn } from "../lib/supabase";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Dialog";
import { Calendar as CalIcon, Plus, ExternalLink } from "lucide-react";

// Types for groups and sessions. A session may include a nested
// study_groups object containing the name for display.
type Group = { id: string; name: string };
type S = { id: string; group_id: string; title: string | null; start_at: string; end_at: string; study_groups?: { name: string } | null };

// Utility: format a Date or ISO string into IST (India Standard Time) with
// medium date and short time. Used throughout the calendar.
function ist(dt: string | Date) {
  const d = typeof dt === "string" ? new Date(dt) : dt;
  return d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
}
function pad(n: number) { return String(n).padStart(2, "0"); }
// Convert a date to Google Calendar's UTC format (YYYYMMDDTHHMMSSZ)
function toGCalDate(d: Date) {
  const u = new Date(d.getTime());
  return u.getUTCFullYear()
    + pad(u.getUTCMonth() + 1)
    + pad(u.getUTCDate())
    + "T" + pad(u.getUTCHours()) + pad(u.getUTCMinutes()) + pad(u.getUTCSeconds()) + "Z";
}
// Build a Google Calendar link for quick export. The details param can
// include arbitrary text; here we just use "SocialStudy" as a marker.
function gcalLink({ title, start, end, details }: { title: string; start: Date; end: Date; details: string; }) {
  const base = "https://calendar.google.com/calendar/render?action=TEMPLATE";
  const params = new URLSearchParams({ text: title, dates: `${toGCalDate(start)}/${toGCalDate(end)}`, details });
  return `${base}&${params.toString()}`;
}
// Create a 6x7 matrix of dates for a given month (Monday‑start). This
// includes spillover days from adjacent months as needed.
function monthMatrix(year: number, month: number) {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  const weeks: Date[][] = [];
  for (let w = 0; w < 6; w++) {
    const row: Date[] = [];
    for (let d = 0; d < 7; d++) {
      row.push(new Date(start));
      start.setDate(start.getDate() + 1);
    }
    weeks.push(row);
  }
  return weeks;
}

/**
 * Calendar page. Users can view sessions in a month view or agenda list.
 * They can filter by group and quickly schedule new sessions. Each session
 * has an "Add to Google Calendar" link rather than generating an .ics file.
 */
export default function Calendar() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [gid, setGid] = useState<string>("");
  const [sessions, setSessions] = useState<S[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"month" | "week" | "agenda">("month");
  const [ym, setYm] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState<string>("");
  const [newStart, setNewStart] = useState<string>("18:00");
  const [newEnd, setNewEnd] = useState<string>("20:00");

  function handleDateClick(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    setNewDate(`${year}-${month}-${day}`);
    setCreating(true);
  }

  // On mount, load groups and sessions
  useEffect(() => {
    let alive = true;
    (async () => {
      const u = await getUserOrWarn(); if (!u) { setLoading(false); return; }
      const { data: gm } = await supabase.from("group_members").select("group_id, study_groups(id, name)").eq("user_id", u.id);
      const gs = (gm || []).map((x: any) => ({ id: x.study_groups.id, name: x.study_groups.name }));
      setGroups(gs);
      setGid(gs[0]?.id || "");
      const { data } = await supabase
        .from("study_sessions")
        .select("id, group_id, title, start_at, end_at, study_groups(name)")
        .in("group_id", gs.map(g => g.id))
        .order("start_at", { ascending: true });
      if (!alive) return;
      setSessions((data || []).map((s: any) => ({
        id: s.id,
        group_id: s.group_id,
        title: s.title,
        start_at: s.start_at,
        end_at: s.end_at,
        study_groups: s.study_groups?.[0] || null
      })));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => gid ? sessions.filter(s => s.group_id === gid) : sessions, [sessions, gid]);

  async function createSession() {
    if (!gid) return (window as any).notify?.("Select a group", "error");
    if (!newDate) return (window as any).notify?.("Choose a date", "error");
    const [sh, sm] = newStart.split(":").map(Number);
    const [eh, em] = newEnd.split(":").map(Number);
    const d = new Date(newDate + "T00:00:00");
    const start = new Date(d); start.setHours(sh, sm, 0, 0);
    const end = new Date(d); end.setHours(eh, em, 0, 0);
    try {
      const { data, error } = await supabase.from("study_sessions").insert({
        group_id: gid,
        title: newTitle || null,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
      }).select("*");
      if (error) throw error;
      setSessions(x => [...x, ...(data as any[])]);
      setCreating(false);
      setNewTitle(""); setNewDate(""); setNewStart("18:00"); setNewEnd("20:00");
      (window as any).notify?.("Session scheduled");
    } catch (e) { console.error(e); (window as any).notify?.("Failed to create session", "error"); }
  }

  // Build dictionary of sessions by day (timestamp keyed)
  const weeks = monthMatrix(ym.y, ym.m);
  const byDay = new Map<number, S[]>();
  for (const s of filtered) {
    const dt = new Date(s.start_at);
    const key = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(s);
  }
  const agenda = filtered.filter(s => new Date(s.start_at) >= new Date());

  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="text-lg font-semibold">Calendar</div>
          <CalIcon size={18} className="text-white/70" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="select bg-white/10 text-white" value={gid} onChange={e => setGid(e.target.value)}>
            <option value="">All groups</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <select className="select bg-white/10 text-white" value={view} onChange={e => setView(e.target.value as any)}>
            <option value="month">Month</option>
            <option value="agenda">Agenda</option>
            <option value="week">Week</option>
          </select>
          <Button onClick={() => setCreating(true)}><Plus size={16} /> Schedule</Button>
        </div>
      </div>
      {/* Month view */}
      {view === "month" ? (
        <div className="rounded-xl border border-white/15 bg-white/5 p-2">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-white/90 font-semibold">
              {new Date(ym.y, ym.m).toLocaleString("en-IN", { month: "long", year: "numeric" })}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setYm(({ y, m }) => ({ y: m === 0 ? y - 1 : y, m: m === 0 ? 11 : m - 1 }))}>Prev</Button>
              <Button variant="ghost" onClick={() => { const d = new Date(); setYm({ y: d.getFullYear(), m: d.getMonth() }); }}>Today</Button>
              <Button variant="ghost" onClick={() => setYm(({ y, m }) => ({ y: m === 11 ? y + 1 : y, m: m === 11 ? 0 : m + 1 }))}>Next</Button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-[1px] rounded-lg bg-white/10">
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
              <div key={d} className="bg-white/10 p-2 text-center text-xs text-white/70">{d}</div>
            ))}
            {weeks.flat().map((d, i) => {
              const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
              const inMonth = d.getMonth() === ym.m;
              const items = byDay.get(key) || [];
              return (
                <div 
                  key={i} 
                  onClick={() => handleDateClick(d)}
                  className={"min-h-24 rounded-md p-2 cursor-pointer transition-all " + (inMonth ? "bg-white/5 hover:bg-white/10" : "bg-black/10 hover:bg-white/5")}
                  title="Click to schedule a session"
                > 
                  <div className="mb-1 text-xs font-semibold text-white/80">{d.getDate()}</div>
                  <div className="flex flex-col gap-1">
                    {items.slice(0, 3).map(s => (
                      <a key={s.id} href={gcalLink({ title: s.title || (s.study_groups?.name ? `Study: ${s.study_groups.name}` : "Study session"), start: new Date(s.start_at), end: new Date(s.end_at), details: "SocialStudy" })} target="_blank" rel="noopener" className="truncate rounded bg-white/10 px-2 py-1 text-xs text-white/90 hover:bg-white/20">
                        {new Date(s.start_at).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })} — {s.title || "Study session"}
                      </a>
                    ))}
                    {items.length > 3 ? <div className="text-[11px] text-white/60">+{items.length - 3} more</div> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : view === "week" ? (
        // Week view - show current week with time slots
        <div className="rounded-xl border border-white/15 bg-white/5 p-4">
          <p className="text-white/60 text-center py-8">Week view: Shows current week's sessions</p>
          <div className="space-y-2">
            {agenda.slice(0, 10).map(s => (
              <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/5 p-3 border border-white/10">
                <div>
                  <div className="text-xs text-white/60">{s.study_groups?.name || "Study"}</div>
                  <div className="font-semibold">{s.title || "Session"}</div>
                  <div className="text-sm text-white/70">{ist(s.start_at)}</div>
                </div>
                <a href={gcalLink({ title: s.title || "Study", start: new Date(s.start_at), end: new Date(s.end_at), details: "SocialStudy" })} target="_blank" rel="noopener" className="text-xs text-primary hover:underline">
                  Add to Cal
                </a>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Agenda view
        <div className="rounded-xl border border-white/15 bg-white/5">
          {!agenda.length ? <div className="p-3 text-white/70">No upcoming sessions.</div> : null}
          {agenda.map(s => (
            <div key={s.id} className="flex items-center justify-between gap-3 border-b border-white/10 p-3 last:border-none">
              <div>
                <div className="text-sm text-white/70">{s.study_groups?.name || "Group"}</div>
                <div className="text-[15px] font-semibold">{s.title || "Study session"}</div>
              </div>
              <div className="text-[15px] text-white">{ist(s.start_at)} — {ist(s.end_at)}</div>
              <a
                title="Add to Google Calendar"
                href={gcalLink({ title: s.title || (s.study_groups?.name ? `Study: ${s.study_groups.name}` : "Study session"), start: new Date(s.start_at), end: new Date(s.end_at), details: "SocialStudy" })}
                target="_blank" rel="noopener"
                className="rounded-lg border border-white/20 px-2 py-1 text-sm text-white/90 hover:bg-white/10"
              >
                <ExternalLink size={14} className="inline -mt-0.5" /> Add
              </a>
            </div>
          ))}
        </div>
      )}
      {/* Scheduling modal */}
      <Modal open={creating} onOpenChange={setCreating} title="Schedule a session">
        <div className="grid gap-2">
          <label className="text-sm text-white/80">Group</label>
          <select className="select bg-white/10 text-white" value={gid} onChange={(e) => setGid(e.target.value)}>
            <option value="">Select group</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <label className="text-sm text-white/80">Title (optional)</label>
          <input className="input bg-white/10 text-white" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Exam prep, lab review…" />
          <label className="text-sm text-white/80">Date</label>
          <input className="input bg-white/10 text-white" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm text-white/80">Start</label>
              <input className="input bg-white/10 text-white" type="time" value={newStart} onChange={(e) => setNewStart(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-white/80">End</label>
              <input className="input bg-white/10 text-white" type="time" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
            </div>
          </div>
          <div className="mt-2 flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
            <Button onClick={createSession}>Create</Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}