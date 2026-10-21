import type { Variants, Transition } from "framer-motion";

/**
 * KAEL-AI CENTRAL 60 FPS GPU-ACCELERATED FRAMER MOTION ARCHITECTURE
 * Only animates `transform` (x, y, scale) and `opacity` to prevent Cumulative Layout Shift (CLS).
 */

export const springSnappy: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 30,
  mass: 0.8,
};

export const springSmooth: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 26,
  mass: 0.9,
};

// 1. Page & Tab View Transitions
export const pageTransitionVariants: Variants = {
  initial: { opacity: 0, y: 10, scale: 0.992 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springSmooth,
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.992,
    transition: { duration: 0.16, ease: "easeIn" },
  },
};

// 2. Staggered Grid Container for Published Bots & Explore Showcase
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.055,
      delayChildren: 0.04,
    },
  },
};

// 3. Showcase & Bot Card Item (Hover lift + GPU scale)
export const cardItemVariants: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springSmooth,
  },
  hover: {
    y: -5,
    scale: 1.012,
    transition: springSnappy,
  },
  tap: {
    scale: 0.985,
  },
};

// 4. Chat Message Bubbles (Spring entrance)
export const messageBubbleVariants: Variants = {
  initial: { opacity: 0, y: 12, scale: 0.96 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springSnappy,
  },
  exit: {
    opacity: 0,
    scale: 0.94,
    transition: { duration: 0.14 },
  },
};

// 5. Modal & Drawer Backdrop + Dialog Panel
export const modalBackdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.18 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const modalPanelVariants: Variants = {
  initial: { opacity: 0, scale: 0.94, y: 16 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: springSnappy,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 12,
    transition: { duration: 0.15, ease: "easeIn" },
  },
};

// 6. Live Voice Dictation (STT) Waveform Equalizer Bar
export const waveformBarVariants = (peak: number, index: number): Variants => ({
  idle: { scaleY: 0.2 },
  speaking: {
    scaleY: [0.22, peak, 0.28, peak * 0.85, 0.22],
    transition: {
      repeat: Infinity,
      duration: 0.58 + (index % 5) * 0.11,
      ease: "easeInOut",
    },
  },
});
