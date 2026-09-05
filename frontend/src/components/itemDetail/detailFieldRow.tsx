import { memo, type ReactNode } from "react";
import { useDetailFieldSelected } from "../../hooks/usePane";
import type { DetailField } from "../../lib/pane/types";

interface IDetailFieldRow {
  paneId: string;
  field: DetailField;
  children: ReactNode;
}

function DetailFieldRowComponent({ paneId, field, children }: IDetailFieldRow) {
  const isSelected = useDetailFieldSelected(paneId, field);

  return (
    <div className="flex flex-col p-2">
      <span className="font-medium p-1 text-fg-dim">{field}</span>

      <div
        className={`flex flex-row gap-1 p-1 ${isSelected ? "bg-bg-soft" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}

const DetailFieldRow = memo(DetailFieldRowComponent);
export default DetailFieldRow;
