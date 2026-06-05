"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-9 h-9 rounded-md border bg-muted" />;
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-2 rounded-md hover:bg-secondary border transition-all flex items-center justify-center text-foreground hover:scale-105 active:scale-95"
      aria-label="Toggle Theme"
    >
      {theme === "dark" ? (
        <Sun className="h-[1.2rem] w-[1.2rem] text-yellow-500 animate-pulse" />
      ) : (
        <Moon className="h-[1.2rem] w-[1.2rem] text-indigo-500" />
      )}
    </button>
  );
}
