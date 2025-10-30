import { useEffect, useState } from "react";
import { supabase, getUserOrWarn, toastError } from "../lib/supabase";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Dialog";

/**
 * Matches page. Lists study groups that the user can join and any
 * outstanding invites (if your schema includes an `invites` table).
 * Provides buttons to join a group directly. This is a simple
 * placeholder for a more sophisticated matching algorithm—here we
 * just show all groups the user is not already a member of.
 */
export default function Matches() {
  const [myGroupIds, setMyGroupIds] = useState<string[]>([]);
  const [allGroups, setAllGroups] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  // Load the groups the user belongs to and all available groups
  useEffect(() => {
    let alive = true;
    (async () => {
      const user = await getUserOrWarn(); if (!user) { setLoading(false); return; }
      const { data: gm } = await supabase.from("group_members").select("group_id").eq("user_id", user.id);
      const ids = (gm || []).map((g: any) => g.group_id);
      setMyGroupIds(ids);
      const { data: gs } = await supabase.from("study_groups").select("id, name");
      if (!alive) return;
      setAllGroups((gs || []) as any);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  async function join(id: string) {
    if (joining) return;
    const user = await getUserOrWarn(); if (!user) return;
    setJoining(id);
    try {
      const { error } = await supabase.from("group_members").insert({ group_id: id, user_id: user.id });
      if (error) throw error;
      setMyGroupIds(ids => [...ids, id]);
      (window as any).notify?.("Joined group");
    } catch (e) { toastError(e); }
    finally { setJoining(null); }
  }

  const available = allGroups.filter(g => !myGroupIds.includes(g.id));

  return (
    <Card className="p-4">
      <h2 className="mb-3 text-xl font-bold">Find study groups</h2>
      {loading ? (
        <div>Loading…</div>
      ) : (
        <>
          {/* Create group button */}
          <div className="mb-3 flex justify-end">
            <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>Create group</Button>
          </div>
          {available.length === 0 ? (
            <div>No groups available to join right now. Check back later!</div>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {available.map(g => (
                <li key={g.id} className="flex items-center justify-between rounded-xl border border-white/15 bg-white/5 p-3">
                  <div className="text-[15px] font-semibold">{g.name}</div>
                  <Button size="sm" onClick={() => join(g.id)} loading={joining === g.id}>Join</Button>
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
          <input className="input bg-white/10 text-white" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Study Group A" />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setCreateOpen(false); setNewGroupName(""); }}>Cancel</Button>
            <Button onClick={async () => {
              const name = newGroupName.trim(); if (!name) return (window as any).notify?.("Enter a group name", "error");
              const user = await getUserOrWarn(); if (!user) return;
              setJoining("create");
              try {
                const { data, error } = await supabase.from("study_groups").insert({ name }).select("*");
                if (error) throw error;
                const group = data?.[0];
                // Join the group automatically
                const { error: e2 } = await supabase.from("group_members").insert({ group_id: group.id, user_id: user.id });
                if (e2) throw e2;
                setMyGroupIds(ids => [...ids, group.id]);
                setAllGroups(gs => [...gs, group]);
                setCreateOpen(false);
                setNewGroupName("");
                (window as any).notify?.("Group created and joined");
              } catch (err) { toastError(err); }
              finally { setJoining(null); }
            }} loading={joining === "create"}>Create</Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}