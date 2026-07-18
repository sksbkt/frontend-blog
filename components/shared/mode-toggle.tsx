"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { useMounted } from "@/hooks/use-mounted";

export function ModeToggle() {
  const mounted = useMounted();
  const { resolvedTheme, setTheme } = useTheme();

  if (!mounted) {
    return (
      <Button
        variant="outline"
        size="icon"
        aria-label="Toggle theme"
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  function toggleTheme() {
    const nextTheme = isDark ? "light" : "dark";

    if ("startViewTransition" in document) {
      document.startViewTransition(() => {
        setTheme(nextTheme);
      });
    } else {
      setTheme(nextTheme);
    }
  }

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Toggle theme"
      onClick={toggleTheme}
      className="overflow-hidden"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={isDark ? "moon" : "sun"}
          initial={{
            opacity: 0,
            y: 8,
            scale: 0.6,
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
          }}
          exit={{
            opacity: 0,
            y: -8,
            scale: 0.6,
          }}
          transition={{
            duration: 0.2,
          }}
        >
          {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </motion.div>
      </AnimatePresence>
    </Button>
  );
}
