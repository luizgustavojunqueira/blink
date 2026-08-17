import { useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { parse } from "../../lib/parser";
import { execute } from "../../lib/executor";
import HighlightedPrompt from "./highlightedPrompt";
import Helper from "./helper";
import { usePromptHelper } from "../../hooks/promptHelper/usePromptHelper";
import type { AppContext, ExecuteResult } from "../../lib/commands/types";

interface IPrompt {
  app: AppContext;
}

type PromptState = {
  prompt: string;
  action: string;
  message?: string;
};

export default function Prompt({ app }: IPrompt) {
  const [promptState, setPromptState] = useState<PromptState>({
    prompt: "",
    action: "",
    message: "",
  });
  const inputRef = useRef<HTMLInputElement>(null);

  const helper = usePromptHelper(inputRef, (newPrompt: string) => {
    setPromptState((prev) => ({ ...prev, prompt: newPrompt }));
  });

  const handleKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (promptState.prompt === undefined || promptState.prompt === null) return;

      const command = parse(promptState.prompt);

      let result: ExecuteResult | void;
      try {
        result = await execute(command, app);
      } catch (err) {
        result = { message: err instanceof Error ? err.message : "Something went wrong" };
      }

      setPromptState((prev) => ({
        ...prev,
        prompt: result?.shouldClearPrompt ? "" : prev.prompt,
        message: result?.message ?? "",
      }));
    }
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();

    const prompt = e.target.value;
    const command = parse(prompt);

    setPromptState({ prompt, action: command.id });
    helper.update();
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
          onKeyDown={(e) => {
            if (helper.onKeyDown(e)) return;
            handleKeyDown(e);
          }}
          className="w-full bg-transparent outline-none border-none text-transparent text-lg caret-cursor placeholder:text-fg-muted relative z-10"
          placeholder="type to filter (/ or ? for options)"
          autoFocus
          spellCheck={false}
          autoComplete="off"
          data-testid="prompt"
        />
        <span>{promptState.message}</span>
        <Helper {...helper} />
      </div>
    </div>
  );
}
