import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import StatusPageCard from "@/components/shared/status-page-card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isFa = locale === "fa";
  return {
    title: isFa ? "شما آفلاین هستید" : "You're Offline",
    description: isFa
      ? "ارتباط اینترنت شما قطع شده است."
      : "You are currently offline.",
  };
}

export default async function OfflinePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isFa = locale === "fa";
  const t = await getTranslations("network");

  return (
    <StatusPageCard
      variant="offline"
      badgeText={isFa ? "عدم اتصال به اینترنت" : "No Internet Connection"}
      title={t("offlineTitle")}
      description={t("offlineDesc")}
      autoReconnect={true}
      primaryAction={{
        label: t("retry"),
      }}
      secondaryAction={{
        label: isFa ? "صفحه اصلی" : "Home",
        href: `/${locale}`,
      }}
    />
  );
}
