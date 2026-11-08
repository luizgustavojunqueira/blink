import { memo } from "react";
import TextField from "../textField/textField";
import DetailFieldRow from "./detailFieldRow";
import { useDetailField } from "../../hooks/useDetailField";
import { describeDue, parseDue } from "../../lib/dates/due";
import { t } from "../../lib/i18n";

interface IDetailDueField {
  paneId: string;
  itemGuid: string;
  value: string;
}

const parseDraft = (draft: string) => (draft.trim() === "" ? "" : (parseDue(draft) ?? draft.trim()));

function DetailDueFieldComponent({ paneId, itemGuid, value }: IDetailDueField) {
  const { draft, setDraft, editing, commit, requestEdit, onKeyDown } = useDetailField({
    paneId,
    itemGuid,
    field: "due_date",
    value,
    parse: parseDraft,
  });

  const typed = editing ? draft.trim() : value;
  const parsed = typed === "" ? "" : parseDue(typed);
  const note =
    parsed === null
      ? { text: t("unrecognized date: try today, fri, +3, 26/11, 31/12/26 or none"), className: "text-danger" }
      : { text: parsed === "" ? (editing ? t("no due date") : "") : describeDue(parsed), className: "text-fg-muted" };

  return (
    <DetailFieldRow paneId={paneId} itemGuid={itemGuid} field="due_date" label={t("due")} dirty={draft !== value}>
      <div className="flex w-full flex-col gap-1">
        <TextField
          singleLine
          value={draft}
          onChange={setDraft}
          editing={editing}
          onRequestEdit={requestEdit}
          onKeyDown={onKeyDown}
          onBlur={commit}
          placeholder={t("today, fri, +3, 26/11")}
        />
        {note.text && <span className={`text-xs ${note.className}`}>{note.text}</span>}
      </div>
    </DetailFieldRow>
  );
}

const DetailDueField = memo(DetailDueFieldComponent);
export default DetailDueField;
