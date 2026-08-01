import { useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { parse } from "../lib/parser";
import { execute } from "../lib/executor";
import type { GetItemRequest } from "../types/backend";
import {
  PRIORITY_DELIMITER,
  TAG_DELIMITER,
  STATUS_DELIMITER,
  DESCRIPTION_DELIMITER,
} from "../lib/parser/types";

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

  const renderHighlight = (text: string) => {
    if (!text) return null;

    const regex = new RegExp(
      `([\\${PRIORITY_DELIMITER}\\${TAG_DELIMITER}\\${STATUS_DELIMITER}]\\S+|\\${DESCRIPTION_DELIMITER})`,
      "g",
    );
    const parts = text.split(regex);

    let isDescription = false;

    return parts.map((part, i) => {
      if (!part) return null;

      if (part === DESCRIPTION_DELIMITER) {
        isDescription = true;
        return (
          <span key={i} className="text-accent font-medium">
            {part}
          </span>
        );
      }

      if (part.startsWith(PRIORITY_DELIMITER)) {
        const value = part.substring(1).toLowerCase();
        let colorClass = "text-accent";

        if (value === "urgent") colorClass = "text-urgent";
        if (value === "high") colorClass = "text-high";
        if (value === "normal") colorClass = "text-normal";
        if (value === "low") colorClass = "text-low";

        return (
          <span key={i} className={`${colorClass} font-medium`}>
            {part}
          </span>
        );
      }

      if (part.startsWith(TAG_DELIMITER)) {
        return (
          <span key={i} className="text-tag font-medium">
            {part}
          </span>
        );
      }

      if (part.startsWith(STATUS_DELIMITER)) {
        const value = part.substring(1).toLowerCase();
        const colorClass = value === "done" ? "text-done" : "text-status";

        return (
          <span key={i} className={`${colorClass} font-medium`}>
            {part}
          </span>
        );
      }

      if (isDescription) {
        return (
          <span key={i} className="text-fg-dim">
            {part}
          </span>
        );
      }

      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="w-full px-5 py-4 border-b border-border bg-bg-soft flex items-center gap-3">
      <span className="text-accent select-none">❯</span>
      <div className="relative flex-1 flex items-center">
        <div
          className="absolute inset-0 text-lg pointer-events-none whitespace-pre text-fg flex items-center"
          aria-hidden="true"
        >
          {renderHighlight(promptState.prompt)}
        </div>
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
