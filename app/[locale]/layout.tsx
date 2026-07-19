import AppShell from "@/components/layout/app-shell";
import HtmlConfig from "@/components/shared/html-config";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

export default async function LocaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <ThemeProvider>
        <HtmlConfig />

        <AppShell>{children}</AppShell>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
