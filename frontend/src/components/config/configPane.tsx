import { Fragment, useMemo } from "react";
import { paneIsActive, usePaneValue } from "../../hooks/usePane";
import { useConfigStore } from "../../lib/config/store";
import { configRows, type ConfigRow } from "../../lib/config/rows";
import { isBuiltinTheme } from "../../lib/theme";
import Breadcrumb from "../breadcrumb/breadcrumb";
import ConfigRowView from "./configRow";

interface IConfigPane {
  paneId: string;
}

function SectionHeader({ title, note }: { title: string; note?: string }) {
  return (
    <li className="flex flex-col px-4 pt-4 pb-1">
      <span className="font-medium text-fg-dim border-b border-accent/10">
        {title}
      </span>
      {note && <span className="text-xs text-fg-muted">{note}</span>}
    </li>
  );
}

function header(row: ConfigRow, theme: string) {
  switch (row.kind) {
    case "theme":
      return (
        <SectionHeader
          title="theme"
          note={
            isBuiltinTheme(theme)
              ? "enter to use · y on a theme makes an editable copy"
              : "enter to use · y to copy · i to rename · d d to delete"
          }
        />
      );
    case "color":
      return (
        <SectionHeader title={`colors · ${theme}`} note="i or enter to edit" />
      );
    case "key":
      return (
        <SectionHeader
          title="keys"
          note="i or enter to edit · r resets to default"
        />
      );
  }
}

export default function ConfigPane({ paneId }: IConfigPane) {
  const isActive = usePaneValue(paneId, paneIsActive);
  const theme = useConfigStore((s) => s.theme);
  const themes = useConfigStore((s) => s.themes);
  const keymap = useConfigStore((s) => s.keymap);

  const rows = useMemo(
    () => configRows({ theme, themes, keymap }),
    [theme, themes, keymap],
  );

  return (
    <div
      className={`w-full h-full flex flex-col border p-4 text-sm animate-fade-in transition-colors duration-75 ${
        isActive ? "border-b-accent" : "border-bg"
      }`}
    >
      <Breadcrumb paneId={paneId} />
      <ul className="flex-1 overflow-y-auto">
        {rows.map((row, i) => (
          <Fragment key={row.id}>
            {(i === 0 || rows[i - 1].kind !== row.kind) && header(row, theme)}
            <ConfigRowView paneId={paneId} row={row} />
          </Fragment>
        ))}
      </ul>
    </div>
  );
}
