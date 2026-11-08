import { t } from "../lib/i18n";

export default function Loading() {
  return (
    <div className="px-4 py-2 text-fg-dim text-sm animate-fade-in [animation-delay:150ms] [animation-fill-mode:backwards]">
      {t("loading...")}
    </div>
  );
}
