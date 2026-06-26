import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthCallback() {
    const navigate = useNavigate();
    const { setUser } = useAuth();
    const hasProcessed = useRef(false);

    useEffect(() => {
        if (hasProcessed.current) return;
        hasProcessed.current = true;

        const hash = window.location.hash || "";
        const m = hash.match(/session_id=([^&]+)/);
        if (!m) {
            navigate("/login", { replace: true });
            return;
        }
        const session_id = decodeURIComponent(m[1]);
        (async () => {
            try {
                const { data } = await api.post("/auth/session", { session_id });
                setUser(data.user);
                // Clear hash
                window.history.replaceState(null, "", window.location.pathname);
                navigate("/dashboard", { replace: true, state: { user: data.user } });
            } catch (e) {
                navigate("/login", { replace: true });
            }
        })();
    }, [navigate, setUser]);

    return (
        <div className="min-h-screen flex items-center justify-center text-muted-foreground">
            Signing you in…
        </div>
    );
}
