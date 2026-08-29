import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { parse } from "../../lib/parser";
import { execute } from "../../lib/executor";
import HighlightedPrompt from "./highlightedPrompt";
import Helper from "./helper";
import { usePromptHelper } from "../../hooks/promptHelper/usePromptHelper";
import type { ExecuteResult } from "../../lib/commands/types";
import { useUiStore } from "../../stores/ui";
import { useAppContext } from "../../hooks/useAppContext";
import { usePane } from "../../hooks/usePane";

interface IPrompt {
  paneId: string;
}

export default function Prompt({ paneId }: IPrompt) {
  const app = useAppContext();
  const [message, setMessage] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const t = usePane(paneId);

  const prompt = t.pane.prompt;
  const mode = useUiStore((s) => s.mode);

  const helper = usePromptHelper(inputRef, (newPrompt: string) => {
    app.ui.setPrompt(newPrompt);
  });

  const { update: helperUpdate } = helper;

  useEffect(() => {
    if (!t.isActive) return;
    const input = inputRef.current;
    if (!input) return;
    if (mode === "insert") {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
      helperUpdate();
    } else {
      input.blur();
    }
  }, [helperUpdate, mode, t.isActive]);

  const handleClick = () => {
    app.ui.setMode("insert");
  };

  const handleKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();

      const command = parse(prompt);

      let result: ExecuteResult | void;

      try {
        result = await execute(command, app);
      } catch (err) {
        result = {
          message: err instanceof Error ? err.message : "Something went wrong",
        };
      }

      if (result?.shouldClearPrompt) {
        app.ui.setPrompt("");
      }
      setMessage(result?.message ?? "");
    }
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const newPrompt = e.target.value;
    app.ui.setPrompt(newPrompt);
    helper.update();
  };

  return (
    <div className="w-full px-5 py-4 border-b border-border bg-bg-soft flex items-center gap-3">
      <span className="text-accent select-none">❯</span>
      <div className="relative flex-1 flex items-center min-w-0">
        <HighlightedPrompt prompt={prompt} />
        <input
          ref={inputRef}
          value={prompt}
          onChange={onChange}
          onClick={handleClick}
          onKeyDown={(e) => {
            if (helper.onKeyDown(e)) return;
            handleKeyDown(e);
          }}
          className="w-full bg-transparent outline-none border-none text-transparent text-lg caret-cursor placeholder:text-fg-muted relative z-10"
          placeholder="type to filter (/ or ? for options)"
          spellCheck={false}
          autoComplete="off"
          data-testid="prompt"
        />
        <span className="truncate">{message}</span>
        <Helper {...helper} />
      </div>
    </div>
  );
}
