"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export default function OfflineReconnectButton({
  label,
  locale,
}: {
  label: string;
  locale: string;
}) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleReconnect = async () => {
    setChecking(true);
    setStatus(locale === "fa" ? "در حال بررسی اتصال..." : "Checking connection...");
    try {
      const res = await fetch("/manifest.json?_t=" + Date.now(), {
        method: "HEAD",
        cache: "no-store",
      });
      if (res.ok) {
        setStatus(locale === "fa" ? "اتصال برقرار شد! در حال انتقال..." : "Connected! Redirecting...");
        setTimeout(() => {
          router.replace(`/${locale}`);
          router.refresh();
        }, 300);
      } else {
        throw new Error("Offline");
      }
    } catch {
      setTimeout(() => {
        setChecking(false);
        setStatus(locale === "fa" ? "هنوز به اینترنت متصل نیستید." : "Still offline.");
      }, 600);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full sm:w-auto">
      <button
        type="button"
        onClick={handleReconnect}
        disabled={checking}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
      >
        <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
        <span>{label}</span>
      </button>
      {status && <p className="text-xs text-muted-foreground">{status}</p>}
    </div>
  );
}
