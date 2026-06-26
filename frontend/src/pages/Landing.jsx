import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap, Brain, Trophy, ChatCircleDots, ChartLineUp, Sparkle } from "@phosphor-icons/react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

const HERO_IMG = "https://images.pexels.com/photos/37811245/pexels-photo-37811245.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

export default function Landing() {
    const { user } = useAuth();
    const navigate = useNavigate();
    useEffect(() => { if (user) navigate("/dashboard"); }, [user, navigate]);

    return (
        <div data-testid="landing-page" className="min-h-screen bg-background text-foreground">
            <header className="px-6 md:px-12 py-5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-md bg-primary/15 flex items-center justify-center xp-glow">
                        <GraduationCap size={22} weight="duotone" className="text-primary" />
                    </div>
                    <span className="font-heading font-black text-xl">Tutorly</span>
                </div>
                <div className="flex items-center gap-2">
                    <Link to="/login"><Button data-testid="landing-login-btn" variant="ghost">Sign in</Button></Link>
                    <Link to="/register"><Button data-testid="landing-register-btn">Get Started</Button></Link>
                </div>
            </header>

            <section className="px-6 md:px-12 pt-10 md:pt-16 pb-20 grid lg:grid-cols-[1.1fr_1fr] gap-12 items-center max-w-7xl mx-auto">
                <div>
                    <div className="text-xs tracking-[0.25em] uppercase font-semibold text-primary mb-4 flex items-center gap-2">
                        <Sparkle size={14} weight="fill" /> Generative Tutoring System
                    </div>
                    <h1 className="font-heading font-black text-4xl sm:text-5xl lg:text-6xl tracking-tighter leading-none mb-6">
                        Your <span className="text-primary">personal tutor</span>,<br/>
                        powered by frontier AI.
                    </h1>
                    <p className="text-base md:text-lg text-muted-foreground max-w-xl mb-8 leading-relaxed">
                        Adaptive explanations, AI-generated quizzes, study plans that adjust to <em>you</em>.
                        Master any subject with a tutor that knows what you already know.
                    </p>
                    <div className="flex flex-wrap gap-3">
                        <Link to="/register">
                            <Button data-testid="hero-cta" size="lg" className="font-semibold">Start learning free</Button>
                        </Link>
                        <Link to="/login">
                            <Button data-testid="hero-login" size="lg" variant="outline">I already have an account</Button>
                        </Link>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-12">
                        {[
                            { icon: ChatCircleDots, label: "AI Tutor Chat" },
                            { icon: Brain, label: "Smart Quizzes" },
                            { icon: ChartLineUp, label: "Progress Analytics" },
                            { icon: Trophy, label: "Gamified XP" },
                        ].map((f, i) => (
                            <div key={i} className="px-4 py-3 border border-border/60 rounded-md flex items-center gap-2.5 hover:border-primary/50 transition-colors">
                                <f.icon size={18} weight="duotone" className="text-primary" />
                                <span className="text-sm font-semibold">{f.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-3xl -z-10" />
                    <img src={HERO_IMG} alt="Student learning" className="rounded-xl border border-border/60 object-cover max-h-[60vh] w-full" />
                </div>
            </section>

            <footer className="px-6 md:px-12 py-8 border-t border-border/60 text-xs text-muted-foreground tracking-[0.18em] uppercase">
                Built with GPT-5.2 & Claude Sonnet 4.5 · Adaptive difficulty · Powered by Emergent
            </footer>
        </div>
    );
}
