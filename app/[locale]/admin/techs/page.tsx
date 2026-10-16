import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { TechDictionaryManager } from "@/components/admin/tech-dictionary-manager";

export const metadata: Metadata = {
  title: "Tech Dictionary CMS | Portfolio Admin Studio",
  description: "Canonical technology taxonomy, alias resolver, and bilingual summary dictionary.",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface TechsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function TechsPage({ params }: TechsPageProps) {
  const { locale } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/${locale}/admin`);
  }

  return (
    <main className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <TechDictionaryManager locale={locale} />
    </main>
  );
}
