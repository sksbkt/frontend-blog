"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useLocale } from "next-intl";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Wifi,
  WifiOff,
  RefreshCw,
  X,
} from "lucide-react";
import {
  SnackbarAction,
  SnackbarContextValue,
  SnackbarItem,
  SnackbarOptions,
  SnackbarType,
} from "./snackbar-types";

const SnackbarContext = createContext<SnackbarContextValue | null>(null);

export function useSnackbar(): SnackbarContextValue {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error("useSnackbar must be used within a SnackbarProvider");
  }
  return context;
}

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const [snackbars, setSnackbars] = useState<SnackbarItem[]>([]);
  const locale = useLocale();
  const isFa = locale === "fa";

  const dismiss = useCallback((id: string) => {
    setSnackbars((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setSnackbars([]);
  }, []);

  const show = useCallback(
    (options: SnackbarOptions): string => {
      const id = options.id || "sb-" + Math.random().toString(36).substring(2, 9);
      const duration = options.duration !== undefined ? options.duration : 5000;

      const item: SnackbarItem = {
        id,
        type: options.type || "info",
        title: options.title,
        description: options.description || "",
        duration,
        action: options.action,
        isSyncing: options.isSyncing,
      };

      setSnackbars((prev) => {
        // If an item with the same ID already exists, replace it
        const exists = prev.some((s) => s.id === id);
        if (exists) {
          return prev.map((s) => (s.id === id ? item : s));
        }
        // Keep up to 3 snackbars visible
        return [...prev.slice(-2), item];
      });

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, duration);
      }

      return id;
    },
    [dismiss]
  );

  const success = useCallback(
    (title: string, description?: string, action?: SnackbarAction) => {
      return show({ type: "success", title, description, action });
    },
    [show]
  );

  const error = useCallback(
    (title: string, description?: string, action?: SnackbarAction) => {
      return show({ type: "error", title, description, action, duration: 7000 });
    },
    [show]
  );

  const warning = useCallback(
    (title: string, description?: string, action?: SnackbarAction) => {
      return show({ type: "warning", title, description, action, duration: 6000 });
    },
    [show]
  );

  const info = useCallback(
    (title: string, description?: string, action?: SnackbarAction) => {
      return show({ type: "info", title, description, action });
    },
    [show]
  );

  const offline = useCallback(
    (options?: Partial<SnackbarOptions>) => {
      return show({
        id: "network-status-bar",
        type: "offline",
        title: options?.title || (isFa ? "شما آفلاین هستید" : "You're Offline"),
        description:
          options?.description ||
          (isFa
            ? "در حال مشاهده محتوای ذخیره‌شده. اتصال به صورت خودکار برقرار خواهد شد..."
            : "Browsing cached content. Reconnecting automatically..."),
        duration: 0, // sticky while offline
        action: options?.action,
        ...options,
      });
    },
    [show, isFa]
  );

  const online = useCallback(
    (options?: Partial<SnackbarOptions>) => {
      return show({
        id: "network-status-bar",
        type: "online",
        title: options?.title || (isFa ? "اتصال اینترنت برقرار شد!" : "Back Online!"),
        description:
          options?.description ||
          (isFa
            ? "دوباره آنلاین شدید. در حال دریافت جدیدترین محتوا..."
            : "Connection restored. Updating latest content..."),
        duration: 3500,
        isSyncing: options?.isSyncing ?? true,
        ...options,
      });
    },
    [show, isFa]
  );

  const value = useMemo(
    () => ({
      show,
      success,
      error,
      warning,
      info,
      offline,
      online,
      dismiss,
      dismissAll,
    }),
    [show, success, error, warning, info, offline, online, dismiss, dismissAll]
  );

  return (
    <SnackbarContext.Provider value={value}>
      {children}

      {/* Floating Snackbar Stack View */}
      <aside
        aria-label="Notifications"
        dir={isFa ? "rtl" : "ltr"}
        className={`fixed bottom-6 start-1/2 z-50 -translate-x-1/2 rtl:translate-x-1/2 w-[92%] max-w-md pointer-events-none flex flex-col gap-2.5 ${
          isFa ? "font-vazir" : ""
        }`}
      >
        {snackbars.map((item) => (
          <SnackbarCard
            key={item.id}
            item={item}
            onDismiss={() => dismiss(item.id)}
            isFa={isFa}
          />
        ))}
      </aside>
    </SnackbarContext.Provider>
  );
}

