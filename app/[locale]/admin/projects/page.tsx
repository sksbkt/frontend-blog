import { Metadata } from "next";
import { getSession } from "@/lib/auth/session";
import AdminDashboard from "@/components/admin/admin-dashboard";

export const metadata: Metadata = {
  title: "Admin Studio - Projects | Portfolio Project Management",
  description: "Manage portfolio projects, import from GitHub, and review AI-generated CMS drafts.",
  robots: {
    index: false,
    follow: false,
  },
};

interface AdminProjectsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function AdminProjectsPage({ params }: AdminProjectsPageProps) {
  const { locale } = await params;
  const session = await getSession();

  return (
    <main className="admin-page min-h-screen bg-background text-foreground transition-colors duration-200">
      <AdminDashboard initialSession={session} locale={locale} />
    </main>
  );
}
