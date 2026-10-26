import { newId } from "./id";
import type { QueryClient } from "@tanstack/react-query";
import { itemsQuery } from "../hooks/useItems";
import { useUiStore } from "../stores/ui";
import { createDetailPane, createListPane } from "./pane/factories";
import { DETAIL_FIELDS, type DetailField, type Pane } from "./pane/types";
import { Group, type GetItemRequest, type ItemType } from "../types/backend";

const PARAM = "s";
const WRITE_DELAY_MS = 200;

type SavedList = { t: "l"; g: string | null; f?: GetItemRequest; q?: string };
type SavedDetail = { t: "d"; k: DetailField | null };
type SavedPane = SavedList | SavedDetail;
type SavedState = { a: number; p: SavedPane[] };

const isString = (v: unknown): v is string => typeof v === "string";
const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every(isString);

function userFilter(filter: GetItemRequest): GetItemRequest {
  const { parent_id: _, ...rest } = filter;
  return Object.fromEntries(
    Object.entries(rest).filter(([, value]) => value !== undefined),
  ) as GetItemRequest;
}

function sanitizeFilter(raw: unknown): GetItemRequest | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const input = raw as Record<string, unknown>;
  const out: GetItemRequest = {};

  if (isString(input.title)) out.title = input.title;
  if (isString(input.description)) out.description = input.description;
  if (isStringArray(input.status)) out.status = input.status;
  if (isStringArray(input.priority)) out.priority = input.priority;
  if (isStringArray(input.type)) out.type = input.type;

  return Object.keys(out).length > 0 ? out : undefined;
}

function sanitizePane(raw: unknown): SavedPane | null {
  if (!raw || typeof raw !== "object") return null;
  const input = raw as Record<string, unknown>;

  if (input.t === "d") {
    const field = DETAIL_FIELDS.find((f) => f === input.k) ?? null;
    return { t: "d", k: field };
  }

  if (input.t === "l") {
    const saved: SavedList = { t: "l", g: isString(input.g) ? input.g : null };
    const filter = sanitizeFilter(input.f);
    if (filter) saved.f = filter;
    if (isString(input.q) && input.q !== "") saved.q = input.q;
    return saved;
  }

  return null;
}

function parseState(raw: string | null): SavedState | null {
  if (!raw) return null;

  try {
    const input = JSON.parse(raw) as { a?: unknown; p?: unknown };
    if (!Array.isArray(input.p)) return null;

    const panes: SavedPane[] = [];
    for (const entry of input.p) {
      const pane = sanitizePane(entry);
      if (!pane) break;
      panes.push(pane);
    }

    if (panes.length === 0 || panes[0].t !== "l") return null;

    return {
      a: Number.isInteger(input.a) ? (input.a as number) : panes.length - 1,
      p: panes,
    };
  } catch {
    return null;
  }
}

export function serializePanes(
  panes: Pane[],
  activePaneId: string,
): string | null {
  const saved: SavedPane[] = [];

  for (let i = 0; i < panes.length; i++) {
    const pane = panes[i];

    if (i > 0) {
      const parent = panes[i - 1];
      if (parent.type !== "list" || !parent.selectedGuid) break;
    }

    if (pane.type === "config" || pane.type === "profile" || pane.type === "history") break;

    if (pane.type === "detail") {
      saved.push({ t: "d", k: pane.selectedField });
      break;
    }

    const entry: SavedList = { t: "l", g: pane.selectedGuid };
    const filter = userFilter(pane.filter);
    if (Object.keys(filter).length > 0) entry.f = filter;
    if (pane.prompt !== "") entry.q = pane.prompt;
    saved.push(entry);
  }

  const first = saved[0];
  if (
    saved.length === 1 &&
    first.t === "l" &&
    first.g === null &&
    !first.f &&
    !first.q
  ) {
    return null;
  }

  const active = panes
    .slice(0, saved.length)
    .findIndex((p) => p.id === activePaneId);

  return JSON.stringify({ a: Math.max(0, active), p: saved });
}

const selectionOf = (
  pane: Pane | undefined,
): { guid: string; type: ItemType } | null =>
  pane?.type === "list" &&
  pane.selectedGuid &&
  pane.renderedGuids.includes(pane.selectedGuid)
    ? { guid: pane.selectedGuid, type: pane.renderedTypes[pane.selectedGuid] }
    : null;

const savedParam = () => new URLSearchParams(window.location.search).get(PARAM);

export const hasUrlState = () => parseState(savedParam()) !== null;

export async function hydrateFromUrl(client: QueryClient) {
  const saved = parseState(savedParam());
  if (!saved) return;

  const panes: Pane[] = [];

  for (let i = 0; i < saved.p.length; i++) {
    const entry = saved.p[i];
    const from = i === 0 ? null : selectionOf(panes[i - 1]);

    if (i > 0 && !from) break;

    if (entry.t === "d") {
      if (!from) break;
      panes.push({
        ...createDetailPane(newId(), from.guid),
        selectedField: entry.k,
      });
      break;
    }

    if (from && from.type !== Group) break;

    const base = createListPane(
      i === 0 ? "root" : newId(),
      from?.guid ?? null,
    );
    const filter: GetItemRequest = {
      ...entry.f,
      parent_id: base.parentGuid ?? undefined,
    };

    let items;
    try {
      items = await client.fetchQuery(itemsQuery(filter));
    } catch {
      break;
    }

    const renderedGuids = items.map((item) => item.guid);
    const renderedTypes = Object.fromEntries(
      items.map((item) => [item.guid, item.type]),
    );

    panes.push({
      ...base,
      prompt: entry.q ?? "",
      filter,
      renderedGuids,
      renderedTypes,
      selectedGuid: entry.g && renderedGuids.includes(entry.g) ? entry.g : null,
    });
  }

  if (panes.length === 0) return;

  const active = panes[Math.min(Math.max(saved.a, 0), panes.length - 1)];
  useUiStore.setState({ panes, activePaneId: active.id, mode: "normal" });
}

export function startUrlSync() {
  let last: string | null | undefined;
  let timer: number | undefined;

  const flush = () => {
    window.clearTimeout(timer);

    const { panes, activePaneId } = useUiStore.getState();
    const value = serializePanes(panes, activePaneId);
    if (value === last) return;
    last = value;

    const url = new URL(window.location.href);
    if (value === null) url.searchParams.delete(PARAM);
    else url.searchParams.set(PARAM, value);

    window.history.replaceState(window.history.state, "", url);
  };

  const unsubscribe = useUiStore.subscribe(() => {
    window.clearTimeout(timer);
    timer = window.setTimeout(flush, WRITE_DELAY_MS);
  });
  window.addEventListener("pagehide", flush);

  flush();

  return () => {
    window.clearTimeout(timer);
    unsubscribe();
    window.removeEventListener("pagehide", flush);
  };
}

let booting: Promise<void> | null = null;

export function bootUrlState(client: QueryClient): Promise<void> {
  booting ??= hydrateFromUrl(client)
    .catch(() => {})
    .then(() => {
      startUrlSync();
    });
  return booting;
}
