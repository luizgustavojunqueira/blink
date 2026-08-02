import { useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { parse } from "../../lib/parser";
import { execute } from "../../lib/executor";
import type { GetItemRequest } from "../../types/backend";
import HighlightedPrompt from "./highlightedPrompt";

interface IPrompt {
  onFilter: (filter: GetItemRequest) => void;
}

type PromptState = {
  prompt: string;
  action: string;
};

export default function Prompt({ onFilter }: IPrompt) {
  const [promptState, setPromptState] = useState<PromptState>({
    prompt: "",
    action: "",
  });
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!promptState.prompt) return;

      const command = parse(promptState.prompt);

      if (command.type === "FILTER") {
        onFilter(command.data);
      }

      await execute(command);
    }
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();

    const prompt = e.target.value;
    const command = parse(prompt);

    setPromptState({ prompt, action: command.type });
  };

  return (
    <div className="w-full px-5 py-4 border-b border-border bg-bg-soft flex items-center gap-3">
      <span className="text-accent select-none">❯</span>
      <div className="relative flex-1 flex items-center">
        <HighlightedPrompt prompt={promptState.prompt} />
        <input
          ref={inputRef}
          value={promptState.prompt}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent outline-none border-none text-transparent text-lg caret-cursor placeholder:text-fg-muted relative z-10"
          placeholder="type to filter"
          autoFocus
          spellCheck={false}
          autoComplete="off"
          data-testid="prompt"
        />
        <span>{promptState.action}</span>
      </div>
    </div>
  );
}
