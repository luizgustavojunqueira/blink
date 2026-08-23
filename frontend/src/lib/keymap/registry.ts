import { escapeBind } from "./implementations/escape";
import { prefixKeyBindings } from "./implementations/insertMode";
import { listNavigationBindings } from "./implementations/listNavigation";
import { statusKeyBindings } from "./implementations/update";
import type { KeyBinding, KeyContext } from "./types";

const keyBindings: KeyBinding[] = [
  ...prefixKeyBindings,
  ...listNavigationBindings,
  escapeBind,
  ...statusKeyBindings,
];

export type KeyMapId = keyof typeof keyBindings;

const byKey = new Map<string, KeyBinding[]>();
for (const b of Object.values(keyBindings)) {
  for (const k of b.keys) {
    byKey.set(k, [...(byKey.get(k) ?? []), b]);
  }
}

export function resolve(key: string, ctx: KeyContext): KeyBinding | undefined {
  return byKey.get(key)?.find((b) => b.modes.includes(ctx.app.ui.mode) && (b.when?.(ctx) ?? true));
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
