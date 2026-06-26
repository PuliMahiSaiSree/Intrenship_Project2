import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
    House, ChatCircleDots, Brain, CalendarBlank, Trophy, User, ChartLineUp,
    SignOut, GraduationCap, Sparkle,
} from "@phosphor-icons/react";

const studentLinks = [
    { to: "/dashboard", label: "Dashboard", icon: House, testid: "nav-dashboard" },
    { to: "/chat", label: "AI Tutor", icon: ChatCircleDots, testid: "nav-chat" },
    { to: "/quiz", label: "Quizzes", icon: Brain, testid: "nav-quiz" },
    { to: "/study-plan", label: "Study Planner", icon: CalendarBlank, testid: "nav-study-plan" },
    { to: "/leaderboard", label: "Leaderboard", icon: Trophy, testid: "nav-leaderboard" },
    { to: "/profile", label: "Profile", icon: User, testid: "nav-profile" },
];

const adminLinks = [
    { to: "/admin", label: "Admin Console", icon: ChartLineUp, testid: "nav-admin" },
];

export default function Sidebar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const links = user?.role === "admin" ? [...studentLinks, ...adminLinks] : studentLinks;

    const onLogout = async () => {
        await logout();
        navigate("/login");
    };

    return (
        <aside data-testid="sidebar" className="hidden md:flex w-64 shrink-0 flex-col border-r border-border/60 bg-card">
            <div className="px-6 py-6 border-b border-border/60">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-md bg-primary/15 flex items-center justify-center xp-glow">
                        <GraduationCap size={22} weight="duotone" className="text-primary" />
                    </div>
                    <div>
                        <div className="font-heading font-bold text-lg leading-tight">Tutorly</div>
                        <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-semibold">AI Academy</div>
                    </div>
                </div>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1">
                {links.map((l) => (
                    <NavLink
                        key={l.to}
                        to={l.to}
                        data-testid={l.testid}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                                isActive
                                    ? "bg-primary/15 text-primary font-semibold"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`
                        }
                    >
                        <l.icon size={18} weight="duotone" />
                        <span>{l.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="px-3 py-4 border-t border-border/60 space-y-2">
                <div className="px-3 py-2 rounded-md bg-muted/50 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                        {user?.name?.[0]?.toUpperCase() ?? "U"}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div data-testid="sidebar-username" className="text-sm font-semibold truncate">{user?.name}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Sparkle size={10} weight="fill" className="text-primary" />
                            {user?.xp ?? 0} XP · {user?.level}
                        </div>
                    </div>
                </div>
                <button
                    data-testid="logout-button"
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                    <SignOut size={18} weight="duotone" />
                    Logout
                </button>
            </div>
        </aside>
    );
}
