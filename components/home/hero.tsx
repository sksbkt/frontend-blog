"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import CodeWindow from "@/components/home/code-window";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

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

const developer = {
  name: "Developer",

  stack: ["Next.js", "TypeScript", "React", "Tailwind CSS", "Sanity"],

  focus: [
    "Clean interfaces",
    "Responsive design",
    "Accessible UX",
    "Performance",
  ],

  building: [
    "Modern web apps",
    "Content-driven websites",
    "Useful digital products",
    "Scalable experiences",
  ],
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
            transition={{
              duration: 0.6,
              ease: "easeOut",
            }}
            className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm backdrop-blur"
          >
            <Sparkles className="size-4 text-primary" />

            <span>Developer · Builder · Problem Solver</span>
          </motion.div>

          <div className="space-y-6">
            <motion.h1
              variants={fadeUp}
              transition={{
                duration: 0.7,
                ease: "easeOut",
              }}
              className="max-w-3xl text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl"
            >
              {t("title")}
            </motion.h1>

            <motion.p
              variants={fadeUp}
              transition={{
                duration: 0.7,
                ease: "easeOut",
              }}
              className="max-w-2xl text-lg leading-8 text-muted-foreground md:text-xl"
            >
              {t("description")}
            </motion.p>
          </div>

          <motion.div
            variants={fadeUp}
            transition={{
              duration: 0.7,
              ease: "easeOut",
            }}
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

          <CodeWindow
            title="developer.tsx"
            data={developer}
          />
        </motion.div>
      </div>
    </section>
  );
}
