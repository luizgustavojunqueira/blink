import { THEME_TOKENS, isBuiltinTheme, type ThemeToken } from "../theme";
import { keyBindings } from "../keymap/registry";
import type { KeyBinding } from "../keymap/types";
import { effectiveKeys } from "./keys";
import { colorRowId, keyRowId, themeRowId } from "./rowId";
import { themeNames, type Config } from "./store";

export type ThemeRow = {
  id: string;
  kind: "theme";
  name: string;
  builtin: boolean;
  active: boolean;
};
export type ColorRow = {
  id: string;
  kind: "color";
  theme: string;
  token: ThemeToken;
  value: string;
};
export type KeyRow = {
  id: string;
  kind: "key";
  binding: KeyBinding;
  keys: string[];
  isDefault: boolean;
};

export type ConfigRow = ThemeRow | ColorRow | KeyRow;

const SCOPE_ORDER: KeyBinding["scope"][] = ["global", "list", "detail"];

export const remappableBindings = SCOPE_ORDER.flatMap((scope) =>
  keyBindings.filter((b) => b.scope === scope && !b.fixed),
);

export function configRows({ theme, themes, keymap }: Config): ConfigRow[] {
  const rows: ConfigRow[] = themeNames(themes).map((name) => ({
    id: themeRowId(name),
    kind: "theme",
    name,
    builtin: isBuiltinTheme(name),
    active: name === theme,
  }));

  const colors = themes[theme];
  if (colors) {
    for (const token of THEME_TOKENS) {
      rows.push({
        id: colorRowId(token),
        kind: "color",
        theme,
        token,
        value: colors[token],
      });
    }
  }

  for (const binding of remappableBindings) {
    rows.push({
      id: keyRowId(binding.id),
      kind: "key",
      binding,
      keys: effectiveKeys(binding, keymap),
      isDefault: !keymap[binding.id],
    });
  }

  return rows;
}
