import { useRef, useState, type KeyboardEvent } from "react";
import { useAppContext } from "../../hooks/useAppContext";
import { useDetailPane } from "../../hooks/usePane";
import { DETAIL_FIELDS, type DetailField } from "../../lib/pane/types";
import { priorityColorBg, priorityMapper, statusColorBg, statusMapper } from "../../utils/status";
import TextField from "../textField/textField";
import Helper from "../prompt/helper";
import { useTagAutocomplete } from "../../hooks/useTagAutocomplete";
import { TAG_MODIFIER } from "../../lib/modifiers/delimiters";
import { tokenizeTags } from "../../lib/tags/tokenizeTags";
import { extractDelimited } from "../../lib/modifiers/extract";
import { normalizeTagText } from "../../lib/tags/normalizeTagText";

interface IItemDetail {
  paneId: string;
}

const mapTagsToString = (tags: string[]) => tags.map((tag) => `${TAG_MODIFIER}${tag}`).join(" ");

export default function ItemDetail({ paneId }: IItemDetail) {
  const t = useDetailPane(paneId);
  const app = useAppContext();
  const item = app.items.findItem(t.pane.itemId);
  const [itemTitle, setItemTitle] = useState<string>(item ? item.title : "");
  const [itemDesc, setItemDesc] = useState<string>(item ? (item.description ?? "") : "");
  const tagInputRef = useRef<HTMLTextAreaElement>(null);
  const [itemTags, setItemTags] = useState<string>(item ? mapTagsToString(item.tags) : "");

  const tagHelper = useTagAutocomplete(tagInputRef, setItemTags);
  if (!item) return null;

  const handleKeyDown = async (
    e: KeyboardEvent<HTMLTextAreaElement>,
    orgValue: string | undefined,
    currentValue: string,
    setValue: (value: string) => void,
    field: DetailField,
  ) => {
    if (e.key === "Escape") {
      setValue(orgValue ?? "");
    }

    if (e.key !== "Enter") return;

    if (e.ctrlKey || e.metaKey || (e.altKey && t.pane.selectedField === "description")) {
      e.preventDefault();
      const el = e.currentTarget;
      const pos = el.selectionStart ?? currentValue.length;
      setValue(`${currentValue.slice(0, pos)}\n${currentValue.slice(pos)}`);
      requestAnimationFrame(() => el.setSelectionRange(pos + 1, pos + 1));
      return;
    }
    e.preventDefault();

    commitField(field, currentValue, orgValue);

    app.ui.setMode("normal");
  };

  const commitField = (field: DetailField, currentValue: string, orgValue: string | undefined) => {
    if (field === "tags") {
      if (currentValue === orgValue) return;
      app.items.setField(
        item.guid,
        field,
        extractDelimited(normalizeTagText(currentValue), TAG_MODIFIER).values,
      );
      return;
    }
    if (field === "title" && currentValue.trim() === "") {
      setItemTitle(orgValue ?? "");
      return;
    }
    if (currentValue === orgValue) return;
    app.items.setField(item.guid, field, currentValue);
  };

  const handleClickEdit = (field: DetailField) => {
    setItemTitle(item ? item.title : "");
    setItemDesc(item ? (item.description ?? "") : "");
    setItemTags(item ? mapTagsToString(item.tags) : "");
    app.ui.selectPane(t.pane.id, "insert");
    app.ui.selectField(t.pane.id, field);
  };
  return (
    <div
      className={`w-full h-full flex flex-col border p-4 gap-1 text-sm ${
        t.isActive ? "border-b-accent" : "border-bg"
      }`}
    >
      <span className="font-medium text-fg-dim p-1">{item.type}</span>
      {DETAIL_FIELDS.map((field) => {
        let content: React.ReactNode;

        switch (field) {
          case "title":
            content = (
              <TextField
                singleLine
                onRequestEdit={() => handleClickEdit("title")}
                onKeyDown={(e) => handleKeyDown(e, item.title, itemTitle, setItemTitle, "title")}
                value={itemTitle}
                onChange={(v) => setItemTitle(v)}
                onBlur={() => commitField("title", itemTitle, item.title)}
                editing={t.isActive && app.ui.mode == "insert" && t.pane.selectedField === "title"}
              />
            );
            break;
          case "description":
            content = (
              <TextField
                onKeyDown={(e) =>
                  handleKeyDown(e, item.description, itemDesc, setItemDesc, "description")
                }
                onRequestEdit={() => handleClickEdit("description")}
                value={itemDesc}
                onChange={(v) => setItemDesc(v)}
                onBlur={() => commitField("description", itemDesc, item.description)}
                editing={
                  t.isActive && app.ui.mode == "insert" && t.pane.selectedField === "description"
                }
              />
            );
            break;
          case "tags":
            content = (
              <TextField
                ref={tagInputRef}
                onRequestEdit={() => handleClickEdit("tags")}
                onKeyDown={(e) => {
                  if (tagHelper.onKeyDown(e)) return;
                  handleKeyDown(e, mapTagsToString(item.tags), itemTags, setItemTags, "tags");
                }}
                value={itemTags}
                singleLine
                onChange={(v) => {
                  setItemTags(v);
                  tagHelper.update();
                }}
                onBlur={() => commitField("tags", itemTags, mapTagsToString(item.tags))}
                editing={t.isActive && app.ui.mode == "insert" && t.pane.selectedField === "tags"}
                tokenize={tokenizeTags}
              >
                <Helper {...tagHelper} />
              </TextField>
            );
            break;

          case "priority":
            content = (Object.keys(priorityMapper) as (keyof typeof priorityMapper)[]).map((k) => (
              <button
                key={k}
                type="button"
                className={`px-2.5 py-1 text-xs font-medium border rounded-md transition-colors cursor-pointer select-none ${
                  item.priority === k
                    ? priorityColorBg[k]
                    : "border-border text-fg-dim hover:bg-bg-lighter hover:text-fg hover:border-fg-dim"
                }`}
                onClick={() => app.items.setField(item.guid, "priority", k)}
              >
                {priorityMapper[k]}
              </button>
            ));
            break;

          case "status":
            content = (Object.keys(statusMapper) as (keyof typeof statusMapper)[]).map((k) => (
              <button
                key={k}
                type="button"
                className={`px-2.5 py-1 text-xs font-medium border rounded-md transition-colors cursor-pointer select-none ${
                  item.status === k
                    ? statusColorBg[k]
                    : "border-border text-fg-dim hover:bg-bg-lighter hover:text-fg hover:border-fg-dim"
                }`}
                onClick={() => app.items.setField(item.guid, "status", k)}
              >
                {statusMapper[k]}
              </button>
            ));
            break;

          default:
            return null;
        }

        return (
          <div key={field} className="flex flex-col p-2">
            <span className="font-medium p-1 text-fg-dim">{field}</span>

            <div
              className={`flex flex-row gap-1 p-1 ${t.pane.selectedField === field ? "bg-bg-soft" : ""}`}
            >
              {content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
