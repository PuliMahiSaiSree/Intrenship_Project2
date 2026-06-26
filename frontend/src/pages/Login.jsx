import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, GoogleLogo } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("student@test.com");
    const [password, setPassword] = useState("Student@123");
    const [busy, setBusy] = useState(false);

    const onSubmit = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            const user = await login(email, password);
            toast.success(`Welcome back, ${user.name}`);
            navigate(user.role === "admin" ? "/admin" : "/dashboard");
        } catch (err) {
            toast.error(err.response?.data?.detail || "Login failed");
        } finally {
            setBusy(false);
        }
    };

    const onGoogle = () => {
        // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
        const redirectUrl = window.location.origin + "/dashboard";
        window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
    };

    return (
        <div data-testid="login-page" className="min-h-screen flex items-center justify-center px-4 bg-background">
            <div className="w-full max-w-md p-8 border border-border/60 rounded-xl bg-card">
                <Link to="/" className="flex items-center gap-2.5 mb-8">
                    <div className="w-9 h-9 rounded-md bg-primary/15 flex items-center justify-center">
                        <GraduationCap size={22} weight="duotone" className="text-primary" />
                    </div>
                    <span className="font-heading font-black text-xl">Tutorly</span>
                </Link>
                <h1 className="font-heading font-black text-3xl mb-2">Welcome back</h1>
                <p className="text-sm text-muted-foreground mb-6">Sign in to continue your learning journey.</p>

                <Button data-testid="google-login-btn" type="button" variant="outline" className="w-full mb-4" onClick={onGoogle}>
                    <GoogleLogo size={18} weight="bold" className="mr-2" /> Continue with Google
                </Button>
                <div className="flex items-center gap-3 my-4">
                    <div className="h-px bg-border flex-1" />
                    <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-semibold">or</span>
                    <div className="h-px bg-border flex-1" />
                </div>

                <form onSubmit={onSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="email">Email</Label>
                        <Input data-testid="login-email" id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="password">Password</Label>
                        <Input data-testid="login-password" id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    <Button data-testid="login-submit" type="submit" className="w-full" disabled={busy}>
                        {busy ? "Signing in…" : "Sign in"}
                    </Button>
                </form>

                <p className="text-sm text-muted-foreground text-center mt-6">
                    No account?{" "}
                    <Link to="/register" data-testid="goto-register" className="text-primary font-semibold hover:underline">
                        Create one
                    </Link>
                </p>
            </div>
        </div>
    );
}
