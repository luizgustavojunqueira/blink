import { memo, useCallback, useRef } from "react";
import TextField from "../textField/textField";
import Helper from "../prompt/helper";
import DetailFieldRow from "./detailFieldRow";
import { useDetailField } from "../../hooks/useDetailField";
import { useTagAutocomplete } from "../../hooks/useTagAutocomplete";
import { TAG_MODIFIER } from "../../lib/modifiers/delimiters";
import { tokenizeTags } from "../../lib/tags/tokenizeTags";
import { extractDelimited } from "../../lib/modifiers/extract";
import { normalizeTagText } from "../../lib/tags/normalizeTagText";

interface IDetailTagsField {
  paneId: string;
  itemGuid: string;
  value: string;
}

const parseTags = (draft: string) =>
  extractDelimited(normalizeTagText(draft), TAG_MODIFIER).values;

function DetailTagsFieldComponent({
  paneId,
  itemGuid,
  value,
}: IDetailTagsField) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { draft, setDraft, editing, commit, requestEdit, onKeyDown } =
    useDetailField({
      paneId,
      itemGuid,
      field: "tags",
      value,
      parse: parseTags,
    });

  const tagHelper = useTagAutocomplete(inputRef, setDraft);
  const { update: helperUpdate } = tagHelper;

  const handleChange = useCallback(
    (v: string) => {
      setDraft(v);
      helperUpdate();
    },
    [setDraft, helperUpdate],
  );

  return (
    <DetailFieldRow paneId={paneId} itemGuid={itemGuid} field="tags" dirty={draft !== value}>
      <TextField
        ref={inputRef}
        singleLine
        value={draft}
        onChange={handleChange}
        editing={editing}
        onRequestEdit={requestEdit}
        onKeyDown={(e) => {
          if (tagHelper.onKeyDown(e)) {
            e.stopPropagation();
            return;
          }
          onKeyDown(e);
        }}
        onBlur={commit}
        tokenize={tokenizeTags}
      >
        <Helper {...tagHelper} />
      </TextField>
    </DetailFieldRow>
  );
}

const DetailTagsField = memo(DetailTagsFieldComponent);
export default DetailTagsField;
