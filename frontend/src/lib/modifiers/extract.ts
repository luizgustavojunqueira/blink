export function extractDelimited(
  raw: string,
  delimiter: string,
  validSet?: string[],
): { values: string[]; remaining: string } {
  const regex = new RegExp(`\\${delimiter}(\\S+)`, "g");
  const matches = [...raw.matchAll(regex)];
  const values = matches
    .map((m) => m[1].toLowerCase())
    .filter((v) => validSet === undefined || validSet.includes(v));

  const remaining = raw.replace(regex, "").replace(/\s+/g, " ").trim();

  return { values, remaining };
}
