import { motion } from "motion/react";
import { tableBody, tableRow } from "../lib/motion";

// A table body whose rows fade up one after another when it first appears.
export function AnimatedBody(props) {
  return <motion.tbody variants={tableBody} initial="hidden" animate="show" {...props} />;
}

export function AnimatedRow(props) {
  return <motion.tr variants={tableRow} {...props} />;
}
