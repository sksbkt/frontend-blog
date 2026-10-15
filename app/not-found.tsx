import StatusPageCard from "@/components/shared/status-page-card";

export const dynamic = "force-dynamic";

export default function RootNotFound() {
  return (
    <html lang="en">
      <body className="bg-background text-foreground antialiased min-h-screen flex items-center justify-center">
        <StatusPageCard
          variant="404"
          badgeText="Error 404 / خطای ۴۰۴"
          title="Page Not Found / صفحه مورد نظر پیدا نشد"
          description="The page you are looking for does not exist or has been moved. / متأسفانه صفحه‌ای که به دنبال آن بودید یافت نشد."
          primaryAction={{
            label: "Home / خانه",
            href: "/",
          }}
        />
      </body>
    </html>
  );
}
