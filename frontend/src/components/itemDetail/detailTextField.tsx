import { memo } from "react";
import TextField from "../textField/textField";
import DetailFieldRow from "./detailFieldRow";
import { useDetailField } from "../../hooks/useDetailField";
import type { DetailField } from "../../lib/pane/types";

interface IDetailTextField {
  paneId: string;
  itemGuid: string;
  field: DetailField;
  value: string;
  singleLine?: boolean;
  rejectEmpty?: boolean;
  allowNewline?: boolean;
}

function DetailTextFieldComponent({
  paneId,
  itemGuid,
  field,
  value,
  singleLine,
  rejectEmpty,
  allowNewline,
}: IDetailTextField) {
  const { draft, setDraft, editing, commit, requestEdit, onKeyDown } =
    useDetailField({
      paneId,
      itemGuid,
      field,
      value,
      rejectEmpty,
      allowNewline,
    });

  return (
    <DetailFieldRow paneId={paneId} field={field}>
      <TextField
        singleLine={singleLine}
        value={draft}
        onChange={setDraft}
        editing={editing}
        onRequestEdit={requestEdit}
        onKeyDown={onKeyDown}
        onBlur={commit}
      />
    </DetailFieldRow>
  );
}

const DetailTextField = memo(DetailTextFieldComponent);
export default DetailTextField;