// Styling definitions per type
const TYPE_STYLES: Record<
  SnackbarType,
  {
    border: string;
    bg: string;
    text: string;
    iconBg: string;
    iconColor: string;
  }
> = {
  success: {
    border: "border-emerald-500/40",
    bg: "bg-emerald-950/90 dark:bg-emerald-950/90",
    text: "text-emerald-100",
    iconBg: "bg-emerald-500/20",
    iconColor: "text-emerald-400",
  },
  online: {
    border: "border-emerald-500/40",
    bg: "bg-emerald-950/90 dark:bg-emerald-950/90",
    text: "text-emerald-100",
    iconBg: "bg-emerald-500/20",
    iconColor: "text-emerald-400",
  },
  offline: {
    border: "border-amber-500/40",
    bg: "bg-background/95 dark:bg-zinc-950/90",
    text: "text-foreground",
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-500",
  },
  warning: {
    border: "border-amber-500/40",
    bg: "bg-amber-950/90 dark:bg-amber-950/90",
    text: "text-amber-100",
    iconBg: "bg-amber-500/20",
    iconColor: "text-amber-400",
  },
  error: {
    border: "border-rose-500/40",
    bg: "bg-rose-950/90 dark:bg-rose-950/90",
    text: "text-rose-100",
    iconBg: "bg-rose-500/20",
    iconColor: "text-rose-400",
  },
  info: {
    border: "border-sky-500/40",
    bg: "bg-sky-950/90 dark:bg-sky-950/90",
    text: "text-sky-100",
    iconBg: "bg-sky-500/20",
    iconColor: "text-sky-400",
  },
};

function SnackbarCard({
  item,
  onDismiss,
  isFa,
}: {
  item: SnackbarItem;
  onDismiss: () => void;
  isFa: boolean;
}) {
  const styles = TYPE_STYLES[item.type] || TYPE_STYLES.info;

  const renderIcon = () => {
    switch (item.type) {
      case "offline":
        return <WifiOff className="h-5 w-5" />;
      case "online":
        return item.isSyncing ? (
          <RefreshCw className="h-5 w-5 animate-spin" />
        ) : (
          <Wifi className="h-5 w-5" />
        );
      case "success":
        return <CheckCircle2 className="h-5 w-5" />;
      case "error":
        return <AlertCircle className="h-5 w-5" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5" />;
      case "info":
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  return (
    <div
      className={`pointer-events-auto relative overflow-hidden rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 ${styles.border} ${styles.bg} ${styles.text}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Status Icon */}
          <div
            className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${styles.iconBg} ${styles.iconColor}`}
          >
            {item.type === "offline" && (
              <span className="absolute -top-1 -end-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
            )}
            {renderIcon()}
          </div>

          {/* Text Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold tracking-tight">
                {item.title}
              </p>
              {item.type === "online" && item.isSyncing && (
                <span className="text-[11px] font-medium text-emerald-300 opacity-80">
                  ({isFa ? "در حال همگام‌سازی..." : "Syncing..."})
                </span>
              )}
            </div>
            {item.description && (
              <p className="text-xs opacity-85 truncate mt-0.5">
                {item.description}
              </p>
            )}
          </div>
        </div>

        {/* Action button & Close button */}
        <div className="flex items-center gap-1.5 shrink-0">
          {item.action && (
            <button
              type="button"
              onClick={item.action.onClick}
              className="flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 px-2.5 py-1.5 text-xs font-medium border border-white/15 transition-all"
            >
              <span>{item.action.label}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss notification"
            className="rounded-lg p-1.5 opacity-70 hover:opacity-100 hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
