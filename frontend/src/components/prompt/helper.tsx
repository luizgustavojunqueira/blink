import type { PromptHelper } from "../../hooks/promptHelper/usePromptHelper";

export default function Helper({
  options,
  selectedIndex,
  onSelect,
  setSelectedIndex,
  isOpen,
}: PromptHelper) {
  if (!isOpen) return;
  return (
    <div className="absolute top-full mt-2 z-50 w-[99%] bg-bg border border-border flex flex-col gap-1 shadow-lg">
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
          <span className="text-fg-muted">{opt.description}</span>
        </div>
      ))}
    </div>
  );
}
