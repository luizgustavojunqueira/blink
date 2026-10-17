import { memo } from "react";
import { getItemActions } from "../../lib/appContext";
import DetailFieldRow from "./detailFieldRow";
import type { DetailField } from "../../lib/pane/types";

interface IDetailChoiceField {
  paneId: string;
  itemGuid: string;
  field: Extract<DetailField, "status" | "priority">;
  current: string;
  mapper: Record<string, string>;
  colors: Record<string, string>;
}

function DetailChoiceFieldComponent({
  paneId,
  itemGuid,
  field,
  current,
  mapper,
  colors,
}: IDetailChoiceField) {

  return (
    <DetailFieldRow paneId={paneId} itemGuid={itemGuid} field={field}>
      {Object.keys(mapper).map((k) => (
        <button
          key={k}
          type="button"
          className={`px-2.5 py-1 text-xs font-medium border rounded-md transition-colors cursor-pointer select-none ${
            current === k
              ? colors[k]
              : "border-border text-fg-dim hover:bg-bg-lighter hover:text-fg hover:border-fg-dim"
          }`}
          onClick={() => getItemActions().setField(itemGuid, field, k)}
        >
          {mapper[k]}
        </button>
      ))}
    </DetailFieldRow>
  );
}

const DetailChoiceField = memo(DetailChoiceFieldComponent);
export default DetailChoiceField;
