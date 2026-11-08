import { Fragment, useMemo } from "react";
import { paneIsActive, usePaneValue } from "../../hooks/usePane";
import { useConfigStore } from "../../lib/config/store";
import { useAgents } from "../../hooks/useItems";
import { configRows, sectionOf, type ConfigRow } from "../../lib/config/rows";
import type { GetAgentResponse } from "../../types/backend";
import { isBuiltinTheme } from "../../lib/theme";
import Breadcrumb from "../breadcrumb/breadcrumb";
import ConfigRowView from "./configRow";
import { t } from "../../lib/i18n";

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
          title={t("theme")}
          note={
            isBuiltinTheme(theme)
              ? t("enter to use · y on a theme makes an editable copy")
              : t("enter to use · y to copy · i to rename · d d to delete")
          }
        />
      );
    case "color":
      return (
        <SectionHeader title={t("colors · {theme}", { theme })} note={t("i or enter to edit")} />
      );
    case "key":
      return (
        <SectionHeader
          title={t("keys")}
          note={t("i or enter to edit · r resets to default")}
        />
      );
    case "animations":
      return (
        <SectionHeader
          title={t("animations")}
          note={t("enter to switch · auto follows the system's reduced motion setting")}
        />
      );
    case "language":
      return (
        <SectionHeader
          title={t("language")}
          note={t("enter to switch · auto follows the browser's language")}
        />
      );
    case "agent":
    case "agentNew":
      return (
        <SectionHeader
          title={t("agents")}
          note={t("i adds · d d revokes · a token is shown only once")}
        />
      );
  }
}

const NO_AGENTS: GetAgentResponse[] = [];

export default function ConfigPane({ paneId }: IConfigPane) {
  const isActive = usePaneValue(paneId, paneIsActive);
  const theme = useConfigStore((s) => s.theme);
  const themes = useConfigStore((s) => s.themes);
  const keymap = useConfigStore((s) => s.keymap);
  const animations = useConfigStore((s) => s.animations);
  const language = useConfigStore((s) => s.language);

  const { data: agents = NO_AGENTS } = useAgents();

  const rows = useMemo(
    () => configRows({ theme, themes, keymap, animations, language }, agents),
    [theme, themes, keymap, animations, language, agents],
  );

  return (
    <div
      className={`w-full h-full flex flex-col border p-4 text-sm transition-colors duration-75 ${
        isActive ? "border-b-accent" : "border-bg"
      }`}
    >
      <Breadcrumb paneId={paneId} />
      <ul className="flex-1 overflow-y-auto">
        {rows.map((row, i) => (
          <Fragment key={row.id}>
            {(i === 0 || sectionOf(rows[i - 1]) !== sectionOf(row)) && header(row, theme)}
            <ConfigRowView paneId={paneId} row={row} />
          </Fragment>
        ))}
      </ul>
    </div>
  );
}
