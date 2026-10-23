import { create } from "zustand";
import {
  BUILTIN_THEMES,
  DEFAULT_THEME,
  THEME_TOKENS,
  applyTheme,
  isBuiltinTheme,
  readThemeColors,
  renderCustomThemes,
  type ThemeColors,
  type ThemeToken,
} from "../theme";
import { applyKeymap, keyBindings, type Keymap } from "../keymap/registry";
import { findConflict, isValidKeymapEntry, parseKeys } from "./keys";
import {
  applyMotion,
  isAnimationSetting,
  onReducedMotionChange,
  type AnimationSetting,
} from "../motion";

export const STORAGE_KEY = "blink-config";
export const LEGACY_THEME_KEY = "blink-theme";

const NAME_MAX = 32;

export type Config = {
  theme: string;
  keymap: Keymap;
  themes: Record<string, ThemeColors>;
  animations: AnimationSetting;
};

export type ConfigActions = {
  setAnimations: (value: string) => string | null;
  setTheme: (name: string) => string | null;
  setKeys: (bindingId: string, input: string) => string | null;
  resetKeys: (bindingId: string) => void;
  duplicateTheme: (from: string) => string | null;
  renameTheme: (from: string, input: string) => string | null;
  deleteTheme: (name: string) => void;
  setThemeColor: (
    name: string,
    token: ThemeToken,
    input: string,
  ) => string | null;
};

export const isColor = (v: string) =>
  /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v);

export const isThemeName = (v: string) =>
  v.length <= NAME_MAX && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v);

export const defaultConfig = (): Config => ({
  theme: DEFAULT_THEME,
  keymap: {},
  themes: {},
  animations: "auto",
});

export const themeNames = (themes: Record<string, ThemeColors>) => [
  ...BUILTIN_THEMES,
  ...Object.keys(themes),
];

const isObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

function sanitizeColors(raw: unknown): ThemeColors | null {
  if (!isObject(raw)) return null;
  const colors: Partial<ThemeColors> = {};
  for (const t of THEME_TOKENS) {
    const value = raw[t];
    if (typeof value !== "string" || !isColor(value)) return null;
    colors[t] = value.toLowerCase();
  }
  return colors as ThemeColors;
}

export function sanitizeConfig(
  raw: unknown,
  legacyTheme: string | null = null,
): Config {
  const input = isObject(raw) ? raw : {};
  const config = defaultConfig();

  if (isObject(input.themes)) {
    for (const [name, value] of Object.entries(input.themes)) {
      if (!isThemeName(name) || isBuiltinTheme(name)) continue;
      const colors = sanitizeColors(value);
      if (colors) config.themes[name] = colors;
    }
  }

  if (isObject(input.keymap)) {
    for (const [id, keys] of Object.entries(input.keymap)) {
      if (isValidKeymapEntry(keys)) config.keymap[id] = keys;
    }
  }

  if (isAnimationSetting(input.animations)) config.animations = input.animations;

  const theme = typeof input.theme === "string" ? input.theme : legacyTheme;
  if (theme && themeNames(config.themes).includes(theme)) config.theme = theme;

  return config;
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function loadConfig(): Config {
  let raw: unknown = null;
  try {
    raw = JSON.parse(read(STORAGE_KEY) ?? "null");
  } catch {
    raw = null;
  }
  return sanitizeConfig(raw, read(LEGACY_THEME_KEY));
}

function saveConfig({ theme, keymap, themes, animations }: Config) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ theme, keymap, themes, animations }),
    );
  } catch {
    return;
  }
}

const sameKeys = (a: string[], b: string[]) =>
  a.length === b.length && a.every((k, i) => k === b[i]);

export function normalizeName(input: string) {
  return input.trim().toLowerCase().replace(/\s+/g, "-");
}

function uniqueName(base: string, taken: string[]) {
  const stem = `${base}-copy`.slice(0, NAME_MAX - 3).replace(/-+$/, "");
  if (!taken.includes(stem)) return stem;
  for (let n = 2; ; n++) {
    const candidate = `${stem}-${n}`;
    if (!taken.includes(candidate)) return candidate;
  }
}

function withoutKey<T>(
  record: Record<string, T>,
  key: string,
): Record<string, T> {
  const { [key]: _, ...rest } = record;
  return rest;
}

