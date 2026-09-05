import { useItem } from "../../hooks/useItems";
import { useDetailPaneItemId, usePaneIsActive } from "../../hooks/usePane";
import { DETAIL_FIELDS } from "../../lib/pane/types";
import { priorityColorBg, priorityMapper, statusColorBg, statusMapper } from "../../utils/status";
import { TAG_MODIFIER } from "../../lib/modifiers/delimiters";
import DetailChoiceField from "./detailChoiceField";
import DetailTagsField from "./detailTagsField";
import DetailTextField from "./detailTextField";

interface IItemDetail {
  paneId: string;
}

const mapTagsToString = (tags: string[]) => tags.map((tag) => `${TAG_MODIFIER}${tag}`).join(" ");

export default function ItemDetail({ paneId }: IItemDetail) {
  const itemId = useDetailPaneItemId(paneId);
  const isActive = usePaneIsActive(paneId);
  const item = useItem(itemId);

  if (!item) return null;

  return (
    <div
      className={`w-full h-full flex flex-col border p-4 gap-1 text-sm ${
        isActive ? "border-b-accent" : "border-bg"
      }`}
    >
      <span className="font-medium text-fg-dim p-1">{item.type}</span>
      {DETAIL_FIELDS.map((field) => {
        switch (field) {
          case "title":
            return (
              <DetailTextField
                key={field}
                paneId={paneId}
                itemGuid={item.guid}
                field="title"
                value={item.title}
                singleLine
                rejectEmpty
              />
            );
          case "description":
            return (
              <DetailTextField
                key={field}
                paneId={paneId}
                itemGuid={item.guid}
                field="description"
                value={item.description ?? ""}
                allowNewline
              />
            );
          case "tags":
            return (
              <DetailTagsField
                key={field}
                paneId={paneId}
                itemGuid={item.guid}
                value={mapTagsToString(item.tags)}
              />
            );
          case "priority":
            return (
              <DetailChoiceField
                key={field}
                paneId={paneId}
                itemGuid={item.guid}
                field="priority"
                current={item.priority}
                mapper={priorityMapper}
                colors={priorityColorBg}
              />
            );
          case "status":
            return (
              <DetailChoiceField
                key={field}
                paneId={paneId}
                itemGuid={item.guid}
                field="status"
                current={item.status}
                mapper={statusMapper}
                colors={statusColorBg}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
