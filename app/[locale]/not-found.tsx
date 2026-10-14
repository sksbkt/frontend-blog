"use client";

import { useLocale } from "next-intl";
import StatusPageCard from "@/components/shared/status-page-card";

export default function NotFound() {
  const locale = useLocale();
  const isFa = locale === "fa";

  return (
    <StatusPageCard
      variant="404"
      badgeText={isFa ? "خطای ۴۰۴" : "Error 404"}
      title={isFa ? "صفحه مورد نظر پیدا نشد" : "Page Not Found"}
      description={
        isFa
          ? "متأسفانه صفحه‌ای که به دنبال آن بودید یافت نشد یا ممکن است منتقل شده باشد."
          : "The page you are looking for might have been removed, had its name changed, or is temporarily unavailable."
      }
      primaryAction={{
        label: isFa ? "بازگشت به خانه" : "Back to Home",
        href: `/${locale}`,
      }}
      secondaryAction={{
        label: isFa ? "صفحه قبل" : "Go Back",
      }}
    />
  );
}
