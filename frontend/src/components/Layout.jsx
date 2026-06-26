import { Outlet, Navigate } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";

export default function Layout() {
    const { user, loading } = useAuth();
    if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
    if (!user) return <Navigate to="/login" replace />;

    return (
        <div className="min-h-screen flex bg-background text-foreground">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-14 border-b border-border/60 px-4 md:px-8 flex items-center justify-between bg-background/70 backdrop-blur-xl sticky top-0 z-10">
                    <div className="text-xs tracking-[0.2em] uppercase font-semibold text-muted-foreground">
                        Personalized Learning · Generative Tutor
                    </div>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                    </div>
                </header>
                <main className="flex-1 px-4 md:px-8 py-6 max-w-7xl w-full mx-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
