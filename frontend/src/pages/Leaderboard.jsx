import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Trophy, Sparkle, Medal } from "@phosphor-icons/react";
import { useAuth } from "@/contexts/AuthContext";

export default function Leaderboard() {
    const { user } = useAuth();
    const [items, setItems] = useState([]);
    useEffect(() => { api.get("/leaderboard").then(({ data }) => setItems(data.items)).catch(()=>{}); }, []);

    return (
        <div data-testid="leaderboard-page" className="space-y-6">
            <div>
                <div className="text-[10px] tracking-[0.2em] uppercase font-semibold text-muted-foreground">Compete</div>
                <h1 className="font-heading font-black text-3xl tracking-tight flex items-center gap-2">
                    <Trophy size={28} weight="duotone" className="text-primary xp-glow" /> Global Leaderboard
                </h1>
            </div>
            <Card className="p-3 border-border/60">
                {items.length === 0 && <div className="p-6 text-sm text-muted-foreground">No learners yet.</div>}
                {items.map((u, i) => {
                    const isMe = u.user_id === user?.user_id;
                    return (
                        <div
                            key={u.user_id}
                            data-testid={`leader-${i}`}
                            className={`flex items-center gap-4 p-4 rounded-md ${isMe ? "bg-primary/10 border border-primary/30" : "hover:bg-muted"}`}
                        >
                            <div className={`w-10 h-10 rounded-md flex items-center justify-center font-heading font-black text-lg ${
                                i === 0 ? "bg-yellow-400/20 text-yellow-500"
                                : i === 1 ? "bg-slate-300/20 text-slate-300"
                                : i === 2 ? "bg-orange-400/20 text-orange-400"
                                : "bg-muted text-muted-foreground"
                            }`}>
                                {i < 3 ? <Medal size={18} weight="fill" /> : `#${i+1}`}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-semibold">{u.name} {isMe && <span className="text-xs text-primary ml-1">(you)</span>}</div>
                                <div className="text-xs text-muted-foreground uppercase tracking-[0.18em]">{u.level} · {u.badges_count} badges</div>
                            </div>
                            <div className="font-heading font-black text-lg text-primary flex items-center gap-1">
                                <Sparkle size={14} weight="fill" /> {u.xp}
                            </div>
                        </div>
                    );
                })}
            </Card>
        </div>
    );
}
