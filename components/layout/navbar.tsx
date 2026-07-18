import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { ModeToggle } from "@/components/shared/mode-toggle";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
export default async function Navbar() {
  const t = await getTranslations("nav");
  const locale = await getLocale();

  return (
    <header className="border-b">
      <nav className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link
          href={`/${locale}`}
          className="text-xl font-bold"
        >
          Frontend Blog
        </Link>

        {/* Navigation */}
        <div className="flex items-center gap-6 text-sm font-medium">
          <Link
            href={`/${locale}`}
            className="transition-colors hover:text-primary"
          >
            {t("home")}
          </Link>

          <Link
            href={`/${locale}/blog`}
            className="transition-colors hover:text-primary"
          >
            {t("blog")}
          </Link>

          <Link
            href={`/${locale}/projects`}
            className="transition-colors hover:text-primary"
          >
            {t("projects")}
          </Link>

          <Link
            href={`/${locale}/about`}
            className="transition-colors hover:text-primary"
          >
            {t("about")}
          </Link>
          <LanguageSwitcher />
          <ModeToggle />
        </div>
      </nav>
    </header>
  );
}
