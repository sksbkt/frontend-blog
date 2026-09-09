import { notFound } from "next/navigation";
import { getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";

import AppShell from "@/components/layout/app-shell";

const locales = ["fa", "en"] as const;

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!locales.includes(locale as (typeof locales)[number])) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <div dir={locale === "fa" ? "rtl" : "ltr"}>
      <NextIntlClientProvider messages={messages}>
        <AppShell>{children}</AppShell>
      </NextIntlClientProvider>
    </div>
  );
}
