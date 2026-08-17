export function extractDelimited(
  raw: string,
  delimiter: string,
  validSet?: string[],
): { values: string[]; invalid: string[]; remaining: string } {
  const regex = new RegExp(`\\${delimiter}(\\S+)`, "g");
  const found = [...raw.matchAll(regex)].map((m) => m[1].toLowerCase());

  const accepted = (v: string) => validSet === undefined || validSet.includes(v);

  const remaining = raw.replace(regex, "").replace(/\s+/g, " ").trim();

  return {
    values: found.filter(accepted),
    invalid: found.filter((v) => !accepted(v)),
    remaining,
  };
}

export function extractRest(
  raw: string,
  delimiter: string,
): { values: string[]; invalid: string[]; remaining: string } {
  const index = raw.indexOf(delimiter);
  if (index === -1) return { values: [], invalid: [], remaining: raw };

  const value = raw.slice(index + delimiter.length).trim();

  return {
    values: value ? [value] : [],
    invalid: [],
    remaining: raw.slice(0, index).trim(),
  };
}
