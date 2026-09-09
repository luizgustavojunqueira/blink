import {
  detailPageNavigation,
  detailPriorityKeyBindings,
  detailStatusKeyBindings,
} from "./implementations/detailPane";
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
];

export type KeyMapId = keyof typeof keyBindings;

const prefixes = new Map<string, KeyBinding[]>();
const byKey = new Map<string, KeyBinding[]>();
for (const b of Object.values(keyBindings)) {
  for (const k of b.keys) {
    byKey.set(k, [...(byKey.get(k) ?? []), b]);

    const tokens = k.split(" ");
    for (let i = 1; i < tokens.length; i++) {
      const prefix = tokens.slice(0, i).join(" ");
      prefixes.set(prefix, [...(prefixes.get(prefix) ?? []), b]);
    }
  }
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
  const active = new Set(keyBindings.filter((b) => matches(b, ctx)));
  const winner = (key: string) => byKey.get(key)?.find((b) => active.has(b));

  return [...active]
    .map((binding) => ({
      binding,
      keys: binding.keys.filter((k) => winner(k) === binding),
      group: binding.hint?.group ?? "misc",
    }))
    .filter(({ keys }) => keys.length > 0);
}

const keyBidingsIndex: Record<string, KeyBinding> = Object.values(keyBindings).reduce(
  (acc, key) => {
    acc[key.id] = key;
    return acc;
  },
  {} as Record<string, KeyBinding>,
);

export function getKeyBinding(id: string): KeyBinding | undefined {
  return keyBidingsIndex[id];
}
