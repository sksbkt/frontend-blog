import { Metadata } from "next";
import { getSession } from "@/lib/auth/session";
import AdminDashboard from "@/components/admin/admin-dashboard";

export const metadata: Metadata = {
  title: "Admin Studio | Portfolio Project Management",
  description: "Manage portfolio projects, import from GitHub, and review AI-generated CMS drafts.",
  robots: {
    index: false,
    follow: false,
  },
};

interface AdminPageProps {
  params: Promise<{ locale: string }>;
}

export default async function AdminPage({ params }: AdminPageProps) {
  const { locale } = await params;
  const session = await getSession();

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <AdminDashboard initialSession={session} locale={locale} />
    </main>
  );
}
