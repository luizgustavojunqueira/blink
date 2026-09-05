import { memo, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { parse } from "../../lib/parser";
import { execute } from "../../lib/executor";
import TextField from "../textField/textField";
import Helper from "./helper";
import { usePromptHelper } from "../../hooks/promptHelper/usePromptHelper";
import type { ExecuteResult } from "../../lib/commands/types";
import { useAppContext } from "../../hooks/useAppContext";
import { paneEditing, usePaneValue, type PaneSelector } from "../../hooks/usePane";
import { tokenizePrompt } from "./promptTokenize";

const selectPrompt: PaneSelector<string> = (pane) => (pane?.type === "list" ? pane.prompt : "");

interface IPrompt {
  paneId: string;
}

function PromptComponent({ paneId }: IPrompt) {
  const app = useAppContext();
  const [message, setMessage] = useState<string>("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const prompt = usePaneValue(paneId, selectPrompt);
  const editing = usePaneValue(paneId, paneEditing);

  const helper = usePromptHelper(inputRef, (newPrompt: string) => {
    app.ui.setPrompt(newPrompt);
  });

  const { update: helperUpdate } = helper;

  useEffect(() => {
    if (editing) helperUpdate();
  }, [editing, helperUpdate]);

  const handleKeyDown = async (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (helper.onKeyDown(e)) {
      e.stopPropagation();
      return;
    }

    if (e.key !== "Enter") return;

    e.stopPropagation();

    if (e.ctrlKey || e.metaKey || e.altKey) {
      e.preventDefault();
      const el = e.currentTarget;
      const pos = el.selectionStart ?? prompt.length;
      app.ui.setPrompt(`${prompt.slice(0, pos)}\n${prompt.slice(pos)}`);
      requestAnimationFrame(() => el.setSelectionRange(pos + 1, pos + 1));
      return;
    }

    e.preventDefault();

    const command = parse(prompt.replace(/\n/g, " "));

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

    app.ui.escape();
  };

  return (
    <div className="w-full px-5 py-4 border-b border-border bg-bg-soft flex items-start gap-3">
      <span className="text-accent select-none text-lg leading-normal">❯</span>
      <TextField
        ref={inputRef}
        value={prompt}
        onChange={(value) => {
          app.ui.setPrompt(value);
          helper.update();
        }}
        editing={editing}
        onRequestEdit={() => {
          app.ui.selectPane(paneId, "insert");
        }}

        onKeyDown={handleKeyDown}
        tokenize={tokenizePrompt}
        placeholder="type to filter (: or ? for options)"
        testId="prompt"
        wrapperClassName="flex-1 min-w-0"
      >
        <Helper {...helper} />
      </TextField>
      {message && <span className="truncate">{message}</span>}
    </div>
  );
}

const Prompt = memo(PromptComponent);
export default Prompt;
