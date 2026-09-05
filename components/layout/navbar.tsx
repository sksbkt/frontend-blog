import { getTranslations } from "next-intl/server";
import { ModeToggle } from "@/components/shared/mode-toggle";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import Container from "@/components/layout/container";
import Logo from "@/components/layout/logo";
import { Link } from "@/i18n/navigation";

export default async function Navbar() {
  const t = await getTranslations("nav");

  return (
    <header className="border-b">
      <Container>
        <nav className="flex h-16 items-center">
          <Logo />

          <div className="flex flex-1 items-center px-8">
            <div className="flex items-center gap-6 text-sm font-medium">
              <Link href="/">{t("home")}</Link>
              <Link href="/blog">{t("blog")}</Link>
              <Link href="/projects">{t("projects")}</Link>
              <Link href="/about">{t("about")}</Link>
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <ModeToggle />
            </div>
          </div>
        </nav>
      </Container>
    </header>
  );
}
