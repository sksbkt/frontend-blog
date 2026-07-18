import { notFound } from "next/navigation";
import { getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import Navbar from "@/components/layout/navbar";

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
      <div
        dir={locale === "fa" ? "rtl" : "ltr"}
        lang={locale}
      >
        <Navbar />
        {children}
      </div>
    </NextIntlClientProvider>
  );
}
