import { getTranslations } from "next-intl/server";
import { Mail } from "lucide-react";

export default async function Contact() {
  const t = await getTranslations("homeContact");

  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="rounded-2xl border bg-card p-8 md:p-12">
          <div className="max-w-2xl">
            <span className="text-sm font-medium uppercase tracking-widest text-primary">
              {t("label")}
            </span>

            <h2 className="mt-2 text-3xl font-bold tracking-tight">
              {t("title")}
            </h2>

            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              {t("description")}
            </p>

            <a
              href="mailto:saeedkh.dev@gmail.com"
              className="mt-8 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Mail className="size-4" />
              {t("button")}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
