"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Code2 } from "lucide-react";
import { useEffect, useState } from "react";

type CodeWindowData = {
  name: string;
  stack: string[];
  focus: string[];
  building: string[];
};

type CodeWindowProps = {
  title: string;
  data: CodeWindowData;
};

type CyclingValueProps = {
  label: string;
  items: string[];
  lineNumber: string;
  rowIndex: number;
  step: number;
};

function CyclingValue({
  label,
  items,
  lineNumber,
  rowIndex,
  step,
}: CyclingValueProps) {
  /*
   * Animation order:
   *
   * 0s  → stack changes
   * 3s  → focus changes
   * 6s  → building changes
   * 9s  → stack changes again
   * ...
   */

  const cycle = Math.floor((step + (2 - rowIndex)) / 3);

  const pairIndex = (cycle * 2) % items.length;

  const firstItem = items[pairIndex];
  const secondItem = items[(pairIndex + 1) % items.length];

  return (
    <div className="flex min-h-8 items-center">
      <span className="text-muted-foreground">{lineNumber}</span>

      <span className="ms-5 text-sky-500">{label}</span>

      <span className="text-muted-foreground">:</span>

      <div className="ms-2 flex min-w-0 flex-1 items-center overflow-hidden">
        <span className="shrink-0 text-muted-foreground">[</span>

        <AnimatePresence mode="wait">
          <motion.span
            key={pairIndex}
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: -10,
            }}
            transition={{
              duration: 0.35,
              ease: "easeOut",
            }}
            className="inline-flex min-w-0 items-center gap-1 whitespace-nowrap"
          >
            <span className="text-green-500">&quot;{firstItem}&quot;</span>

            <span className="text-muted-foreground">,</span>

            <span className="text-green-500">&quot;{secondItem}&quot;</span>
          </motion.span>
        </AnimatePresence>

        <span className="shrink-0 text-muted-foreground">],</span>
      </div>
    </div>
  );
}

export default function CodeWindow({ title, data }: CodeWindowProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((current) => current + 1);
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
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
          <span>{title}</span>
        </div>
      </div>

      <div className="p-6 font-mono text-sm leading-8">
        <div>
          <span className="text-muted-foreground">01</span>
          <span className="ms-5 text-purple-500">const</span>{" "}
          <span className="text-primary">developer</span>{" "}
          <span className="text-muted-foreground">=</span> <span>{"{"}</span>
        </div>

        <div>
          <span className="text-muted-foreground">02</span>
          <span className="ms-5 text-sky-500">name</span>
          <span className="text-muted-foreground">:</span>{" "}
          <span className="text-green-500">&quot;{data.name}&quot;</span>
          <span className="text-muted-foreground">,</span>
        </div>

        <CyclingValue
          label="stack"
          items={data.stack}
          lineNumber="03"
          rowIndex={0}
          step={step}
        />

        <CyclingValue
          label="focus"
          items={data.focus}
          lineNumber="04"
          rowIndex={1}
          step={step}
        />

        <CyclingValue
          label="building"
          items={data.building}
          lineNumber="05"
          rowIndex={2}
          step={step}
        />

        <div>
          <span className="text-muted-foreground">06</span>

          <span className="ms-5">{"}"}</span>

          <span className="text-muted-foreground">;</span>
        </div>

        <div className="mt-6 border-t pt-5 text-muted-foreground">
          <span className="text-muted-foreground">07</span>
          <span className="ms-5 text-purple-500">export default</span>{" "}
          <span className="text-primary">developer</span>
          <span className="text-muted-foreground">;</span>
        </div>
      </div>
    </motion.div>
  );
}
