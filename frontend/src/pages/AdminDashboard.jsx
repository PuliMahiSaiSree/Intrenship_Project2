import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Users, ChatCircle, Brain, ChartLineUp } from "@phosphor-icons/react";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const Stat = ({ icon: Icon, label, value, testid }) => (
    <Card data-testid={testid} className="p-5 border-border/60">
        <div className="flex items-start justify-between">
            <div>
                <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-semibold">{label}</div>
                <div className="font-heading font-black text-3xl mt-2">{value}</div>
            </div>
            <div className="w-9 h-9 rounded-md bg-primary/15 flex items-center justify-center"><Icon size={18} weight="duotone" className="text-primary" /></div>
        </div>
    </Card>
);

export default function AdminDashboard() {
    const [analytics, setAnalytics] = useState(null);
    const [students, setStudents] = useState([]);
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        api.get("/admin/analytics").then(({ data }) => setAnalytics(data)).catch(()=>{});
        api.get("/admin/students").then(({ data }) => setStudents(data.items)).catch(()=>{});
        api.get("/admin/logs?limit=50").then(({ data }) => setLogs(data.items)).catch(()=>{});
    }, []);

    return (
        <div data-testid="admin-page" className="space-y-6">
            <div>
                <div className="text-[10px] tracking-[0.2em] uppercase font-semibold text-muted-foreground">Admin</div>
                <h1 className="font-heading font-black text-3xl tracking-tight">Platform analytics</h1>
            </div>

            {analytics && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Stat testid="admin-stat-users" icon={Users} label="Students" value={analytics.total_users} />
                    <Stat testid="admin-stat-quizzes" icon={Brain} label="Quizzes Taken" value={analytics.total_quizzes} />
                    <Stat testid="admin-stat-chats" icon={ChatCircle} label="AI Interactions" value={analytics.total_chats} />
                    <Stat testid="admin-stat-avg" icon={ChartLineUp} label="Avg Score" value={`${analytics.avg_score}%`} />
                </div>
            )}

            <Tabs defaultValue="students" className="w-full">
                <TabsList>
                    <TabsTrigger data-testid="admin-tab-students" value="students">Students</TabsTrigger>
                    <TabsTrigger data-testid="admin-tab-analytics" value="analytics">Subject Analytics</TabsTrigger>
                    <TabsTrigger data-testid="admin-tab-logs" value="logs">AI Logs</TabsTrigger>
                </TabsList>

                <TabsContent value="students">
                    <Card className="border-border/60 overflow-hidden">
                        <div className="grid grid-cols-[1fr_1fr_100px_80px_80px] text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-semibold px-4 py-3 border-b border-border/60 bg-muted/30">
                            <div>Name</div><div>Email</div><div>Level</div><div className="text-right">XP</div><div className="text-right">Badges</div>
                        </div>
                        {students.map((s, i) => (
                            <div key={s.user_id} data-testid={`student-row-${i}`} className="grid grid-cols-[1fr_1fr_100px_80px_80px] px-4 py-3 text-sm border-b border-border/40 last:border-0">
                                <div className="font-semibold">{s.name}</div>
                                <div className="text-muted-foreground">{s.email}</div>
                                <div className="capitalize">{s.level}</div>
                                <div className="text-right text-primary font-bold">{s.xp}</div>
                                <div className="text-right">{s.badges?.length || 0}</div>
                            </div>
                        ))}
                        {students.length === 0 && <div className="p-6 text-sm text-muted-foreground">No students yet.</div>}
                    </Card>
                </TabsContent>

                <TabsContent value="analytics">
                    <Card className="p-5 border-border/60">
                        <h3 className="font-heading font-bold text-lg mb-4">Average score by subject</h3>
                        <div className="h-72">
                            {analytics?.subject_breakdown?.length ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={analytics.subject_breakdown}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                        <XAxis dataKey="subject" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                        <YAxis stroke="hsl(var(--muted-foreground))" domain={[0, 100]} fontSize={12} />
                                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                                        <Bar dataKey="avg_score" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <div className="text-sm text-muted-foreground">No quizzes yet.</div>}
                        </div>
                    </Card>
                </TabsContent>

                <TabsContent value="logs">
                    <Card className="border-border/60 max-h-[600px] overflow-y-auto">
                        {logs.map((l, i) => (
                            <div key={l.id || i} data-testid={`log-${i}`} className="p-4 border-b border-border/40 last:border-0">
                                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                    <span>{l.user_name} · {l.user_email}</span>
                                    <span>{new Date(l.created_at).toLocaleString()}</span>
                                </div>
                                <div className="text-sm font-semibold">[{l.subject} · {l.level}] {l.prompt}</div>
                                <div className="text-sm text-muted-foreground mt-1 line-clamp-3">{l.response}</div>
                            </div>
                        ))}
                        {logs.length === 0 && <div className="p-6 text-sm text-muted-foreground">No interactions yet.</div>}
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
