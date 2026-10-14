"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import StatusPageCard from "@/components/shared/status-page-card";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = useLocale();
  const isFa = locale === "fa";

  useEffect(() => {
    console.error("Application error boundary caught:", error);
  }, [error]);

  return (
    <StatusPageCard
      variant="500"
      badgeText={isFa ? "خطای سیستم" : "System Error"}
      title={isFa ? "مشکلی در پردازش پیش آمده است" : "Something went wrong"}
      description={
        isFa
          ? "در ارتباط یا بارگذاری اطلاعات خطایی رخ داده است. می‌توانید دوباره امتحان کنید."
          : "An unexpected error occurred while processing your request. Please try again."
      }
      primaryAction={{
        label: isFa ? "تلاش مجدد" : "Try Again",
        onClick: reset,
      }}
      secondaryAction={{
        label: isFa ? "صفحه اصلی" : "Back to Home",
        href: `/${locale}`,
      }}
    />
  );
}
