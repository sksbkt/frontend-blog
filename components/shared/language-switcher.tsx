"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLanguage() {
    const nextLocale = locale === "fa" ? "en" : "fa";

    router.replace(pathname.replace(`/${locale}`, `/${nextLocale}`));
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={switchLanguage}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={locale}
          initial={{
            opacity: 0,
            y: 8,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          exit={{
            opacity: 0,
            y: -8,
          }}
          transition={{
            duration: 0.2,
          }}
          className="text-xs font-medium leading-none"
        >
          {locale.toUpperCase()}
        </motion.span>
      </AnimatePresence>
    </Button>
  );
}
