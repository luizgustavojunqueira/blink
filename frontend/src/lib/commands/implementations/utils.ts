export function only(
  values: string[],
  invalid: string[],
  label: string,
): { ok: true; value: string | undefined } | { ok: false; error: string } {
  if (invalid.length > 0) {
    return { ok: false, error: `Invalid ${label} "${invalid[0]}"` };
  }

  if (values.length > 1) {
    return { ok: false, error: `An item can only have one ${label}` };
  }

  return { ok: true, value: values[0]?.toUpperCase() };
}
