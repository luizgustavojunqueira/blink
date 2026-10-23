export const ANIMATION_SETTINGS = ["auto", "on", "off"] as const;

export type AnimationSetting = (typeof ANIMATION_SETTINGS)[number];

export const isAnimationSetting = (v: unknown): v is AnimationSetting =>
  (ANIMATION_SETTINGS as readonly unknown[]).includes(v);

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

const prefersReducedMotion = () =>
  typeof matchMedia === "function" && matchMedia(REDUCED_MOTION).matches;

export const motionEnabled = (setting: AnimationSetting) =>
  setting === "on" || (setting === "auto" && !prefersReducedMotion());

export const applyMotion = (setting: AnimationSetting) => {
  document.documentElement.dataset.motion = motionEnabled(setting) ? "on" : "off";
};

export const onReducedMotionChange = (listener: () => void) => {
  if (typeof matchMedia !== "function") return;
  matchMedia(REDUCED_MOTION).addEventListener("change", listener);
};
