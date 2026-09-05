import { socialLinks } from "@/lib/data/links";
import { getTranslations } from "next-intl/server";

const links = [
  {
    name: socialLinks.github.name,
    href: socialLinks.github.link,
    icon: socialLinks.github.icon,
  },
  {
    name: socialLinks.linkedin.name,
    href: socialLinks.linkedin.link,
    icon: socialLinks.linkedin.icon,
  },
];

export default async function About() {
  const t = await getTranslations("homeAbout");

  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-3xl">
          <span className="text-sm font-medium uppercase tracking-widest text-primary">
            {t("label")}
          </span>

          <h2 className="mt-2 text-3xl font-bold tracking-tight">
            {t("title")}
          </h2>

          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            {t("paragraph1")}
          </p>

          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            {t("paragraph2")}
          </p>

          <div className="mt-8 flex gap-4">
            {links.map(({ name, href, icon: Icon }) => (
              <a
                key={name}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-2 rounded-lg border px-4 text-sm leading-none transition-colors hover:bg-muted"
              >
                <Icon className="size-4" />
                <span className="relative translate-y-0.5">{name}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
