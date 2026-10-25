export type ProfileRowKind = "account" | "password" | "logout" | "delete";

export const PROFILE_ACCOUNT_ROW_ID = "profile:account";

export const PROFILE_ROW_IDS: readonly string[] = [
  PROFILE_ACCOUNT_ROW_ID,
  "profile:password",
  "profile:logout",
  "profile:delete",
];

export const profileRowId = (kind: ProfileRowKind) => `profile:${kind}`;

export function parseProfileRow(id: string | null): ProfileRowKind | null {
  switch (id) {
    case "profile:account":
      return "account";
    case "profile:password":
      return "password";
    case "profile:logout":
      return "logout";
    case "profile:delete":
      return "delete";
    default:
      return null;
  }
}
