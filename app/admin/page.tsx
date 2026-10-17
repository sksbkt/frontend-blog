import { Metadata } from "next";
import { getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { getSession } from "@/lib/auth/session";
import AdminDashboard from "@/components/admin/admin-dashboard";
import { GlobalTooltipProvider } from "@/components/ui/custom-tooltip";

export const metadata: Metadata = {
  title: "Admin Studio | Portfolio Project Management",
  description: "Manage portfolio projects, import from GitHub, and review AI-generated CMS drafts.",
};

export default async function AdminDirectPage() {
  const [session, messages] = await Promise.all([
    getSession(),
    getMessages({ locale: "en" }),
  ]);

  return (
    <NextIntlClientProvider messages={messages} locale="en">
      <GlobalTooltipProvider delayDuration={150} skipDelayDuration={100}>
        <main className="admin-page min-h-screen bg-background text-foreground transition-colors duration-200">
          <AdminDashboard initialSession={session} locale="en" />
        </main>
      </GlobalTooltipProvider>
    </NextIntlClientProvider>
  );
}
