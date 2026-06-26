import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaperPlaneTilt, Microphone, SpeakerHigh, Robot, User as UserIcon, Stop } from "@phosphor-icons/react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const MODELS = [{ v: "gpt-5.2", l: "GPT-5.2" }, { v: "claude-sonnet-4.5", l: "Claude Sonnet 4.5" }];

export default function Chat() {
    const { user } = useAuth();
    const [subject, setSubject] = useState("Mathematics");
    const [level, setLevel] = useState(user?.level || "beginner");
    const [model, setModel] = useState("gpt-5.2");
    const [subjects, setSubjects] = useState(["Mathematics", "Science", "Programming", "English", "History"]);
    const [levels, setLevels] = useState(["beginner", "intermediate", "advanced"]);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [busy, setBusy] = useState(false);
    const [listening, setListening] = useState(false);
    const recogRef = useRef(null);
    const listRef = useRef(null);

    useEffect(() => {
        api.get("/meta/subjects").then(({ data }) => { setSubjects(data.subjects); setLevels(data.levels); }).catch(()=>{});
        api.get("/chat/history").then(({ data }) => {
            const items = [...data.items].reverse().flatMap((h) => [
                { role: "user", text: h.prompt, subject: h.subject },
                { role: "ai", text: h.response, subject: h.subject },
            ]);
            setMessages(items);
        }).catch(()=>{});
    }, []);

    useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }); }, [messages, busy]);

    const send = async () => {
        if (!input.trim() || busy) return;
        const prompt = input.trim();
        setMessages((m) => [...m, { role: "user", text: prompt }]);
        setInput("");
        setBusy(true);
        try {
            const { data } = await api.post("/chat", { subject, level, prompt, model });
            setMessages((m) => [...m, { role: "ai", text: data.response }]);
        } catch (e) {
            toast.error(e.response?.data?.detail || "AI tutor failed");
            setMessages((m) => [...m, { role: "ai", text: "Sorry, I couldn't respond. Please try again." }]);
        } finally {
            setBusy(false);
        }
    };

    const onKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };

    const toggleVoice = () => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) { toast.error("Voice not supported in this browser"); return; }
        if (listening) { recogRef.current?.stop(); setListening(false); return; }
        const r = new SR();
        r.lang = "en-US"; r.interimResults = false; r.continuous = false;
        r.onresult = (e) => { setInput((prev) => (prev ? prev + " " : "") + e.results[0][0].transcript); };
        r.onend = () => setListening(false);
        r.onerror = () => setListening(false);
        recogRef.current = r; r.start(); setListening(true);
    };

    const speak = (text) => {
        if (!("speechSynthesis" in window)) { toast.error("TTS not supported"); return; }
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text.replace(/[*_`#>]/g, ""));
        u.rate = 1.05; u.pitch = 1;
        window.speechSynthesis.speak(u);
    };

    return (
        <div data-testid="chat-page" className="flex flex-col h-[calc(100vh-9rem)]">
            <div className="flex flex-wrap items-end gap-3 mb-4">
                <div>
                    <div className="text-[10px] tracking-[0.2em] uppercase font-semibold text-muted-foreground">AI Tutor</div>
                    <h1 className="font-heading font-black text-3xl tracking-tight">Ask anything</h1>
                </div>
                <div className="ml-auto flex flex-wrap gap-2">
                    <Select value={subject} onValueChange={setSubject}>
                        <SelectTrigger data-testid="chat-subject" className="w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>{subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={level} onValueChange={setLevel}>
                        <SelectTrigger data-testid="chat-level" className="w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>{levels.map((l) => <SelectItem key={l} value={l}>{l[0].toUpperCase()+l.slice(1)}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={model} onValueChange={setModel}>
                        <SelectTrigger data-testid="chat-model" className="w-44"><SelectValue /></SelectTrigger>
                        <SelectContent>{MODELS.map((m) => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            </div>

            <Card ref={listRef} data-testid="chat-messages" className="flex-1 overflow-y-auto p-4 border-border/60 space-y-4">
                {messages.length === 0 && !busy && (
                    <div className="h-full flex flex-col items-center justify-center text-center px-6">
                        <Robot size={48} weight="duotone" className="text-primary mb-3 xp-glow" />
                        <h3 className="font-heading font-bold text-xl mb-1">Your personal tutor is ready</h3>
                        <p className="text-sm text-muted-foreground max-w-md">Ask a concept, request examples, or have me generate practice questions. I'll teach you at your level.</p>
                    </div>
                )}
                {messages.map((m, i) => (
                    <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                        <div className={`w-8 h-8 rounded-md shrink-0 flex items-center justify-center ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                            {m.role === "user" ? <UserIcon size={16} weight="duotone" /> : <Robot size={16} weight="duotone" className="text-primary" />}
                        </div>
                        <div className={`px-4 py-3 rounded-xl max-w-[80%] text-sm leading-relaxed whitespace-pre-wrap ${
                            m.role === "user"
                                ? "bg-primary text-primary-foreground rounded-tr-sm"
                                : "bg-muted text-foreground rounded-tl-sm"
                        }`}>
                            {m.text}
                            {m.role === "ai" && (
                                <button data-testid={`speak-${i}`} onClick={() => speak(m.text)} className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                                    <SpeakerHigh size={12} weight="duotone" /> Read aloud
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                {busy && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center"><Robot size={16} weight="duotone" className="text-primary" /></div>
                        <div className="px-4 py-3 rounded-xl bg-muted text-sm">
                            <span className="inline-block w-24 h-1.5 rounded-full typing-beam" /> <span className="text-muted-foreground ml-2">Thinking…</span>
                        </div>
                    </div>
                )}
            </Card>

            <div className="mt-3 flex gap-2 items-end">
                <Textarea
                    data-testid="chat-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onKey}
                    placeholder="Ask anything…  (Shift+Enter for new line)"
                    rows={2}
                    className="resize-none"
                />
                <Button data-testid="chat-voice" variant="outline" size="icon" onClick={toggleVoice} aria-label="Voice">
                    {listening ? <Stop size={18} weight="duotone" className="text-destructive" /> : <Microphone size={18} weight="duotone" />}
                </Button>
                <Button data-testid="chat-send" onClick={send} disabled={busy || !input.trim()}>
                    <PaperPlaneTilt size={18} weight="duotone" className="mr-1" /> Send
                </Button>
            </div>
        </div>
    );
}
