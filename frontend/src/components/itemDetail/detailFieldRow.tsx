import { memo, useCallback, type ReactNode } from "react";
import { usePaneValue, type PaneSelector } from "../../hooks/usePane";
import { useUiStore } from "../../stores/ui";
import type { DetailField } from "../../lib/pane/types";
import { t } from "../../lib/i18n";

interface IDetailFieldRow {
  paneId: string;
  itemGuid: string;
  field: DetailField;
  label?: string;
  dirty?: boolean;
  children: ReactNode;
}

function DetailFieldRowComponent({ paneId, itemGuid, field, label, dirty, children }: IDetailFieldRow) {
  const fieldState = useUiStore((s) => s.fieldStates[`${itemGuid}:${field}`]);
  const isSaving = fieldState?.status === "saving";
  const error = fieldState?.status === "error" ? fieldState.message : null;
  const select = useCallback<PaneSelector<boolean>>(
    (pane) => pane?.type === "detail" && pane.selectedField === field,
    [field],
  );

  const isSelected = usePaneValue(paneId, select);

  return (
    <div className="flex flex-col p-2">
      <span className="font-medium p-1 text-fg-dim">
        {label ?? t(field)}
        {error ? (
          <span className="ml-2 text-xs text-danger">● {t("failed: {error}", { error })}</span>
        ) : (
          (dirty || isSaving) && (
            <span className="ml-2 text-xs text-accent">● {dirty ? t("unsaved") : t("saving")}</span>
          )
        )}
      </span>

      <div
        className={`flex flex-row gap-1 p-1 ${isSelected ? "bg-bg-soft" : ""} ${
          error
            ? "outline outline-danger"
            : dirty || isSaving
              ? "outline outline-accent shadow-[0_0_8px_var(--accent)]"
              : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
}

const DetailFieldRow = memo(DetailFieldRowComponent);
export default DetailFieldRow;
