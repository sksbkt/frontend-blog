"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import {
  Wifi,
  WifiOff,
  AlertTriangle,
  FileQuestion,
  RefreshCw,
  Home,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export type StatusPageVariant =
  | "offline"
  | "404"
  | "500"
  | "maintenance"
  | "success";

export interface StatusPageAction {
  label: string;
  onClick?: () => void | Promise<void>;
  href?: string;
}

export interface StatusPageCardProps {
  variant?: StatusPageVariant;
  badgeText?: string;
  title: string;
  description: string;
  destinationUrl?: string;
  primaryAction?: StatusPageAction;
  secondaryAction?: StatusPageAction;
  autoReconnect?: boolean;
}

export default function StatusPageCard({
  variant = "offline",
  badgeText,
  title,
  description,
  destinationUrl,
  primaryAction,
  secondaryAction,
  autoReconnect = false,
}: StatusPageCardProps) {
  const router = useRouter();
  const locale = useLocale();
  const isFa = locale === "fa";
  const [, startTransition] = useTransition();

  // State for offline auto-recovery
  const [connState, setConnState] = useState<"offline" | "checking" | "connected">(
    variant === "offline" ? "offline" : "offline"
  );
  const [statusNote, setStatusNote] = useState<string | null>(null);

  // Determine target destination
  const targetUrl =
    destinationUrl ||
    (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("from") ||
        (document.referrer.startsWith(window.location.origin) &&
        !document.referrer.includes("offline")
          ? document.referrer
          : `/${locale}`)
      : `/${locale}`);

  // Heartbeat & Online detection when autoReconnect is enabled
  useEffect(() => {
    if (!autoReconnect || variant !== "offline") return;

    let isMounted = true;

    const triggerConnected = () => {
      if (!isMounted) return;
      setConnState("connected");
      setStatusNote(
        isFa
          ? `اتصال برقرار شد! در حال انتقال به ${targetUrl}...`
          : `Connected! Redirecting to ${targetUrl}...`
      );

      setTimeout(() => {
        if (!isMounted) return;
        startTransition(() => {
          if (targetUrl.startsWith("http")) {
            window.location.href = targetUrl;
          } else {
            router.replace(targetUrl);
            router.refresh();
          }
        });
      }, 700);
    };

    const checkHeartbeat = async () => {
      try {
        const res = await fetch("/manifest.json?_t=" + Date.now(), {
          method: "HEAD",
          cache: "no-store",
        });
        if (res.ok) {
          triggerConnected();
        }
      } catch {
        // Still offline
      }
    };

    // 1. Listen for browser online event
    const handleOnline = () => {
      triggerConnected();
    };

    window.addEventListener("online", handleOnline);

    // 2. Poll heartbeat every 2.5 seconds
    const interval = setInterval(checkHeartbeat, 2500);

    return () => {
      isMounted = false;
      window.removeEventListener("online", handleOnline);
      clearInterval(interval);
    };
  }, [autoReconnect, variant, isFa, targetUrl, router]);

  const handleManualCheck = async () => {
    if (primaryAction?.onClick) {
      primaryAction.onClick();
      return;
    }

    setConnState("checking");
    setStatusNote(isFa ? "در حال بررسی اتصال..." : "Checking connection...");

    try {
      const res = await fetch("/manifest.json?_t=" + Date.now(), {
        method: "HEAD",
        cache: "no-store",
      });
      if (res.ok) {
        setConnState("connected");
        setStatusNote(
          isFa
            ? `اتصال برقرار شد! در حال انتقال...`
            : `Connected! Redirecting...`
        );
        setTimeout(() => {
          if (targetUrl.startsWith("http")) {
            window.location.href = targetUrl;
          } else {
            router.replace(targetUrl);
            router.refresh();
          }
        }, 600);
      } else {
        throw new Error("Offline");
      }
    } catch {
      setTimeout(() => {
        setConnState("offline");
        setStatusNote(isFa ? "هنوز اینترنت متصل نیست." : "Still offline.");
      }, 600);
    }
  };

  // Color & Icon styles
  const isConnected = connState === "connected";

  const getVariantStyles = () => {
    if (variant === "offline") {
      if (isConnected) {
        return {
          iconBox: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
          ping: "bg-emerald-400",
          badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
          badgeDot: "bg-emerald-400",
          badgeLabel: isFa ? "اتصال برقرار شد!" : "Connection Restored!",
          cardBorder: "border-emerald-500/40",
          btn: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/25",
        };
      }
      return {
        iconBox: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        ping: "bg-amber-500/20",
        badge: "bg-amber-500/10 text-amber-500 border-amber-500/30",
        badgeDot: "bg-amber-500",
        badgeLabel: badgeText || (isFa ? "عدم اتصال به اینترنت" : "No Internet Connection"),
        cardBorder: "border-amber-500/30",
        btn: "bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-indigo-500/25",
      };
    }

    if (variant === "404") {
      return {
        iconBox: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
        ping: "bg-indigo-500/20",
        badge: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
        badgeDot: "bg-indigo-400",
        badgeLabel: badgeText || (isFa ? "خطای ۴۰۴ — صفحه یافت نشد" : "404 Error — Page Not Found"),
        cardBorder: "border-border/80",
        btn: "bg-primary text-primary-foreground",
      };
    }

    if (variant === "500") {
      return {
        iconBox: "bg-rose-500/10 text-rose-400 border-rose-500/20",
        ping: "bg-rose-500/20",
        badge: "bg-rose-500/10 text-rose-400 border-rose-500/30",
        badgeDot: "bg-rose-500",
        badgeLabel: badgeText || (isFa ? "خطای سرور" : "Server Error"),
        cardBorder: "border-rose-500/30",
        btn: "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/25",
      };
    }

    // Default / Maintenance
    return {
      iconBox: "bg-sky-500/10 text-sky-400 border-sky-500/20",
      ping: "bg-sky-500/20",
      badge: "bg-sky-500/10 text-sky-400 border-sky-500/30",
      badgeDot: "bg-sky-400",
      badgeLabel: badgeText || (isFa ? "در حال به‌روزرسانی" : "Maintenance"),
      cardBorder: "border-border/80",
      btn: "bg-primary text-primary-foreground",
    };
  };

  const currentStyles = getVariantStyles();

  const renderIcon = () => {
    if (variant === "offline") {
      return isConnected ? (
        <CheckCircle2 className="h-10 w-10 text-emerald-400 animate-in zoom-in-75 duration-300" />
      ) : (
        <WifiOff className="h-10 w-10 text-amber-500" />
      );
    }
    if (variant === "404") return <FileQuestion className="h-10 w-10 text-indigo-400" />;
    if (variant === "500") return <AlertTriangle className="h-10 w-10 text-rose-400" />;
    return <Wifi className="h-10 w-10 text-sky-400" />;
  };

  const displayTitle = isConnected
    ? isFa
      ? "ارتباط با اینترنت برقرار شد!"
      : "Back Online!"
    : title;

  const displayDescription = isConnected
    ? isFa
      ? `اتصال با موفقیت بازیابی شد. در حال بازگشت به صفحه...`
      : `Connection restored. Redirecting you back now...`
    : description;

  return (
    <main
      dir={isFa ? "rtl" : "ltr"}
      className={`flex min-h-[75vh] items-center justify-center py-20 px-6 ${
        isFa ? "font-vazir" : ""
      }`}
    >
      <div
        className={`relative w-full max-w-lg rounded-3xl border ${currentStyles.cardBorder} bg-card/60 p-8 text-center shadow-2xl backdrop-blur-xl sm:p-12 transition-all duration-500`}
      >
        {/* Pulsing ambient icon wrapper */}
        <div
          className={`relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border transition-all duration-500 ${currentStyles.iconBox}`}
        >
          <span
            className={`absolute -inset-2 rounded-2xl animate-ping opacity-60 transition-colors duration-500 ${currentStyles.ping}`}
          />
          {renderIcon()}
        </div>

        {/* Badge Indicator */}
        <div
          className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-semibold mb-4 transition-all duration-500 ${currentStyles.badge}`}
        >
          <span
            className={`h-2 w-2 rounded-full animate-pulse transition-colors duration-500 ${currentStyles.badgeDot}`}
          />
          <span>{currentStyles.badgeLabel}</span>
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl transition-all duration-300">
          {displayTitle}
        </h1>

        {/* Description */}
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {displayDescription}
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {primaryAction && (
            <button
              type="button"
              disabled={isConnected || connState === "checking"}
              onClick={
                variant === "offline"
                  ? handleManualCheck
                  : primaryAction.onClick ||
                    (primaryAction.href
                      ? () => router.push(primaryAction.href!)
                      : undefined)
              }
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold shadow-lg transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-75 ${currentStyles.btn}`}
            >
              {connState === "checking" ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : isConnected ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span>
                {isConnected
                  ? isFa
                    ? "در حال انتقال..."
                    : "Redirecting..."
                  : primaryAction.label}
              </span>
            </button>
          )}

          {secondaryAction && !isConnected && (
            <button
              type="button"
              onClick={
                secondaryAction.onClick ||
                (secondaryAction.href
                  ? () => router.push(secondaryAction.href!)
                  : () => router.back())
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border/80 bg-background/50 hover:bg-muted/50 px-5 py-3 text-sm font-medium transition-colors"
            >
              {secondaryAction.href === `/${locale}` ||
              secondaryAction.href === "/" ? (
                <Home className="h-4 w-4" />
              ) : isFa ? (
                <ArrowRight className="h-4 w-4" />
              ) : (
                <ArrowLeft className="h-4 w-4" />
              )}
              <span>{secondaryAction.label}</span>
            </button>
          )}
        </div>

        {/* Dynamic Status Notification */}
        {statusNote && (
          <p className="mt-4 text-xs font-medium text-emerald-400 dark:text-emerald-300 animate-in fade-in duration-200">
            {statusNote}
          </p>
        )}
      </div>
    </main>
  );
}
