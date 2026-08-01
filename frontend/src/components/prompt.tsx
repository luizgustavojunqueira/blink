import { useRef, useState, type KeyboardEvent } from "react";
import { parse } from "../lib/parser";
import { execute } from "../lib/executor";
import type { GetItemRequest } from "../types/backend";

interface IPrompt {
  onFilter: (filter: GetItemRequest) => void;
}

export default function Prompt({ onFilter }: IPrompt) {
  const [currentPrompt, setCurrentPrompt] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!currentPrompt) return;

      const command = parse(currentPrompt);

      if (command.type === "FILTER") {
        onFilter(command.data);
      }

      await execute(command);
    }
  };

  return (
    <div className="w-full px-5 py-4 border-b border-border bg-bg-soft flex items-center gap-3">
      <span className="text-accent select-none">❯</span>
      <input
        ref={inputRef}
        value={currentPrompt}
        onChange={(e) => setCurrentPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 bg-transparent outline-none border-none text-fg text-lg caret-cursor placeholder:text-fg-muted"
        placeholder="type to filter"
        autoFocus
        spellCheck={false}
        autoComplete="off"
        data-testid="prompt"
      />
    </div>
  );
}
