import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { MotionWrapper } from "@/components/shared/motion-wrapper";

export default async function Hero() {
  const t = await getTranslations("hero");

  return (
    <section className="container mx-auto flex min-h-[calc(100vh-5rem)] items-center px-4">
      <div className="max-w-3xl space-y-6">
        <MotionWrapper>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            {t("title")}
          </h1>
        </MotionWrapper>

        <MotionWrapper delay={0.15}>
          <p className="text-lg text-muted-foreground sm:text-xl">
            {t("description")}
          </p>
        </MotionWrapper>

        <MotionWrapper delay={0.3}>
          <div className="flex flex-wrap gap-4">
            <Link
              href="#articles"
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              {t("primaryButton")}
            </Link>

            <Link
              href="#projects"
              className="inline-flex h-10 items-center gap-2 justify-center rounded-md border px-6 text-sm font-medium transition hover:bg-accent"
            >
              {t("secondaryButton")}

              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </MotionWrapper>
      </div>
    </section>
  );
}
