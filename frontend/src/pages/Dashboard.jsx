import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
    LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid,
} from "recharts";
import {
    Clock, Trophy, Target, Sparkle, TrendUp, ChartBar, Lightning, GraduationCap,
} from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Stat = ({ icon: Icon, label, value, sub, testid }) => (
    <Card data-testid={testid} className="p-5 border-border/60 hover:border-primary/40 transition-colors">
        <div className="flex items-start justify-between">
            <div>
                <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-semibold">{label}</div>
                <div className="font-heading font-black text-3xl mt-2">{value}</div>
                {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
            </div>
            <div className="w-9 h-9 rounded-md bg-primary/15 flex items-center justify-center">
                <Icon size={18} weight="duotone" className="text-primary" />
            </div>
        </div>
    </Card>
);

export default function Dashboard() {
    const [data, setData] = useState(null);

    useEffect(() => {
        api.get("/dashboard").then(({ data }) => setData(data)).catch(() => {});
    }, []);

    if (!data) return <div data-testid="dashboard-loading" className="text-muted-foreground">Loading dashboard…</div>;
    const { stats, subject_progress, weak_topics, trend, badges, recent_quizzes, user } = data;

    return (
        <div data-testid="dashboard-page" className="space-y-6">
            <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                    <div className="text-xs tracking-[0.2em] uppercase font-semibold text-muted-foreground">Dashboard</div>
                    <h1 className="font-heading font-black text-3xl sm:text-4xl tracking-tight mt-1">
                        Welcome back, <span className="text-primary">{user?.name?.split(" ")[0]}</span>
                    </h1>
                </div>
                <div className="flex gap-2">
                    <Link to="/chat"><Button data-testid="dashboard-cta-chat" variant="outline">Ask AI Tutor</Button></Link>
                    <Link to="/quiz"><Button data-testid="dashboard-cta-quiz">Start Quiz</Button></Link>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Stat testid="stat-xp" icon={Sparkle} label="Total XP" value={stats.xp} sub={`Level: ${stats.level}`} />
                <Stat testid="stat-quizzes" icon={Trophy} label="Quizzes" value={stats.total_quizzes} sub={`${stats.avg_score}% avg`} />
                <Stat testid="stat-study" icon={Clock} label="Study Minutes" value={stats.study_minutes} sub={`${stats.chat_count} chats`} />
                <Stat testid="stat-predict" icon={TrendUp} label="Predicted Score" value={`${stats.predicted_next_score}%`} sub="Next quiz est." />
            </div>

            <div className="grid lg:grid-cols-3 gap-4">
                <Card className="p-5 lg:col-span-2 border-border/60">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <div className="text-[10px] tracking-[0.2em] uppercase font-semibold text-muted-foreground">Performance Trend</div>
                            <h3 className="font-heading font-bold text-lg">Recent quiz scores</h3>
                        </div>
                        <ChartBar size={18} weight="duotone" className="text-primary" />
                    </div>
                    <div className="h-56">
                        {trend.length === 0 ? (
                            <div className="text-sm text-muted-foreground h-full flex items-center justify-center">Take a quiz to see your trend</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trend}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                                    <YAxis stroke="hsl(var(--muted-foreground))" domain={[0, 100]} fontSize={11} />
                                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                                    <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </Card>

                <Card className="p-5 border-border/60">
                    <div className="text-[10px] tracking-[0.2em] uppercase font-semibold text-muted-foreground">Weak Areas</div>
                    <h3 className="font-heading font-bold text-lg mb-3">Focus Topics</h3>
                    {weak_topics.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No weak topics detected yet.</div>
                    ) : (
                        <div className="space-y-2">
                            {weak_topics.slice(0, 6).map((t, i) => (
                                <div key={i} data-testid={`weak-topic-${i}`} className="px-3 py-2 rounded-md bg-destructive/10 border border-destructive/20 text-sm flex items-center gap-2">
                                    <Target size={14} weight="duotone" className="text-destructive" />{t}
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
                <Card className="p-5 border-border/60">
                    <div className="text-[10px] tracking-[0.2em] uppercase font-semibold text-muted-foreground">Subject Progress</div>
                    <h3 className="font-heading font-bold text-lg mb-3">Average scores by subject</h3>
                    {subject_progress.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No data yet.</div>
                    ) : (
                        <div className="space-y-3">
                            {subject_progress.map((s, i) => (
                                <div key={i}>
                                    <div className="flex items-center justify-between text-sm mb-1">
                                        <span className="font-semibold">{s.subject}</span>
                                        <span className="text-muted-foreground">{Math.round(s.avg_score * 100)}%</span>
                                    </div>
                                    <Progress value={s.avg_score * 100} className="h-2" />
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                <Card className="p-5 border-border/60">
                    <div className="text-[10px] tracking-[0.2em] uppercase font-semibold text-muted-foreground">Achievements</div>
                    <h3 className="font-heading font-bold text-lg mb-3">Your Badges</h3>
                    {badges?.length ? (
                        <div className="flex flex-wrap gap-2">
                            {badges.map((b) => (
                                <Badge data-testid={`badge-${b.id}`} key={b.id} className="bg-primary/15 text-primary border border-primary/30 px-3 py-1">
                                    <Lightning size={12} weight="fill" className="mr-1 text-primary" /> {b.name}
                                </Badge>
                            ))}
                        </div>
                    ) : (
                        <div className="text-sm text-muted-foreground">Complete a quiz to earn your first badge.</div>
                    )}
                </Card>
            </div>

            <Card className="p-5 border-border/60">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <div className="text-[10px] tracking-[0.2em] uppercase font-semibold text-muted-foreground">Recent Activity</div>
                        <h3 className="font-heading font-bold text-lg">Last quizzes</h3>
                    </div>
                    <GraduationCap size={18} weight="duotone" className="text-primary" />
                </div>
                {recent_quizzes?.length ? (
                    <div className="space-y-2">
                        {recent_quizzes.map((q, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-md bg-muted/40 border border-border/60">
                                <div className="text-sm">
                                    <div className="font-semibold">{q.subject} · {q.topic}</div>
                                    <div className="text-xs text-muted-foreground">{new Date(q.date).toLocaleDateString()}</div>
                                </div>
                                <div className="text-sm font-bold text-primary">{Math.round(q.score * 100)}%</div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-sm text-muted-foreground">No quizzes yet — start one!</div>
                )}
            </Card>
        </div>
    );
}
