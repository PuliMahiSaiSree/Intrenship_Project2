import { useState } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, CheckCircle, XCircle, ArrowsClockwise } from "@phosphor-icons/react";
import { toast } from "sonner";

const SUBJECTS = ["Mathematics", "Science", "Programming", "English", "History"];
const LEVELS = ["beginner", "intermediate", "advanced"];

export default function Quiz() {
    const [subject, setSubject] = useState("Mathematics");
    const [level, setLevel] = useState("beginner");
    const [topic, setTopic] = useState("Algebra basics");
    const [count, setCount] = useState(5);
    const [quiz, setQuiz] = useState(null);
    const [answers, setAnswers] = useState({});
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState(null);

    const generate = async () => {
        if (!topic.trim()) { toast.error("Enter a topic"); return; }
        setBusy(true); setResult(null);
        try {
            const { data } = await api.post("/quiz/generate", { subject, topic, level, num_questions: count });
            setQuiz(data);
            setAnswers({});
        } catch (e) {
            toast.error(e.response?.data?.detail || "Failed to generate quiz");
        } finally { setBusy(false); }
    };

    const submit = async () => {
        if (!quiz) return;
        setBusy(true);
        try {
            const { data } = await api.post("/quiz/submit", { quiz_id: quiz.quiz_id, answers });
            setResult(data);
            toast.success(`Scored ${Math.round(data.score * 100)}% · +${data.xp_gain} XP`);
        } catch (e) {
            toast.error(e.response?.data?.detail || "Submit failed");
        } finally { setBusy(false); }
    };

    const reset = () => { setQuiz(null); setAnswers({}); setResult(null); };

    return (
        <div data-testid="quiz-page" className="space-y-6">
            <div>
                <div className="text-[10px] tracking-[0.2em] uppercase font-semibold text-muted-foreground">Quizzes</div>
                <h1 className="font-heading font-black text-3xl tracking-tight">AI-generated practice</h1>
            </div>

            {!quiz && (
                <Card className="p-6 border-border/60 max-w-2xl">
                    <h3 className="font-heading font-bold text-lg mb-4 flex items-center gap-2">
                        <Brain size={20} weight="duotone" className="text-primary" /> Configure your quiz
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>Subject</Label>
                            <Select value={subject} onValueChange={setSubject}>
                                <SelectTrigger data-testid="quiz-subject"><SelectValue /></SelectTrigger>
                                <SelectContent>{SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Level</Label>
                            <Select value={level} onValueChange={setLevel}>
                                <SelectTrigger data-testid="quiz-level"><SelectValue /></SelectTrigger>
                                <SelectContent>{LEVELS.map((l) => <SelectItem key={l} value={l}>{l[0].toUpperCase()+l.slice(1)}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                            <Label>Topic</Label>
                            <Input data-testid="quiz-topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Linear equations, Photosynthesis…" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Number of questions</Label>
                            <Input data-testid="quiz-count" type="number" min={3} max={10} value={count} onChange={(e) => setCount(parseInt(e.target.value || 5))} />
                        </div>
                    </div>
                    <Button data-testid="quiz-generate" className="mt-5" disabled={busy} onClick={generate}>
                        {busy ? "Generating…" : "Generate Quiz"}
                    </Button>
                </Card>
            )}

            {quiz && !result && (
                <Card className="p-6 border-border/60">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-heading font-bold text-lg">{quiz.subject} · {quiz.topic}</h3>
                        <span className="text-xs text-muted-foreground uppercase tracking-[0.18em]">{quiz.level}</span>
                    </div>
                    <div className="space-y-6">
                        {quiz.questions.map((q, idx) => (
                            <div key={q.id} data-testid={`question-${idx}`} className="pb-4 border-b border-border/60 last:border-0">
                                <div className="font-semibold mb-3">{idx + 1}. {q.question}</div>
                                {q.type === "mcq" && q.options ? (
                                    <div className="space-y-2">
                                        {q.options.map((opt, i) => (
                                            <label key={i} className="flex items-start gap-2 cursor-pointer p-2 rounded-md hover:bg-muted">
                                                <input
                                                    data-testid={`q${idx}-opt${i}`}
                                                    type="radio"
                                                    name={q.id}
                                                    value={opt}
                                                    checked={answers[q.id] === opt}
                                                    onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                                                />
                                                <span className="text-sm">{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <Textarea
                                        data-testid={`q${idx}-text`}
                                        rows={q.type === "code" ? 6 : 3}
                                        value={answers[q.id] ?? ""}
                                        onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                                        placeholder={q.type === "code" ? "Paste your code…" : "Your answer…"}
                                        className={q.type === "code" ? "font-mono" : ""}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2 mt-4">
                        <Button data-testid="quiz-submit" onClick={submit} disabled={busy}>{busy ? "Grading…" : "Submit Answers"}</Button>
                        <Button data-testid="quiz-reset" variant="outline" onClick={reset}><ArrowsClockwise size={16} className="mr-1" />Reset</Button>
                    </div>
                </Card>
            )}

            {result && (
                <Card data-testid="quiz-result" className="p-6 border-border/60">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-heading font-bold text-xl">Results</h3>
                        <div className="text-right">
                            <div className="font-heading font-black text-3xl text-primary">{Math.round(result.score * 100)}%</div>
                            <div className="text-xs text-muted-foreground">+{result.xp_gain} XP · level → {result.new_level}</div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {result.results.map((r, i) => (
                            <div key={i} className="p-4 rounded-md border border-border/60">
                                <div className="flex items-start gap-2">
                                    {r.correct
                                        ? <CheckCircle size={18} weight="fill" className="text-green-500 mt-0.5" />
                                        : <XCircle size={18} weight="fill" className="text-destructive mt-0.5" />}
                                    <div className="flex-1">
                                        <div className="font-semibold">{i + 1}. {r.question}</div>
                                        <div className="text-sm text-muted-foreground mt-1"><b>Your:</b> {r.your_answer || "—"}</div>
                                        {!r.correct && <div className="text-sm text-muted-foreground"><b>Expected:</b> {r.expected}</div>}
                                        <div className="text-sm mt-2">{r.feedback}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <Button data-testid="quiz-new" className="mt-5" onClick={reset}>New Quiz</Button>
                </Card>
            )}
        </div>
    );
}
