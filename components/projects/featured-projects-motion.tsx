"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

type FeaturedProjectsMotionProps = {
  title: ReactNode;
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

export default function FeaturedProjectsMotion({
  title,
  children,
}: FeaturedProjectsMotionProps) {
  return (
    <>
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{
          once: true,
          amount: 0.3,
        }}
        variants={itemVariants}
      >
        {title}
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{
          once: true,
          amount: 0.15,
        }}
        variants={containerVariants}
        className="grid gap-8 md:grid-cols-2"
      >
        {Array.isArray(children) ? (
          children.map((child, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
            >
              {child}
            </motion.div>
          ))
        ) : (
          <motion.div variants={itemVariants}>{children}</motion.div>
        )}
      </motion.div>
    </>
  );
}
