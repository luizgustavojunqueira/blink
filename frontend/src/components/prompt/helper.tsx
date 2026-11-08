import { useRef } from "react";
import { useResizeAnimation } from "../../hooks/useResizeAnimation";
import type { PromptHelper } from "../../hooks/promptHelper/usePromptHelper";
import { t } from "../../lib/i18n";

export default function Helper({
  options,
  selectedIndex,
  onSelect,
  setSelectedIndex,
  isOpen,
}: PromptHelper) {
  const ref = useRef<HTMLDivElement>(null);
  useResizeAnimation(ref, [options, isOpen]);
  if (!isOpen) return;
  return (
    <div
      ref={ref}
      className="absolute top-full mt-2 z-50 w-[99%] bg-bg border border-border flex flex-col gap-1 shadow-lg animate-helper-in">
      {options.map((opt, idx) => (
        <div
          key={opt.value}
          className={`${idx !== options.length - 1 ? "border-b" : ""} ${
            selectedIndex === idx ? "bg-bg-lighter" : ""
          } border-fg-muted px-5 py-3 flex flex-row justify-between w-full cursor-pointer`}
          onMouseEnter={() => setSelectedIndex(idx)}
          onClick={() => onSelect(idx)}
        >
          <span>{opt.name}</span>
          <span className="text-fg-muted">{t(opt.description)}</span>
        </div>
      ))}
    </div>
  );
}
