export const DEFAULT_THEME = "gruvbox";

export const BUILTIN_THEMES = [
  "gruvbox",
  "catppuccin-mocha",
  "nord",
  "flexoki-light",
  "flexoki-dark",
];

export const THEME_TOKENS = [
  "bg",
  "bg-soft",
  "bg-lighter",
  "fg",
  "fg-dim",
  "fg-muted",
  "accent",
  "urgent",
  "high",
  "normal",
  "low",
  "done",
  "tag",
  "group",
  "task",
  "status",
  "border",
  "cursor",
  "danger",
] as const;

export type ThemeToken = (typeof THEME_TOKENS)[number];
export type ThemeColors = Record<ThemeToken, string>;

const FALLBACK_COLOR = "#000000";
const STYLE_ID = "blink-custom-themes";

export const isBuiltinTheme = (name: string) => BUILTIN_THEMES.includes(name);

export const applyTheme = (name: string) => {
  document.documentElement.className = `theme-${name}`;
};

export function renderCustomThemes(themes: Record<string, ThemeColors>) {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }

  style.textContent = Object.entries(themes)
    .map(([name, colors]) => {
      const vars = THEME_TOKENS.map((t) => `--${t}:${colors[t]};`).join("");
      return `.theme-${name}{${vars}}`;
    })
    .join("\n");
}

export function readThemeColors(
  name: string,
  isColor: (v: string) => boolean,
): ThemeColors {
  const probe = document.createElement("div");
  probe.className = `theme-${name}`;
  probe.style.display = "none";
  document.body.appendChild(probe);

  const own = getComputedStyle(probe);
  const root = getComputedStyle(document.documentElement);

  const colors = Object.fromEntries(
    THEME_TOKENS.map((t) => {
      const value = own.getPropertyValue(`--${t}`).trim().toLowerCase();
      const current = root.getPropertyValue(`--${t}`).trim().toLowerCase();
      return [
        t,
        isColor(value) ? value : isColor(current) ? current : FALLBACK_COLOR,
      ];
    }),
  ) as ThemeColors;

  probe.remove();
  return colors;
}
