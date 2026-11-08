import { t } from "../../i18n";

export function only(
  values: string[],
  invalid: string[],
  label: string,
): { ok: true; value: string | undefined } | { ok: false; error: string } {
  if (invalid.length > 0) {
    return { ok: false, error: t('Invalid {field} "{value}"', { field: label, value: invalid[0] }) };
  }

  if (values.length > 1) {
    return { ok: false, error: t("An item can only have one {field}", { field: label }) };
  }

  return { ok: true, value: values[0]?.toUpperCase() };
}
