import { useUiStore } from "../stores/ui";
import { COMMAND_PREFIX } from "./commands/registry";
import { filterCommand, parseFilter } from "./commands/implementations/filter";
import * as delimiters from "./modifiers/delimiters";

const MODIFIER_CHARS = new Set<string>(Object.values(delimiters));
const EXPLICIT_FILTER = new RegExp(`^${COMMAND_PREFIX}${filterCommand.id}(?:\\s+|$)`, "i");

function withoutTokenAt(text: string, cursor: number) {
  let start = cursor;
  while (start > 0 && !/\s/.test(text[start - 1])) start--;
  let end = cursor;
  while (end < text.length && !/\s/.test(text[end])) end++;

  if (start === end || !MODIFIER_CHARS.has(text[start])) return text;
  return text.slice(0, start) + text.slice(end);
}

export function liveFilterArgs(prompt: string, cursor?: number): string | null {
  const flat = prompt.replace(/\n/g, " ");
  const text = (cursor === undefined ? flat : withoutTokenAt(flat, cursor)).trim();

  if (!text.startsWith(COMMAND_PREFIX)) return text;

  const explicit = text.match(EXPLICIT_FILTER);
  return explicit ? text.slice(explicit[0].length) : null;
}

export function applyLiveFilter(paneId: string, prompt: string, cursor?: number) {
  const state = useUiStore.getState();
  if (state.activePaneId !== paneId) return;

  const pane = state.panes.find((p) => p.id === paneId);
  if (!pane || pane.type !== "list") return;

  const args = liveFilterArgs(prompt, cursor);
  if (args === null) return;

  const filter = { ...parseFilter(args), parent_id: pane.parentGuid ?? undefined };
  if (JSON.stringify(filter) === JSON.stringify(pane.filter)) return;

  state.setFilter(filter);
}
