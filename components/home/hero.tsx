"use client";

import { motion } from "framer-motion";
import { ArrowRight, Code2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: {
    opacity: 0,
    y: 24,
  },
  visible: {
    opacity: 1,
    y: 0,
  },
};

export default function Hero() {
  const t = useTranslations("hero");

  return (
    <section className="relative overflow-hidden py-24 md:py-32">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.35)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.35)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_75%)]" />

        <motion.div
          className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.5, 0.75, 0.5],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="mx-auto grid max-w-6xl items-center gap-16 px-6 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.div
          initial="hidden"
          animate="visible"
          transition={{
            staggerChildren: 0.12,
          }}
          className="space-y-8"
        >
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm backdrop-blur"
          >
            <Sparkles className="size-4 text-primary" />

            <span>Developer · Builder · Problem Solver</span>
          </motion.div>

          <div className="space-y-6">
            <motion.h1
              variants={fadeUp}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="max-w-3xl text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl"
            >
              {t("title")}
            </motion.h1>

            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="max-w-2xl text-lg leading-8 text-muted-foreground md:text-xl"
            >
              {t("description")}
            </motion.p>
          </div>

          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="flex flex-wrap gap-4"
          >
            <Link href="/projects">
              <Button size="lg">
                {t("projects")}
                <ArrowRight className="ms-2 size-4 rtl:rotate-180" />
              </Button>
            </Link>

            <Link href="/blog">
              <Button
                variant="outline"
                size="lg"
              >
                {t("articles")}
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{
            opacity: 0,
            x: 40,
          }}
          animate={{
            opacity: 1,
            x: 0,
          }}
          transition={{
            duration: 0.9,
            delay: 0.25,
            ease: "easeOut",
          }}
          className="relative mx-auto w-full max-w-lg"
        >
          <motion.div
            className="absolute -inset-6 rounded-3xl bg-primary/10 blur-3xl"
            animate={{
              opacity: [0.4, 0.7, 0.4],
              scale: [1, 1.04, 1],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          <motion.div
            dir="ltr"
            whileHover={{
              y: -4,
              scale: 1.01,
            }}
            transition={{
              duration: 0.25,
              ease: "easeOut",
            }}
            className="relative overflow-hidden rounded-2xl border bg-card/90 text-left shadow-2xl backdrop-blur"
          >
            <div className="flex items-center gap-2 border-b px-5 py-4">
              <span className="size-3 rounded-full bg-muted-foreground/30" />
              <span className="size-3 rounded-full bg-muted-foreground/30" />
              <span className="size-3 rounded-full bg-muted-foreground/30" />

              <div className="ms-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Code2 className="size-4" />
                <span>developer.tsx</span>
              </div>
            </div>

            <div className="p-6 font-mono text-sm leading-8">
              <div>
                <span className="text-muted-foreground">01</span>
                <span className="ms-5 text-purple-500">const</span>{" "}
                <span className="text-primary">developer</span>{" "}
                <span className="text-muted-foreground">=</span>{" "}
                <span>{"{"}</span>
              </div>

              <div>
                <span className="text-muted-foreground">02</span>
                <span className="ms-5 text-sky-500">name</span>
                <span className="text-muted-foreground">:</span>{" "}
                <span className="text-green-500">&quot;Developer&quot;</span>
                <span className="text-muted-foreground">,</span>
              </div>

              <div>
                <span className="text-muted-foreground">03</span>
                <span className="ms-5 text-sky-500">stack</span>
                <span className="text-muted-foreground">:</span>{" "}
                <span className="text-green-500">
                  &quot;Next.js + TypeScript&quot;
                </span>
                <span className="text-muted-foreground">,</span>
              </div>

              <div>
                <span className="text-muted-foreground">04</span>
                <span className="ms-5 text-sky-500">focus</span>
                <span className="text-muted-foreground">:</span>{" "}
                <span className="text-green-500">
                  &quot;Clean interfaces&quot;
                </span>
                <span className="text-muted-foreground">,</span>
              </div>

              <div>
                <span className="text-muted-foreground">05</span>
                <span className="ms-5 text-sky-500">building</span>
                <span className="text-muted-foreground">:</span>{" "}
                <span className="text-green-500">
                  &quot;Useful things&quot;
                </span>
                <span className="text-muted-foreground">,</span>
              </div>

              <div>
                <span className="text-muted-foreground">06</span>
                <span className="ms-5">{"}"}</span>
                <span className="text-muted-foreground">;</span>
              </div>

              <div className="mt-6 border-t pt-5 text-muted-foreground">
                <span className="text-muted-foreground">07</span>
                <span className="ms-5 text-purple-500">
                  export default
                </span>{" "}
                <span className="text-primary">developer</span>
                <span className="text-muted-foreground">;</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
