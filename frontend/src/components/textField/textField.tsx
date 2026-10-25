import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";
import { TextOverlay, type Token } from "./textOverlay";

const DEFAULT_MAX_HEIGHT = 120;
const IDLE_DELAY = 600;
const MASK_CHAR = "•";

export interface TextFieldProps {
  value: string;
  onChange: (value: string) => void;
  editing: boolean;
  onRequestEdit?: () => void;
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  onBlur?: (e: FocusEvent<HTMLTextAreaElement>) => void;
  tokenize?: (text: string) => Token[];
  maxHeight?: number;
  singleLine?: boolean;
  mask?: boolean;
  placeholder?: string;
  testId?: string;
  className?: string;
  wrapperClassName?: string;
  children?: ReactNode;
  ref?: Ref<HTMLTextAreaElement>;
}

export default function TextField({
  value,
  onChange,
  editing,
  onRequestEdit,
  onKeyDown,
  onBlur,
  tokenize,
  maxHeight = DEFAULT_MAX_HEIGHT,
  singleLine = false,
  mask = false,
  placeholder,
  testId,
  className = "",
  wrapperClassName,
  children,
  ref,
}: TextFieldProps) {
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [isIdle, setIsIdle] = useState(true);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setInputRef = (el: HTMLTextAreaElement | null) => {
    inputRef.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
  };

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

  const fitToContent = useCallback(() => {
    const el = inputRef.current;
    const overlay = overlayRef.current;
    if (!el || !overlay) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;

    const caretAtEnd =
      singleLine && el.selectionStart === el.value.length && el.selectionEnd === el.value.length;

    if (caretAtEnd) {
      el.scrollLeft = el.scrollWidth;
    }

    overlay.scrollTop = el.scrollTop;
    overlay.scrollLeft = caretAtEnd ? overlay.scrollWidth : el.scrollLeft;
  }, [maxHeight, singleLine]);

  useLayoutEffect(fitToContent);

  useEffect(() => {
    window.addEventListener("resize", fitToContent);
    return () => window.removeEventListener("resize", fitToContent);
  }, [fitToContent]);

  useEffect(() => {
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, []);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    if (editing) {
      if (document.activeElement !== input) {
        input.focus();
        const end = input.value.length;
        input.setSelectionRange(end, end);
      }
      syncSelection();
    } else {
      input.blur();
    }
  }, [editing, syncSelection]);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const next = singleLine ? e.target.value.replace(/\n/g, "") : e.target.value;
    onChange(next);
    syncSelection();
    pokeIdle();
  };

  const showCursor = editing && selection.start === selection.end;
  const wrapClass = singleLine ? "whitespace-pre overflow-x-auto" : "";

  return (
    <div className={`relative w-full ${wrapperClassName ?? ""}`}>
      <TextOverlay
        text={mask ? MASK_CHAR.repeat(value.length) : value}
        tokenize={mask ? undefined : tokenize}
        ref={overlayRef}
        cursor={showCursor ? selection.start : null}
        cursorIdle={isIdle}
        wrap={!singleLine}
      />
      <textarea
        ref={setInputRef}
        value={value}
        rows={1}
        wrap={singleLine ? "off" : "soft"}
        onChange={handleChange}
        onSelect={syncSelection}
        onClick={onRequestEdit}
        onBlur={onBlur}
        onKeyDown={(e) => {
          pokeIdle();
          if (singleLine && e.key === "Enter") e.preventDefault();
          onKeyDown?.(e);
        }}
        onScroll={(e) => {
          if (!overlayRef.current) return;
          overlayRef.current.scrollTop = e.currentTarget.scrollTop;
          overlayRef.current.scrollLeft = e.currentTarget.scrollLeft;
        }}
        className={`scrollbar-hidden relative z-0 block w-full m-0 p-0 resize-none overflow-y-auto bg-transparent outline-none border-none text-lg leading-normal text-transparent caret-transparent placeholder:text-fg-muted selection:bg-accent/30 selection:text-transparent ${wrapClass} ${className}`}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        data-testid={testId}
      />
      {children}
    </div>
  );
}
