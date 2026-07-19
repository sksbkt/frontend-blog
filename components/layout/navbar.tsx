import { getTranslations, getLocale } from "next-intl/server";
import { ModeToggle } from "@/components/shared/mode-toggle";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import Container from "@/components/layout/container";
import Logo from "@/components/layout/logo";
import { Link } from "@/i18n/navigation";
export default async function Navbar() {
  const t = await getTranslations("nav");
  const locale = await getLocale();

  return (
    <header className="border-b">
      <Container>
        <nav className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Logo />
          {/* Navigation */}
          <div className="flex items-center gap-6 text-sm font-medium">
            <Link
              href={``}
              className="transition-colors hover:text-primary"
            >
              {t("home")}
            </Link>

            <Link
              href={`/blog`}
              className="transition-colors hover:text-primary"
            >
              {t("blog")}
            </Link>

            <Link
              href={`/projects`}
              className="transition-colors hover:text-primary"
            >
              {t("projects")}
            </Link>

            <Link
              href={`/about`}
              className="transition-colors hover:text-primary"
            >
              {t("about")}
            </Link>
            <LanguageSwitcher />
            <ModeToggle />
          </div>
        </nav>
      </Container>
    </header>
  );
}
