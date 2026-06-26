import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function Register() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);

    const onSubmit = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            await register(name, email, password);
            toast.success("Welcome to Tutorly!");
            navigate("/dashboard");
        } catch (err) {
            toast.error(err.response?.data?.detail || "Registration failed");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div data-testid="register-page" className="min-h-screen flex items-center justify-center px-4 bg-background">
            <div className="w-full max-w-md p-8 border border-border/60 rounded-xl bg-card">
                <Link to="/" className="flex items-center gap-2.5 mb-8">
                    <div className="w-9 h-9 rounded-md bg-primary/15 flex items-center justify-center">
                        <GraduationCap size={22} weight="duotone" className="text-primary" />
                    </div>
                    <span className="font-heading font-black text-xl">Tutorly</span>
                </Link>
                <h1 className="font-heading font-black text-3xl mb-2">Create your account</h1>
                <p className="text-sm text-muted-foreground mb-6">Start learning with your AI tutor in seconds.</p>

                <form onSubmit={onSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="name">Name</Label>
                        <Input data-testid="register-name" id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="email">Email</Label>
                        <Input data-testid="register-email" id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="password">Password (min 6)</Label>
                        <Input data-testid="register-password" id="password" type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    <Button data-testid="register-submit" type="submit" className="w-full" disabled={busy}>
                        {busy ? "Creating…" : "Create account"}
                    </Button>
                </form>

                <p className="text-sm text-muted-foreground text-center mt-6">
                    Already have an account?{" "}
                    <Link to="/login" data-testid="goto-login" className="text-primary font-semibold hover:underline">Sign in</Link>
                </p>
            </div>
        </div>
    );
}
