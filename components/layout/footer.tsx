import { getTranslations } from "next-intl/server";

import { socialLinks } from "@/lib/data/links";

const links = [
  {
    key: "github",
    href: socialLinks.github.link,
    icon: socialLinks.github.icon,
  },
  {
    key: "linkedin",
    href: socialLinks.linkedin.link,
    icon: socialLinks.linkedin.icon,
  },
  {
    key: "email",
    href: socialLinks.email.mailto,
    icon: socialLinks.email.icon,
  },
];

export default async function Footer() {
  const t = await getTranslations("footer");

  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold">Ali</p>

          <p className="mt-1 text-sm text-muted-foreground">{t("role")}</p>
        </div>

        <div className="flex gap-4">
          {links.map(({ key, href, icon: Icon }) => (
            <a
              key={key}
              href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <Icon className="size-5" />
              <span className="sr-only">{t(key)}</span>
            </a>
          ))}
        </div>
      </div>

      <div className="border-t py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Ali. {t("copyright")}
      </div>
    </footer>
  );
}
