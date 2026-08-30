import {
  detailPageNavigation,
  detailPriorityKeyBindings,
  detailStatusKeyBindings,
} from "./implementations/detailPane";
import { escapeBind } from "./implementations/escape";
import { prefixKeyBindings } from "./implementations/insertMode";
import { listNavigationBindings } from "./implementations/listNavigation";
import { paneNavigation } from "./implementations/panes";
import { statusKeyBindings } from "./implementations/update";
import type { KeyBinding, KeyContext } from "./types";

export const keyBindings: KeyBinding[] = [
  ...prefixKeyBindings,
  ...listNavigationBindings,
  escapeBind,
  ...statusKeyBindings,
  ...paneNavigation,
  ...detailPageNavigation,
  ...detailStatusKeyBindings,
  ...detailPriorityKeyBindings,
];

export type KeyMapId = keyof typeof keyBindings;

const byKey = new Map<string, KeyBinding[]>();
for (const b of Object.values(keyBindings)) {
  for (const k of b.keys) {
    byKey.set(k, [...(byKey.get(k) ?? []), b]);
  }
}

const matches = (b: KeyBinding, ctx: KeyContext) =>
  b.modes.includes(ctx.app.ui.mode) &&
  (b.scope === "global" || b.scope === ctx.pane.type) &&
  (b.when?.(ctx) ?? true);

export function resolve(key: string, ctx: KeyContext) {
  return byKey.get(key)?.find((b) => matches(b, ctx));
}

export type AvailableBinding = {
  binding: KeyBinding;
  keys: string[];
  group: string;
};

export function availableKeys(ctx: KeyContext): AvailableBinding[] {
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
