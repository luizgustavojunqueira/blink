import { useUiStore } from "../../stores/ui";
import BreadcrumbItem from "./breadcrumbItem";

interface IBreadcrumb {
  paneId: string;
}

export default function Breadcrumb({ paneId }: IBreadcrumb) {
  const panes = useUiStore((s) => s.panes);
  const index = panes.findIndex((p) => p.id === paneId);

  const renderedPanes = panes.slice(0, index + 1);

  return (
    <div className="w-full py-1 flex items-center gap-1 text-xs text-fg-muted overflow-hidden">
      {renderedPanes.map((p, i) => (
        <div key={p.id} className="flex items-center gap-1 min-w-0">
          {i !== 0 && <span className="text-fg-dim select-none">/</span>}
          <BreadcrumbItem pane={p} isLast={i === index} />
        </div>
      ))}
    </div>
  );
}
