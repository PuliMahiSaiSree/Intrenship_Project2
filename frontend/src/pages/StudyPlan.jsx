import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarBlank, Clock, BookOpen, DownloadSimple } from "@phosphor-icons/react";
import { toast } from "sonner";

const SUBJECTS = ["Mathematics", "Science", "Programming", "English", "History"];
const LEVELS = ["beginner", "intermediate", "advanced"];

export default function StudyPlan() {
    const [subject, setSubject] = useState("Mathematics");
    const [level, setLevel] = useState("beginner");
    const [goal, setGoal] = useState("Build solid fundamentals");
    const [plan, setPlan] = useState(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        api.get("/study-plan/latest").then(({ data }) => { if (data?.plan) setPlan(data.plan); }).catch(()=>{});
    }, []);

    const generate = async () => {
        setBusy(true);
        try {
            const { data } = await api.post("/study-plan", { subject, level, goal });
            setPlan(data.plan);
            toast.success("Study plan ready!");
        } catch (e) {
            toast.error(e.response?.data?.detail || "Failed to generate plan");
        } finally { setBusy(false); }
    };

    const downloadPdf = () => {
        if (!plan) return;
        const html = `<html><head><title>Study Plan</title>
            <style>body{font-family:Manrope,Arial;padding:30px;color:#111}
            h1{font-family:Outfit;font-size:28px} h2{font-family:Outfit;font-size:18px;margin-top:24px}
            .day{border:1px solid #ddd;padding:16px;border-radius:8px;margin-bottom:12px}
            ul{margin:8px 0;padding-left:20px} li{margin:4px 0}</style></head><body>
            <h1>${subject} · ${level} Study Plan</h1>
            <p>${plan.summary || ""}</p>
            ${(plan.days||[]).map(d => `
                <div class="day"><h2>Day ${d.day}: ${d.title} · ${d.duration_minutes||0} min</h2>
                <b>Topics:</b><ul>${(d.topics||[]).map(t=>`<li>${t}</li>`).join("")}</ul>
                <b>Activities:</b><ul>${(d.activities||[]).map(a=>`<li>${a}</li>`).join("")}</ul></div>`).join("")}
            </body></html>`;
        const w = window.open("", "_blank");
        if (w) { w.document.write(html); w.document.close(); w.print(); }
    };

    return (
        <div data-testid="study-plan-page" className="space-y-6">
            <div className="flex items-end justify-between flex-wrap gap-3">
                <div>
                    <div className="text-[10px] tracking-[0.2em] uppercase font-semibold text-muted-foreground">Planner</div>
                    <h1 className="font-heading font-black text-3xl tracking-tight">7-day study plan</h1>
                </div>
                {plan && (
                    <Button data-testid="download-pdf" variant="outline" onClick={downloadPdf}>
                        <DownloadSimple size={16} className="mr-2" /> Download PDF
                    </Button>
                )}
            </div>

            <Card className="p-5 border-border/60 max-w-3xl">
                <div className="grid sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                        <Label>Subject</Label>
                        <Select value={subject} onValueChange={setSubject}>
                            <SelectTrigger data-testid="plan-subject"><SelectValue /></SelectTrigger>
                            <SelectContent>{SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label>Level</Label>
                        <Select value={level} onValueChange={setLevel}>
                            <SelectTrigger data-testid="plan-level"><SelectValue /></SelectTrigger>
                            <SelectContent>{LEVELS.map((l) => <SelectItem key={l} value={l}>{l[0].toUpperCase()+l.slice(1)}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label>Goal</Label>
                        <Input data-testid="plan-goal" value={goal} onChange={(e) => setGoal(e.target.value)} />
                    </div>
                </div>
                <Button data-testid="generate-plan" className="mt-4" onClick={generate} disabled={busy}>
                    {busy ? "Generating…" : "Generate Plan"}
                </Button>
            </Card>

            {plan && (
                <div className="space-y-3">
                    {plan.summary && (
                        <Card className="p-5 border-border/60">
                            <div className="text-[10px] tracking-[0.2em] uppercase font-semibold text-muted-foreground">Overview</div>
                            <p className="text-sm mt-2 leading-relaxed">{plan.summary}</p>
                        </Card>
                    )}
                    <div className="grid md:grid-cols-2 gap-3">
                        {(plan.days || []).map((d, i) => (
                            <Card data-testid={`day-${d.day || i+1}`} key={i} className="p-5 border-border/60 hover:border-primary/40 transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-md bg-primary/15 flex items-center justify-center text-sm font-bold text-primary">{d.day || i+1}</div>
                                        <h3 className="font-heading font-bold text-lg">{d.title}</h3>
                                    </div>
                                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock size={12} weight="duotone" />{d.duration_minutes || 45}m</span>
                                </div>
                                {d.topics?.length > 0 && (
                                    <div className="mt-2"><div className="text-[10px] tracking-[0.18em] uppercase font-semibold text-muted-foreground mb-1">Topics</div>
                                        <ul className="text-sm space-y-0.5">{d.topics.map((t, j) => <li key={j} className="flex gap-2"><BookOpen size={12} weight="duotone" className="text-primary mt-1" />{t}</li>)}</ul>
                                    </div>
                                )}
                                {d.activities?.length > 0 && (
                                    <div className="mt-3"><div className="text-[10px] tracking-[0.18em] uppercase font-semibold text-muted-foreground mb-1">Activities</div>
                                        <ul className="text-sm space-y-0.5">{d.activities.map((a, j) => <li key={j}>• {a}</li>)}</ul>
                                    </div>
                                )}
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
