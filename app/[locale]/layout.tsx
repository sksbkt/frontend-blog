import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import AppShell from "@/components/layout/app-shell";
import HtmlConfig from "@/components/shared/html-config";
const locales = ["fa", "en"];

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!locales.includes(locale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <HtmlConfig />
      <AppShell>{children}</AppShell>
    </NextIntlClientProvider>
  );
}
