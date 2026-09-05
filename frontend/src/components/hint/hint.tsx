import { Fragment, memo, useMemo, useRef } from "react";
import { availableKeys, type AvailableBinding } from "../../lib/keymap/registry";
import { useUiStore, type UiState } from "../../stores/ui";

const NO_HINTS: AvailableBinding[] = [];

const selectHints = (s: UiState): AvailableBinding[] => {
  if (!s.showHint) return NO_HINTS;
  const pane = s.panes.find((p) => p.id === s.activePaneId);
  if (!pane) return NO_HINTS;
  return availableKeys({ ui: s, pane });
};

const sameHints = (a: AvailableBinding[], b: AvailableBinding[]) =>
  a.length === b.length &&
  a.every(
    (x, i) =>
      x.binding.id === b[i].binding.id &&
      x.keys.length === b[i].keys.length &&
      x.keys.every((k, j) => k === b[i].keys[j]),
  );

function useHintsSelector() {
  const prev = useRef<AvailableBinding[]>(NO_HINTS);

  return (s: UiState) => {
    const next = selectHints(s);
    return sameHints(prev.current, next) ? prev.current : (prev.current = next);
  };
}

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

function HintComponent() {
  const showHint = useUiStore((s) => s.showHint);
  const hints = useUiStore(useHintsSelector());
  const hintsGrouped = useMemo(() => groupBy(hints, "group"), [hints]);

  if (!showHint) return null;

  return (
    <div className="absolute bottom-0 right-2.5 flex flex-row items-end justify-end p-2">
      <div className="flex flex-col w-fit bg-bg-soft/90 px-2 rounded-md border border-accent/20">
        {Object.keys(hintsGrouped).map((g) => (
          <Fragment key={g}>
            <span className="my-1 text-fg-dim border-b border-accent/10">{g}</span>

            {hintsGrouped[g].map((h) => (
              <span key={h.binding.id} className="flex flex-row justify-between gap-5 text-sm">
                <span>
                  {h.keys
                    .map((k) =>
                      k
                        .split(" ")
                        .map((t) => replaceArrows(t))
                        .join(""),
                    )
                    .join("/")}
                </span>
                <span>{h.binding.description}</span>
              </span>
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

const Hint = memo(HintComponent);
export default Hint;
