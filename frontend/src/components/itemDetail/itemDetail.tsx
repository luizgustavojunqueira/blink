import { useAppContext } from "../../hooks/useAppContext";
import { useDetailPane } from "../../hooks/usePane";
import { DETAIL_FIELDS } from "../../lib/pane/types";
import { priorityColorBg, priorityMapper, statusColorBg, statusMapper } from "../../utils/status";

interface IItemDetail {
  paneId: string;
}
export default function ItemDetail({ paneId }: IItemDetail) {
  const t = useDetailPane(paneId);
  const app = useAppContext();
  const item = app.items.findItem(t.pane.itemId);

  if (!item) return;

  return (
    <div
      className={`w-full h-full flex flex-col border p-4 gap-2 text-sm ${t.isActive ? "border-b-accent" : "border-bg"}`}
    >
      {DETAIL_FIELDS.map((field) => {
        switch (field) {
          case "title":
          case "description":
          case "tags":
            break;
          case "priority":
            return (
              <div
                key={field}
                className={`flex flex-row gap-1 p-2 ${t.pane.selectedField === field ? "bg-bg-soft" : ""}`}
              >
                {Object.keys(priorityMapper).map((k) => (
                  <span
                    key={k}
                    className={`p-2 border border-accent/20 rounded-xl hover:cursor-pointer ${item.priority === k ? priorityColorBg[k] : ""}`}
                    onClick={() => app.items.setPriority(item.guid, k)}
                  >
                    {priorityMapper[k]}
                  </span>
                ))}
              </div>
            );
          case "status":
            return (
              <div
                key={field}
                className={`flex flex-row gap-1 p-2 ${t.pane.selectedField === field ? "bg-bg-soft" : ""}`}
              >
                {Object.keys(statusMapper).map((k) => (
                  <span
                    key={k}
                    className={`p-2 border border-accent/20 rounded-xl hover:cursor-pointer ${item.status === k ? statusColorBg[k] : ""}`}
                    onClick={() => app.items.setStatus(item.guid, k)}
                  >
                    {statusMapper[k]}
                  </span>
                ))}
              </div>
            );
          default:
            return <></>;
        }
      })}
    </div>
  );
}
