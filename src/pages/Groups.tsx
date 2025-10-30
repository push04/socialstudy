import { useEffect, useState } from "react";
import { supabase, getUserOrWarn, toastError } from "../lib/supabase";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Dialog";

/**
 * Groups page with enhanced functionality.
 *
 * Users can create new groups with a required six‑character join code and
 * optional description. When creating a group the current user is set as
 * the admin (via the `created_by` column) and automatically added as a
 * member. Each group card shows the admin’s name and join code.
 *
 * Users can also join an existing group by entering its join code in the
 * join field. This prevents accidentally joining a group without knowing
 * the code. Groups the user already belongs to are filtered out of the
 * “available to join” list.
 */
export default function Groups() {
  // IDs of groups the current user belongs to
  const [myGroupIds, setMyGroupIds] = useState<string[]>([]);
  // All groups, enriched with unique key and admin name
  const [groups, setGroups] = useState<{ id: string; name: string; unique_key: string; admin_name: string | null; member_count?: number }[]>([]);
  const [loading, setLoading] = useState(true);
  // Join code input for joining by code
  const [joinCode, setJoinCode] = useState("");
  // Search filter
  const [searchTerm, setSearchTerm] = useState("");
  // Controls for creating a group
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCode, setNewCode] = useState(() => randomCode());
  // Track which group ID is currently being joined or created to show loading state
  const [busyId, setBusyId] = useState<string | null>(null);

  // Generate a random alphanumeric code (6 chars) for group joining
  function randomCode() {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let out = "";
    for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  // Load the current user's memberships and all groups
  useEffect(() => {
    let mounted = true;
    (async () => {
      const user = await getUserOrWarn();
      if (!user) { setLoading(false); return; }
      // Fetch group IDs the user belongs to
      const { data: gm } = await supabase.from("group_members").select("group_id").eq("user_id", user.id);
      const ids = (gm || []).map((r: any) => r.group_id);
      if (!mounted) return;
      setMyGroupIds(ids);
      // Fetch all groups with unique_key and admin name; use profile join to resolve admin name
      const { data: gs, error } = await supabase
        .from("study_groups")
        .select("id, name, unique_key, created_by, profiles!study_groups_created_by_fkey(display_name, email)");
      if (error) console.error(error);
      const list = (gs || []).map((g: any) => ({
        id: g.id,
        name: g.name,
        unique_key: g.unique_key ?? "",
        admin_name: g.profiles?.display_name || g.profiles?.email || null,
      }));
      if (mounted) setGroups(list);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  // Join a group by ID (from the list)
  async function joinGroup(id: string) {
    if (busyId) return;
    const user = await getUserOrWarn(); if (!user) return;
    setBusyId(id);
    try {
      const { error } = await supabase.from("group_members").insert({ group_id: id, user_id: user.id });
      if (error) throw error;
      setMyGroupIds((ids) => [...ids, id]);
      (window as any).notify?.("Joined group", "success");
    } catch (err) { toastError(err); }
    finally { setBusyId(null); }
  }

  // Join by code: look up the group by unique_key then call joinGroup
  async function joinByCode() {
    const code = joinCode.trim().toLowerCase();
    if (!code) return (window as any).notify?.("Enter a join code", "error");
    const user = await getUserOrWarn(); if (!user) return;
    try {
      const { data, error } = await supabase.from("study_groups").select("id, unique_key").eq("unique_key", code).maybeSingle();
      if (error) throw error;
      if (!data) return (window as any).notify?.("No group found with that code", "error");
      // If already a member, just notify
      if (myGroupIds.includes(data.id)) {
        (window as any).notify?.("You are already a member of that group", "info");
        setJoinCode("");
        return;
      }
      await joinGroup(data.id);
      setJoinCode("");
    } catch (err) { toastError(err); }
  }

  // Create a new group with unique_key and description; auto‑join creator
  async function createGroup() {
    const name = newName.trim();
    if (!name) return (window as any).notify?.("Enter a group name", "error");
    const code = newCode.trim().toLowerCase();
    if (code.length < 6) return (window as any).notify?.("Join code must be at least 6 characters", "error");
    const user = await getUserOrWarn(); if (!user) return;
    setBusyId("create");
    try {
      const { data, error } = await supabase.from("study_groups").insert({ name, unique_key: code, description: newDesc || null, created_by: user.id }).select("id, name, unique_key");
      if (error) throw error;
      const group = data?.[0];
      // add membership
      const { error: joinErr } = await supabase.from("group_members").insert({ group_id: group.id, user_id: user.id });
      if (joinErr) throw joinErr;
      setMyGroupIds((ids) => [...ids, group.id]);
      setGroups((gs) => [...gs, { id: group.id, name: name, unique_key: code, admin_name: user.email ?? null }]);
      setCreateOpen(false);
      setNewName("");
      setNewDesc("");
      setNewCode(randomCode());
      (window as any).notify?.("Group created and joined", "success");
    } catch (err) { toastError(err); }
    finally { setBusyId(null); }
  }

  // Filter out groups the user is already a member of and apply search
  const available = groups
    .filter((g) => !myGroupIds.includes(g.id))
    .filter((g) => !searchTerm || g.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <Card className="p-4">
      <h2 className="mb-3 text-xl font-bold">Study groups</h2>
      {loading ? (
        <div>Loading…</div>
      ) : (
        <>
          {/* Top actions: create group and join by code */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>Create group</Button>
            <div className="flex flex-wrap items-center gap-2">
              <input 
                className="input w-48 bg-white/10 text-white" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                placeholder="🔍 Search groups..." 
              />
              <input className="input w-36 bg-white/10 text-white lowercase tracking-wide" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))} placeholder="Join code" />
              <Button size="sm" variant="ghost" onClick={joinByCode}>Join</Button>
            </div>
          </div>
          {available.length === 0 ? (
            <div className="text-white/70">No groups available to join. Create one!</div>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {available.map((g) => (
                <li key={g.id} className="flex flex-col gap-2 rounded-xl border border-white/15 bg-white/5 p-3 hover:bg-white/10 transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="text-[15px] font-semibold">{g.name}</div>
                        {g.admin_name ? <span className="badge bg-primary/20 border-primary/30 text-primary-400 text-[10px]">Admin: {g.admin_name}</span> : null}
                      </div>
                      <div className="text-xs text-white/60 mt-1 font-mono">
                        Code: {g.unique_key || "—"}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => joinGroup(g.id)} loading={busyId === g.id}>Join</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {/* Create group modal */}
      <Modal open={createOpen} onOpenChange={setCreateOpen} title="Create group">
        <div className="grid gap-3">
          <label className="text-sm text-white/80">Group name</label>
          <input className="input bg-white/10 text-white" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Study Group" />
          <label className="text-sm text-white/80">Description (optional)</label>
          <input className="input bg-white/10 text-white" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="e.g. Exam prep for Math 101" />
          <label className="text-sm text-white/80">Unique join code</label>
          <div className="flex items-center gap-2">
            <input className="input flex-1 bg-white/10 text-white lowercase tracking-wide font-mono" value={newCode} onChange={(e) => setNewCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))} placeholder="e.g. math101spring" />
            <Button size="sm" variant="ghost" onClick={() => setNewCode(randomCode())}>Random</Button>
          </div>
          <p className="text-xs text-white/60">Members can join using this code</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setCreateOpen(false); setNewName(""); setNewDesc(""); setNewCode(randomCode()); }}>Cancel</Button>
            <Button onClick={createGroup} loading={busyId === "create"}>Create</Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}