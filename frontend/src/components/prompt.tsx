import { useRef, useState, type KeyboardEvent } from "react";
import { parse } from "../lib/parser";
import { execute } from "../lib/executor";
import type { GetItemRequest } from "../types/backend";

interface IPrompt {
  onFilter: (filter: GetItemRequest) => void;
}

export default function Prompt({ onFilter }: IPrompt) {
  const [currentPrompt, setCurrentPrompt] = useState<string>();

  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (currentPrompt === undefined || currentPrompt === null) return;
      const command = parse(currentPrompt);

      if (command.type === "FILTER") {
        onFilter(command.data);
      }

      await execute(command);
    }
  };

  return (
    <div className="w-full p-4 text-xl bg-bg text-fg font-mono flex items-center">
      <span className="text-accent mr-2">❯</span>
      <input
        ref={inputRef}
        value={currentPrompt}
        onChange={(e) => setCurrentPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 bg-transparent outline-none border-none text-fg caret-cursor"
        autoFocus
        spellCheck={false}
        autoComplete="off"
        data-testid="prompt"
      />
    </div>
  );
}
