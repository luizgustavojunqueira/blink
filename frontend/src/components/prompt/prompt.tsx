import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { parse } from "../../lib/parser";
import { execute } from "../../lib/executor";
import HighlightedPrompt from "./highlightedPrompt";
import Helper from "./helper";
import { usePromptHelper } from "../../hooks/promptHelper/usePromptHelper";
import type { ExecuteResult } from "../../lib/commands/types";
import { useUiStore } from "../../stores/ui";
import { useAppContext } from "../../hooks/useAppContext";
import { usePane } from "../../hooks/usePane";

const MAX_HEIGHT = 120;
const IDLE_DELAY = 600;

interface IPrompt {
  paneId: string;
}

export default function Prompt({ paneId }: IPrompt) {
  const app = useAppContext();
  const [message, setMessage] = useState<string>("");
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [isIdle, setIsIdle] = useState(true);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const t = usePane(paneId);
  const prompt = t.pane.prompt;
  const mode = useUiStore((s) => s.mode);

  const helper = usePromptHelper(inputRef, (newPrompt: string) => {
    app.ui.setPrompt(newPrompt);
  });

  const { update: helperUpdate } = helper;

  const pokeIdle = () => {
    setIsIdle(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIsIdle(true), IDLE_DELAY);
  };

  const syncSelection = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? start;
    setSelection((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  }, []);

  const fitToContent = () => {
    const el = inputRef.current;
    const overlay = overlayRef.current;
    if (!el || !overlay) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
    overlay.scrollTop = el.scrollTop;
  };

  useLayoutEffect(fitToContent);

  useEffect(() => {
    window.addEventListener("resize", fitToContent);
    return () => window.removeEventListener("resize", fitToContent);
  }, []);

  useEffect(() => {
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!t.isActive) return;
    const input = inputRef.current;
    if (!input) return;

    if (mode === "insert") {
      if (document.activeElement !== input) {
        input.focus();
        const end = input.value.length;
        input.setSelectionRange(end, end);
      }
      syncSelection();
      helperUpdate();
    } else {
      input.blur();
    }
  }, [helperUpdate, mode, syncSelection, t.isActive]);

  const handleKeyDown = async (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter") return;

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
  };

  const onChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    app.ui.setPrompt(e.target.value);
    helper.update();
    syncSelection();
    pokeIdle();
  };

  const showCursor = t.isActive && mode === "insert" && selection.start === selection.end;

  return (
    <div className="w-full px-5 py-4 border-b border-border bg-bg-soft flex items-start gap-3">
      <span className="text-accent select-none text-lg leading-normal">❯</span>
      <div className="relative flex-1 min-w-0">
        <HighlightedPrompt
          prompt={prompt}
          ref={overlayRef}
          cursor={showCursor ? selection.start : null}
          cursorIdle={isIdle}
        />
        <textarea
          ref={inputRef}
          value={prompt}
          rows={1}
          onChange={onChange}
          onSelect={syncSelection}
          onClick={() => app.ui.setMode("insert")}
          onKeyDown={(e) => {
            pokeIdle();
            const isNewline = e.key === "Enter" && (e.ctrlKey || e.altKey || e.metaKey);
            if (!isNewline && helper.onKeyDown(e)) return;
            handleKeyDown(e);
          }}
          onScroll={(e) => {
            if (overlayRef.current) overlayRef.current.scrollTop = e.currentTarget.scrollTop;
          }}
          className="scrollbar-hidden relative z-0 block w-full m-0 p-0 resize-none overflow-y-auto bg-transparent outline-none border-none text-lg leading-normal text-transparent caret-transparent placeholder:text-fg-muted selection:bg-accent/30 selection:text-transparent"
          placeholder="type to filter (/ or ? for options)"
          spellCheck={false}
          autoComplete="off"
          data-testid="prompt"
        />
        <Helper {...helper} />
      </div>
      {message && <span className="truncate">{message}</span>}
    </div>
  );
}
