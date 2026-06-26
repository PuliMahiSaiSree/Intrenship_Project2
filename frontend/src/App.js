import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import Layout from "@/components/Layout";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AuthCallback from "@/pages/AuthCallback";
import Dashboard from "@/pages/Dashboard";
import Chat from "@/pages/Chat";
import Quiz from "@/pages/Quiz";
import StudyPlan from "@/pages/StudyPlan";
import Leaderboard from "@/pages/Leaderboard";
import Profile from "@/pages/Profile";
import AdminDashboard from "@/pages/AdminDashboard";
import { Toaster } from "sonner";

function ThemeBoot() {
    useEffect(() => {
        const saved = localStorage.getItem("theme") ?? "dark";
        document.documentElement.classList.toggle("dark", saved === "dark");
    }, []);
    return null;
}

function AdminRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return <div className="p-8 text-muted-foreground">Loading…</div>;
    if (!user) return <Navigate to="/login" replace />;
    if (user.role !== "admin") return <Navigate to="/dashboard" replace />;
    return children;
}

function AppRouter() {
    const location = useLocation();
    // Handle OAuth callback synchronously during render
    if (location.hash?.includes("session_id=")) {
        return <AuthCallback />;
    }
    return (
        <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route element={<Layout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/quiz" element={<Quiz />} />
                <Route path="/study-plan" element={<StudyPlan />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            </Route>
        </Routes>
    );
}

export default function App() {
    return (
        <div className="App">
            <ThemeBoot />
            <BrowserRouter>
                <AuthProvider>
                    <AppRouter />
                    <Toaster position="top-right" richColors />
                </AuthProvider>
            </BrowserRouter>
        </div>
    );
}