type ConfigStore = Config & ConfigActions;

export const useConfigStore = create<ConfigStore>((set, get) => ({
  ...loadConfig(),

  setTheme: (name) => {
    if (!themeNames(get().themes).includes(name))
      return `unknown theme "${name}"`;
    if (get().theme !== name) set({ theme: name });
    return null;
  },

  setAnimations: (value) => {
    if (!isAnimationSetting(value)) return `use auto, on or off`;
    if (get().animations !== value) set({ animations: value });
    return null;
  },

  setKeys: (bindingId, input) => {
    const binding = keyBindings.find((b) => b.id === bindingId);
    if (!binding) return "unknown binding";
    if (binding.fixed) return "this binding can't be changed";

    const parsed = parseKeys(input);
    if ("error" in parsed) return parsed.error;
    if (parsed.keys.length === 0 || sameKeys(parsed.keys, binding.keys)) {
      get().resetKeys(bindingId);
      return null;
    }

    const { keymap } = get();
    const conflict = findConflict(bindingId, parsed.keys, keymap);
    if (conflict) {
      return conflict.binding === binding
        ? `"${conflict.key}" would hide the longer sequence that starts with it`
        : `"${conflict.key}" is already used by "${conflict.binding.description}" (${conflict.binding.scope})`;
    }

    const current = keymap[bindingId];
    if (current && sameKeys(current, parsed.keys)) return null;
    set({ keymap: { ...keymap, [bindingId]: parsed.keys } });
    return null;
  },

  resetKeys: (bindingId) => {
    const { keymap } = get();
    if (!(bindingId in keymap)) return;
    set({ keymap: withoutKey(keymap, bindingId) });
  },

  duplicateTheme: (from) => {
    const { themes } = get();
    const names = themeNames(themes);
    if (!names.includes(from)) return null;

    const name = uniqueName(from, names);
    const colors = themes[from]
      ? { ...themes[from] }
      : readThemeColors(from, isColor);
    set({ themes: { ...themes, [name]: colors }, theme: name });
    return name;
  },

  renameTheme: (from, input) => {
    const { themes, theme } = get();
    if (!themes[from]) return "only custom themes can be renamed";

    const name = normalizeName(input);
    if (name === from) return null;
    if (!isThemeName(name))
      return `use a-z, 0-9 and single dashes, up to ${NAME_MAX} chars`;
    if (themeNames(themes).includes(name)) return `"${name}" already exists`;

    const next: Record<string, ThemeColors> = {};
    for (const [key, value] of Object.entries(themes))
      next[key === from ? name : key] = value;
    set({ themes: next, theme: theme === from ? name : theme });
    return null;
  },

  deleteTheme: (name) => {
    const { themes, theme } = get();
    if (!themes[name]) return;
    set({
      themes: withoutKey(themes, name),
      theme: theme === name ? DEFAULT_THEME : theme,
    });
  },

  setThemeColor: (name, token, input) => {
    const { themes } = get();
    const colors = themes[name];
    if (!colors) return "only custom themes can be edited";
    if (!THEME_TOKENS.includes(token)) return "unknown color";

    const raw = input.trim().toLowerCase();
    const value = raw.startsWith("#") ? raw : `#${raw}`;
    if (!isColor(value)) return "use a hex color like #282828";
    if (colors[token] === value) return null;

    set({ themes: { ...themes, [name]: { ...colors, [token]: value } } });
    return null;
  },
}));

useConfigStore.subscribe((s, prev) => {
  if (s.themes !== prev.themes) renderCustomThemes(s.themes);
  if (s.theme !== prev.theme) applyTheme(s.theme);
  if (s.keymap !== prev.keymap) applyKeymap(s.keymap);
  if (s.animations !== prev.animations) applyMotion(s.animations);
  if (
    s.themes !== prev.themes ||
    s.theme !== prev.theme ||
    s.keymap !== prev.keymap ||
    s.animations !== prev.animations
  ) {
    saveConfig(s);
  }
});

export function bootConfig() {
  const s = useConfigStore.getState();
  renderCustomThemes(s.themes);
  applyTheme(s.theme);
  applyKeymap(s.keymap);
  applyMotion(s.animations);
  onReducedMotionChange(() => applyMotion(useConfigStore.getState().animations));
}
