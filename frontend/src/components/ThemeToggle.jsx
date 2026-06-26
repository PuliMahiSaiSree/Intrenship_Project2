import { useEffect, useState } from "react";
import { Sun, Moon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export default function ThemeToggle() {
    const [dark, setDark] = useState(() =>
        document.documentElement.classList.contains("dark") ||
        (localStorage.getItem("theme") ?? "dark") === "dark"
    );

    useEffect(() => {
        document.documentElement.classList.toggle("dark", dark);
        localStorage.setItem("theme", dark ? "dark" : "light");
    }, [dark]);

    return (
        <Button
            data-testid="theme-toggle"
            variant="ghost"
            size="icon"
            onClick={() => setDark((d) => !d)}
            aria-label="Toggle theme"
        >
            {dark ? <Sun size={20} weight="duotone" /> : <Moon size={20} weight="duotone" />}
        </Button>
    );
}
