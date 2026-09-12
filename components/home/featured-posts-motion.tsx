"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

type FeaturedPostsMotionProps = {
  title: string;
  children: ReactNode;
};

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 24,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
};

export default function FeaturedPostsMotion({
  title,
  children,
}: FeaturedPostsMotionProps) {
  return (
    <>
      <motion.div
        initial={{
          opacity: 0,
          y: 20,
        }}
        whileInView={{
          opacity: 1,
          y: 0,
        }}
        viewport={{
          once: true,
          amount: 0.3,
        }}
        transition={{
          duration: 0.6,
          ease: "easeOut",
        }}
        className="flex items-center justify-between"
      >
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{
          once: true,
          amount: 0.15,
        }}
        variants={containerVariants}
        className="grid gap-6 md:grid-cols-2"
      >
        {children}
      </motion.div>
    </>
  );
}
