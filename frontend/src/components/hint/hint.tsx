import { Fragment } from "react";
import { useAppContext } from "../../hooks/useAppContext";
import { availableKeys } from "../../lib/keymap/registry";

const replaceArrows = (t: string) => {
  if (t !== undefined && t != null)
    return t
      .replace(/arrowleft/gi, "\u2190")
      .replace(/arrowup/gi, "\u2191")
      .replace(/arrowright/gi, "\u2192")
      .replace(/arrowdown/gi, "\u2193");
};

function groupBy<T>(items: Array<T>, field: keyof T): Record<string, Array<T>> {
  const s: Record<string, Array<T>> = {};

  items.forEach((i) => {
    const value = i[field];
    if (typeof value === "string") {
      if (s[value] === undefined) {
        s[value] = [i];
      } else {
        s[value].push(i);
      }
    }
  });

  return s;
}

export default function Hint() {
  const app = useAppContext();
  const pane = app.ui.panes.find((p) => p.id === app.ui.activePaneId);
  const hintsGrouped = pane ? groupBy(availableKeys({ app, pane }), "group") : {};

  if (!app.ui.showHint) return;

  return (
    <div className="absolute bottom-0 right-2.5 flex flex-row items-end justify-end p-2">
      <div className="flex flex-col w-fit bg-bg-soft/90 px-2 rounded-md border border-accent/20">
        {Object.keys(hintsGrouped).map((g) => (
          <Fragment key={g}>
            <span className="my-1 text-fg-dim border-b border-accent/10">{g}</span>

            {hintsGrouped[g].map((h) => (
              <span key={h.binding.id} className="flex flex-row justify-between gap-5 text-sm">
                <span>{h.keys.map((k) => replaceArrows(k)).join("/")}</span>
                <span>{h.binding.description}</span>
              </span>
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
