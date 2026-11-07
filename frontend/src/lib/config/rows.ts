import { THEME_TOKENS, isBuiltinTheme, type ThemeToken } from "../theme";
import { keyBindings } from "../keymap/registry";
import type { KeyBinding } from "../keymap/types";
import { effectiveKeys } from "./keys";
import type { GetAgentResponse } from "../../types/backend";
import type { AnimationSetting } from "../motion";
import type { LanguageSetting } from "../i18n";
import { AGENT_NEW_ROW_ID, ANIMATIONS_ROW_ID, LANGUAGE_ROW_ID, agentRowId, colorRowId, keyRowId, themeRowId } from "./rowId";
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

export type AgentNewRow = { id: string; kind: "agentNew" };
export type AgentRow = {
  id: string;
  kind: "agent";
  agent: GetAgentResponse;
};

export type AnimationsRow = {
  id: string;
  kind: "animations";
  value: AnimationSetting;
};

export type LanguageRow = {
  id: string;
  kind: "language";
  value: LanguageSetting;
};

export type ConfigRow =
  | ThemeRow
  | ColorRow
  | KeyRow
  | AgentNewRow
  | AgentRow
  | AnimationsRow
  | LanguageRow;

export const sectionOf = (row: ConfigRow) => (row.kind === "agentNew" ? "agent" : row.kind);

const SCOPE_ORDER: KeyBinding["scope"][] = ["global", "list", "detail"];

export const remappableBindings = SCOPE_ORDER.flatMap((scope) =>
  keyBindings.filter((b) => b.scope === scope && !b.fixed),
);

export function configRows(
  { theme, themes, keymap, animations, language }: Config,
  agents: GetAgentResponse[] = [],
): ConfigRow[] {
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

  rows.push({ id: ANIMATIONS_ROW_ID, kind: "animations", value: animations });
  rows.push({ id: LANGUAGE_ROW_ID, kind: "language", value: language });

  for (const binding of remappableBindings) {
    rows.push({
      id: keyRowId(binding.id),
      kind: "key",
      binding,
      keys: effectiveKeys(binding, keymap),
      isDefault: !keymap[binding.id],
    });
  }

  rows.push({ id: AGENT_NEW_ROW_ID, kind: "agentNew" });
  for (const agent of agents) {
    rows.push({ id: agentRowId(agent.guid), kind: "agent", agent });
  }

  return rows;
}
