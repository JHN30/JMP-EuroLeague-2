// Shared, restrained motion presets (see UI-UX.md §11). Respecting
// prefers-reduced-motion is handled globally by <MotionConfig reducedMotion="user">
// in App.jsx, so these presets don't need to check it themselves.

const EASE_OUT = [0.16, 1, 0.3, 1];

export const sectionContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

export const sectionItem = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT } },
};

export const listContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.02 } },
};

export const listItem = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE_OUT } },
};

export const cardHover = {
  whileHover: { y: -3 },
  whileTap: { scale: 0.97 },
  transition: { type: "spring", stiffness: 420, damping: 28 },
};
