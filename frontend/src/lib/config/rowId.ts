import type { ThemeToken } from "../theme";

export type RowRef =
  | { kind: "theme"; name: string }
  | { kind: "color"; token: ThemeToken }
  | { kind: "key"; bindingId: string }
  | { kind: "agent"; guid: string }
  | { kind: "agentNew" }
  | { kind: "animations" };

export const themeRowId = (name: string) => `theme:${name}`;
export const colorRowId = (token: ThemeToken) => `color:${token}`;
export const keyRowId = (bindingId: string) => `key:${bindingId}`;
export const agentRowId = (guid: string) => `agent:${guid}`;
export const AGENT_NEW_ROW_ID = "agent:new";
export const ANIMATIONS_ROW_ID = "animations:motion";

export function parseRowId(id: string | null): RowRef | null {
  if (!id) return null;
  const sep = id.indexOf(":");
  if (sep === -1) return null;

  const kind = id.slice(0, sep);
  const rest = id.slice(sep + 1);

  if (kind === "theme") return { kind, name: rest };
  if (kind === "color") return { kind, token: rest as ThemeToken };
  if (kind === "key") return { kind, bindingId: rest };
  if (kind === "animations") return { kind };
  if (kind === "agent") return rest === "new" ? { kind: "agentNew" } : { kind, guid: rest };
  return null;
}
