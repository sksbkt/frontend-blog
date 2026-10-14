"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Wifi, WifiOff, RefreshCw, X, CheckCircle2 } from "lucide-react";

const farsiDefaults = {
  offlineTitle: "شما آفلاین هستید",
  offlineDesc: "در حال مشاهده محتوای ذخیره‌شده. اتصال به صورت خودکار برقرار خواهد شد...",
  onlineTitle: "اتصال اینترنت برقرار شد!",
  onlineDesc: "دوباره آنلاین شدید. در حال دریافت جدیدترین محتوا...",
  retry: "بررسی اتصال",
  syncing: "در حال همگام‌سازی..."
};

const englishDefaults = {
  offlineTitle: "You're Offline",
  offlineDesc: "Browsing cached content. Reconnecting automatically...",
  onlineTitle: "Back Online!",
  onlineDesc: "Connection restored. Updating latest content...",
  retry: "Check Connection",
  syncing: "Syncing..."
};

export default function NetworkStatusBar() {
  const locale = useLocale();
  const isFa = locale === "fa";
  const dict = isFa ? farsiDefaults : englishDefaults;

  let t: ReturnType<typeof useTranslations> | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    t = useTranslations("network");
  } catch {
    t = null;
  }

  const getMessage = (key: keyof typeof farsiDefaults): string => {
    if (t) {
      try {
        const val = t(key);
        if (val && !val.startsWith("network.")) return val;
      } catch {
        // Fall back to dictionary
      }
    }
    return dict[key];
  };

  const router = useRouter();
  const [, startTransition] = useTransition();

  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [manualChecking, setManualChecking] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const online = navigator.onLine;
      setIsOnline(online);
      if (!online) {
        setWasOffline(true);
        setIsVisible(true);
      }
    }

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      setIsSyncing(false);
      setIsVisible(true);
    };

    const handleOnline = () => {
      setIsOnline(true);
      setIsSyncing(true);
      setIsVisible(true);

      // Trigger automatic update/refresh of Next.js server components
      startTransition(() => {
        router.refresh();
      });

      const timer = setTimeout(() => {
        setIsSyncing(false);
        setIsVisible(false);
        setWasOffline(false);
      }, 3500);

      return () => clearTimeout(timer);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [router]);

  const handleManualCheck = async () => {
    setManualChecking(true);
    try {
      await fetch("/manifest.json", {
        method: "HEAD",
        cache: "no-store",
      });
      setIsOnline(true);
      setIsSyncing(true);
      startTransition(() => {
        router.refresh();
      });
      setTimeout(() => {
        setIsSyncing(false);
        setIsVisible(false);
        setWasOffline(false);
      }, 3000);
    } catch {
      setIsOnline(false);
    } finally {
      setManualChecking(false);
    }
  };

  if (!isVisible) return null;

  return (
    <aside
      aria-label="Network status notification"
      dir={isFa ? "rtl" : "ltr"}
      className={`fixed bottom-6 start-1/2 z-50 -translate-x-1/2 rtl:translate-x-1/2 w-[92%] max-w-md animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-auto ${
        isFa ? "font-vazir" : ""
      }`}
    >
      <div
        className={`relative overflow-hidden rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl transition-all ${
          isOnline
            ? "border-emerald-500/40 bg-emerald-950/90 text-emerald-100 shadow-emerald-950/50"
            : "border-amber-500/40 bg-background/95 text-foreground shadow-black/60 dark:bg-zinc-950/90"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Status Icon */}
            <div
              className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                isOnline
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-amber-500/15 text-amber-500"
              }`}
            >
              {!isOnline && (
                <span className="absolute -top-1 -end-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
              )}

              {isOnline ? (
                isSyncing ? (
                  <RefreshCw className="h-5 w-5 animate-spin text-emerald-300" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                )
              ) : (
                <WifiOff className="h-5 w-5 text-amber-500" />
              )}
            </div>

            {/* Text description */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold tracking-tight">
                  {isOnline ? getMessage("onlineTitle") : getMessage("offlineTitle")}
                </p>
                {isOnline && isSyncing && (
                  <span className="text-[11px] font-medium text-emerald-300 opacity-80">
                    ({getMessage("syncing")})
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {isOnline ? getMessage("onlineDesc") : getMessage("offlineDesc")}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {!isOnline && (
              <button
                type="button"
                onClick={handleManualCheck}
                disabled={manualChecking}
                className="flex items-center gap-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 active:scale-95 px-2.5 py-1.5 text-xs font-medium text-amber-400 border border-amber-500/30 transition-all disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${manualChecking ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">{getMessage("retry")}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsVisible(false)}
              aria-label="Dismiss notification"
              className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
