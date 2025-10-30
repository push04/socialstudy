import { useEffect, useState } from "react";
import { supabase, toastError, getUserOrWarn } from "../lib/supabase";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";

// Profile shape in the database. The courses array and study_style field
// are optional and may be null when the profile is first created.
type Profile = {
  id: string;
  full_name: string | null;
  time_zone: string | null;
  avatar_url: string | null;
  courses: string[] | null;
  study_style: string | null;
  bio?: string | null;
  interests?: string[] | null;
  availability?: string | null;
  major?: string | null;
};

// Attempt to detect the browser time zone. If not available, default to IST.
function detectTz() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
  } catch { return "Asia/Kolkata"; }
}

/**
 * Profile page. Loads (or creates) the user's profile record on mount.
 * Provides inputs to edit full name, time zone, courses, and study style.
 * Saves the profile back to Supabase when the user clicks save.
 */
export default function ProfilePage() {
  const [p, setP] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const u = await getUserOrWarn(); if (!u) return;
      const { data, error } = await supabase.from("profiles").select("*").eq("id", u.id).single();
      if (error && error.code !== "PGRST116") { toastError(error); return; }
      let prof = data as Profile | null;
      const tz = detectTz() || "Asia/Kolkata";
      if (!prof) {
        // Create minimal profile with default time zone
        const { data: created, error: e2 } = await supabase.from("profiles").insert({ id: u.id, time_zone: tz }).select("*").single();
        if (e2) { toastError(e2); return; }
        prof = created as any;
      } else if (!prof.time_zone) {
        await supabase.from("profiles").update({ time_zone: tz }).eq("id", u.id);
        prof.time_zone = tz;
      }
      setP(prof);
    })();
  }, []);

  async function save() {
    if (!p) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        full_name: p.full_name,
        time_zone: p.time_zone || detectTz(),
        courses: p.courses || [],
        study_style: p.study_style || null,
        bio: p.bio || null,
        interests: p.interests || [],
        availability: p.availability || null,
        major: p.major || null,
      }).eq("id", p.id);
      if (error) throw error;
      (window as any).notify?.("Profile saved");
    } catch (e) { toastError(e); }
    finally { setSaving(false); }
  }

  if (!p) return <Card className="p-4">Loading…</Card>;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h2 className="mb-4 text-xl font-bold">Your profile</h2>
        <div className="grid gap-4">
          {/* Basic Info */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm text-white/80">Full name</label>
              <Input value={p.full_name || ""} onChange={(e) => setP({ ...p, full_name: e.target.value })} placeholder="John Doe" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm text-white/80">Major</label>
              <Input value={p.major || ""} onChange={(e) => setP({ ...p, major: e.target.value })} placeholder="Computer Science" />
            </div>
          </div>

          {/* Bio */}
          <div className="grid gap-2">
            <label className="text-sm text-white/80">Bio</label>
            <textarea 
              className="input bg-white/10 text-white min-h-20 resize-y" 
              value={p.bio || ""} 
              onChange={(e) => setP({ ...p, bio: e.target.value })} 
              placeholder="Tell others about yourself and your study goals..."
            />
          </div>

          {/* Courses & Interests */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm text-white/80">Courses (comma separated)</label>
              <Input placeholder="CS101, MA202, PHY110" value={(p.courses || []).join(", ")} onChange={(e) => setP({ ...p, courses: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
            </div>
            <div className="grid gap-2">
              <label className="text-sm text-white/80">Interests (comma separated)</label>
              <Input placeholder="AI, Web Dev, Algorithms" value={(p.interests || []).join(", ")} onChange={(e) => setP({ ...p, interests: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
            </div>
          </div>

          {/* Study Preferences */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm text-white/80">Study style</label>
              <select className="select bg-white/10 text-white" value={p.study_style || ""} onChange={(e) => setP({ ...p, study_style: e.target.value })}>
                <option value="">Select style</option>
                <option value="quiet">Quiet / independent</option>
                <option value="interactive">Interactive / discussion</option>
                <option value="pomodoro">Pomodoro focused</option>
                <option value="group">Group study</option>
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm text-white/80">Availability</label>
              <select className="select bg-white/10 text-white" value={p.availability || ""} onChange={(e) => setP({ ...p, availability: e.target.value })}>
                <option value="">Select availability</option>
                <option value="mornings">Mornings (6AM - 12PM)</option>
                <option value="afternoons">Afternoons (12PM - 6PM)</option>
                <option value="evenings">Evenings (6PM - 12AM)</option>
                <option value="flexible">Flexible</option>
              </select>
            </div>
          </div>

          {/* Time Zone */}
          <div className="grid gap-2">
            <label className="text-sm text-white/80">Time zone</label>
            <select className="select bg-white/10 text-white" value={p.time_zone || "Asia/Kolkata"} onChange={(e) => setP({ ...p, time_zone: e.target.value })}>
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
              <option value={detectTz()}>{detectTz()}</option>
            </select>
            <p className="text-xs text-white/60">Used for session scheduling and calendar display</p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button onClick={save} loading={saving}>💾 Save profile</Button>
          <Button variant="outline" onClick={() => window.location.reload()}>Cancel</Button>
        </div>
      </Card>

      {/* Study Stats */}
      <Card className="p-4">
        <h3 className="mb-3 text-lg font-semibold">Study Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-lg bg-white/5 p-3 border border-white/10 text-center">
            <div className="text-2xl font-bold text-cyan-400">—</div>
            <div className="text-xs text-white/60 mt-1">Total Sessions</div>
          </div>
          <div className="rounded-lg bg-white/5 p-3 border border-white/10 text-center">
            <div className="text-2xl font-bold text-cyan-400">—</div>
            <div className="text-xs text-white/60 mt-1">Study Hours</div>
          </div>
          <div className="rounded-lg bg-white/5 p-3 border border-white/10 text-center">
            <div className="text-2xl font-bold text-cyan-400">—</div>
            <div className="text-xs text-white/60 mt-1">Active Groups</div>
          </div>
          <div className="rounded-lg bg-white/5 p-3 border border-white/10 text-center">
            <div className="text-2xl font-bold text-cyan-400">—</div>
            <div className="text-xs text-white/60 mt-1">Study Streak</div>
          </div>
        </div>
      </Card>
    </div>
  );
}