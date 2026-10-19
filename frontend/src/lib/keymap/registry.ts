import {
  detailPageNavigation,
  detailPriorityKeyBindings,
  detailStatusKeyBindings,
} from "./implementations/detailPane";
import { configPaneBindings } from "./implementations/configPane";
import { escapeBind } from "./implementations/escape";
import { toggleHintBind } from "./implementations/hint";
import { prefixKeyBindings } from "./implementations/insertMode";
import { listNavigationBindings } from "./implementations/listNavigation";
import { markBindings } from "./implementations/mark";
import { paneNavigation } from "./implementations/panes";
import { bulkUpdateStatusBindings, statusKeyBindings } from "./implementations/update";
import { visualMode } from "./implementations/visualMode";
import type { KeyBinding, KeyQueryContext } from "./types";

export const keyBindings: KeyBinding[] = [
  ...prefixKeyBindings,
  ...listNavigationBindings,
  escapeBind,
  ...statusKeyBindings,
  ...paneNavigation,
  ...detailPageNavigation,
  ...detailStatusKeyBindings,
  ...detailPriorityKeyBindings,
  toggleHintBind,
  ...markBindings,
  ...bulkUpdateStatusBindings,
  ...visualMode,
  ...configPaneBindings,
];

export type KeyMapId = keyof typeof keyBindings;

export type Keymap = Record<string, string[]>;

let active: KeyBinding[] = keyBindings;
const prefixes = new Map<string, KeyBinding[]>();
const byKey = new Map<string, KeyBinding[]>();
const byId = new Map<string, KeyBinding>();

function index() {
  prefixes.clear();
  byKey.clear();
  byId.clear();

  for (const b of active) {
    byId.set(b.id, b);
    for (const k of b.keys) {
      byKey.set(k, [...(byKey.get(k) ?? []), b]);

      const tokens = k.split(" ");
      for (let i = 1; i < tokens.length; i++) {
        const prefix = tokens.slice(0, i).join(" ");
        prefixes.set(prefix, [...(prefixes.get(prefix) ?? []), b]);
      }
    }
  }
}

index();

export function applyKeymap(keymap: Keymap) {
  active = keyBindings.map((b) => {
    const keys = keymap[b.id];
    return !b.fixed && keys && keys.length > 0 ? { ...b, keys } : b;
  });
  index();
}

const matches = (b: KeyBinding, ctx: KeyQueryContext) =>
  b.modes.includes(ctx.ui.mode) &&
  (b.scope === "global" || b.scope === ctx.pane.type) &&
  (b.when?.(ctx) ?? true);

export function isPrefix(seq: string, ctx: KeyQueryContext) {
  return prefixes.get(seq)?.some((b) => matches(b, ctx)) ?? false;
}

export function resolve(key: string, ctx: KeyQueryContext) {
  return byKey.get(key)?.find((b) => matches(b, ctx));
}

export type AvailableBinding = {
  binding: KeyBinding;
  keys: string[];
  group: string;
};

export function availableKeys(ctx: KeyQueryContext): AvailableBinding[] {
  const available = new Set(active.filter((b) => matches(b, ctx)));
  const winner = (key: string) => byKey.get(key)?.find((b) => available.has(b));

  return [...available]
    .map((binding) => ({
      binding,
      keys: binding.keys.filter((k) => winner(k) === binding),
      group: binding.hint?.group ?? "misc",
    }))
    .filter(({ keys }) => keys.length > 0);
}

export function getKeyBinding(id: string): KeyBinding | undefined {
  return byId.get(id);
}
