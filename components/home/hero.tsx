import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export default function Hero() {
  const t = useTranslations("hero");

  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-3xl px-6">
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              {t("title")}
            </h1>

            <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
              {t("description")}
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <Link href="/blog">
              <Button>
                {t("articles")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>

            <Link href="/projects">
              <Button variant="outline">{t("projects")}</Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
