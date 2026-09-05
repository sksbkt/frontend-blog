import { Mail } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { socialLinks } from "@/lib/data/links";

export default async function AboutPage() {
  const t = await getTranslations("about");

  return (
    <main className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <section className="max-w-4xl">
          <span className="text-sm font-medium uppercase tracking-widest text-primary">
            {t("label")}
          </span>

          <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">
            {t("title")}
          </h1>

          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            {t("description")}
          </p>
        </section>

        <section className="mt-20 grid gap-12 md:grid-cols-3">
          <div className="md:col-span-2">
            <h2 className="text-2xl font-bold tracking-tight">
              {t("story.title")}
            </h2>

            <div className="mt-6 space-y-5 text-lg leading-8 text-muted-foreground">
              <p>{t("story.paragraph1")}</p>
              <p>{t("story.paragraph2")}</p>
            </div>
          </div>

          <aside className="rounded-2xl border bg-card p-6">
            <h2 className="font-semibold">{t("skills.title")}</h2>

            <div className="mt-5 flex flex-wrap gap-2">
              {[
                "React",
                "Next.js",
                "TypeScript",
                "Tailwind CSS",
                "JavaScript",
                "Git",
              ].map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-muted px-3 py-1.5 text-sm"
                >
                  <span className="inline-block translate-y-px">{skill}</span>
                </span>
              ))}
            </div>
          </aside>
        </section>

        <section className="mt-20 rounded-2xl border bg-card p-8 md:p-10">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              {t("contact.title")}
            </h2>

            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              {t("contact.description")}
            </p>

            <a
              href={socialLinks.email.mailto}
              className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Mail className="size-4" />
              {t("contact.button")}
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
