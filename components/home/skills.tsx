import { getTranslations } from "next-intl/server";

import { skillCategories } from "@/lib/data/skills";

export default async function Skills() {
  const t = await getTranslations("skills");

  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-10">
          <span className="text-sm font-medium uppercase tracking-widest text-primary">
            {t("label")}
          </span>

          <h2 className="mt-2 text-3xl font-bold tracking-tight">
            {t("title")}
          </h2>

          <p className="mt-3 max-w-2xl text-muted-foreground">
            {t("description")}
          </p>
        </div>

        <div className="space-y-10">
          {skillCategories.map((category) => (
            <div key={category.id}>
              <h3 className="mb-4 text-lg font-semibold">
                {t(`categories.${category.id}`)}
              </h3>

              <div className="flex flex-wrap gap-3">
                {category.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border bg-card px-4 py-2 text-sm transition-colors hover:border-primary hover:text-primary"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
