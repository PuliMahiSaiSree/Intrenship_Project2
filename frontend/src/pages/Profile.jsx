import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const SUBJECTS = ["Mathematics", "Science", "Programming", "English", "History"];
const LEVELS = ["beginner", "intermediate", "advanced"];

export default function Profile() {
    const { user, refresh } = useAuth();
    const [level, setLevel] = useState(user?.level || "beginner");
    const [goal, setGoal] = useState(user?.goal || "");
    const [subs, setSubs] = useState(user?.preferred_subjects || []);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (user) { setLevel(user.level); setGoal(user.goal || ""); setSubs(user.preferred_subjects || []); }
    }, [user]);

    const save = async () => {
        setBusy(true);
        try {
            await api.put("/profile", { skill_level: level, goal, preferred_subjects: subs });
            await refresh();
            toast.success("Profile updated");
        } catch (e) {
            toast.error(e.response?.data?.detail || "Save failed");
        } finally { setBusy(false); }
    };

    const toggleSub = (s) => {
        setSubs((cur) => cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]);
    };

    return (
        <div data-testid="profile-page" className="space-y-6 max-w-3xl">
            <div>
                <div className="text-[10px] tracking-[0.2em] uppercase font-semibold text-muted-foreground">Settings</div>
                <h1 className="font-heading font-black text-3xl tracking-tight">Your Profile</h1>
            </div>
            <Card className="p-6 border-border/60 space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label>Name</Label>
                        <Input data-testid="profile-name" value={user?.name || ""} disabled />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Email</Label>
                        <Input data-testid="profile-email" value={user?.email || ""} disabled />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <Label>Default skill level</Label>
                    <Select value={level} onValueChange={setLevel}>
                        <SelectTrigger data-testid="profile-level"><SelectValue /></SelectTrigger>
                        <SelectContent>{LEVELS.map((l) => <SelectItem key={l} value={l}>{l[0].toUpperCase()+l.slice(1)}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <Label>Learning goal</Label>
                    <Input data-testid="profile-goal" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Ace AP Calculus" />
                </div>
                <div className="space-y-2">
                    <Label>Preferred subjects</Label>
                    <div className="flex flex-wrap gap-3">
                        {SUBJECTS.map((s) => (
                            <label key={s} className="flex items-center gap-2 px-3 py-2 rounded-md border border-border/60 cursor-pointer hover:bg-muted">
                                <Checkbox data-testid={`pref-${s}`} checked={subs.includes(s)} onCheckedChange={() => toggleSub(s)} />
                                <span className="text-sm">{s}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <Button data-testid="profile-save" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
            </Card>
        </div>
    );
}
