import type { GetItemResponse } from "../types/backend";
import { t } from "./i18n";

export type MoveTarget = { guid: string; path: string };

export function groupPaths(groups: GetItemResponse[]): MoveTarget[] {
  const byGuid = new Map(groups.map((g) => [g.guid, g]));

  return groups.map((group) => {
    const titles: string[] = [];
    let current: GetItemResponse | undefined = group;

    for (let i = 0; current && i <= groups.length; i++) {
      titles.unshift(current.title);
      current = current.parent_guid ? byGuid.get(current.parent_guid) : undefined;
    }

    return { guid: group.guid, path: titles.join("/") };
  });
}

export function blockedGroups(groups: GetItemResponse[], moving: string[]): Set<string> {
  const byGuid = new Map(groups.map((g) => [g.guid, g]));
  const roots = new Set(moving);
  const blocked = new Set<string>();

  for (const group of groups) {
    let current: GetItemResponse | undefined = group;

    for (let i = 0; current && i <= groups.length; i++) {
      if (roots.has(current.guid)) {
        blocked.add(group.guid);
        break;
      }
      current = current.parent_guid ? byGuid.get(current.parent_guid) : undefined;
    }
  }

  return blocked;
}

export type Resolved =
  | { ok: true; guid: string }
  | { ok: false; error: string };

export function resolveGroup(groups: GetItemResponse[], moving: string[], input: string): Resolved {
  const wanted = input.trim().toLowerCase();
  const paths = groupPaths(groups);

  const exact = paths.filter((t) => t.path.toLowerCase() === wanted);
  const byTitle = paths.filter((t) => t.path.split("/").pop()?.toLowerCase() === wanted);
  const matches = exact.length > 0 ? exact : byTitle;

  if (matches.length === 0) return { ok: false, error: t('No group "{name}"', { name: input.trim() }) };
  if (matches.length > 1) {
    return { ok: false, error: t('"{name}" is ambiguous, type the full path', { name: input.trim() }) };
  }

  if (blockedGroups(groups, moving).has(matches[0].guid)) {
    return { ok: false, error: t("Can't move a group into itself") };
  }

  return { ok: true, guid: matches[0].guid };
}
