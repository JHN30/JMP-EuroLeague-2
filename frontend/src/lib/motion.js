// Shared, restrained motion presets. Respecting prefers-reduced-motion is
// handled globally by <MotionConfig reducedMotion="user"> in App.jsx, so
// these presets don't need to check it themselves.

export const EASE_OUT = [0.16, 1, 0.3, 1];

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

// A page of dozens of cards: a tighter stagger so the last one still lands inside a second.
export const denseListContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.02, delayChildren: 0.02 } },
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

// Wide cards (the Games page): a lighter lift and press than cardHover, which suits small tiles.
export const wideCardHover = {
  whileHover: { y: -2 },
  whileTap: { scale: 0.985 },
  transition: { type: "spring", stiffness: 420, damping: 30 },
};

// A score or time pops in just after its card has appeared (inherits the card's show state).
export const centerPop = {
  hidden: { opacity: 0, scale: 0.85 },
  show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 380, damping: 22, delay: 0.1 } },
};

// Table bodies reveal their rows one after another; a row also works alone outside a body.
export const tableBody = {
  hidden: {},
  show: { transition: { staggerChildren: 0.02, delayChildren: 0.04 } },
};

export const tableRow = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE_OUT } },
};

// Bars fill from their baseline a beat after their row appears (transform only, so reduced motion skips it).
export const barFill = {
  initial: { scaleX: 0 },
  animate: { scaleX: 1 },
  transition: { duration: 0.6, delay: 0.15, ease: EASE_OUT },
};
