import { useCallback, useState, type KeyboardEvent } from "react";
import { COMMAND_PREFIX, getAllCommands, getCommand } from "../../lib/commands/registry";
import { commandArgStart } from "../../lib/commands/argToken";
import { toPromptOption, type PromptOption } from "../../lib/promptOptions";
import { getModifier } from "../../lib/modifiers/registry";
import { useTags } from "../useItems";

/** True if `wordStart` is preceded by exactly one space (not 0, not 2+). */
function isSingleSpaceAway(text: string, wordStart: number): boolean {
  if (wordStart === 0 || text[wordStart - 1] !== " ") return false;
  return wordStart === 1 || text[wordStart - 2] !== " ";
}

const EMPTY_TAGS: string[] = [];

export function usePromptHelper(
  inputRef: React.RefObject<HTMLTextAreaElement | null>,
  setPrompt: (prompt: string) => void,
) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [options, setOptions] = useState<PromptOption[]>([]);
  const { data: tags = EMPTY_TAGS } = useTags();

  const isOpen = options.length > 0;

  const update = useCallback(() => {
    const input = inputRef.current;
    if (!input) {
      setOptions([]);
      return;
    }

    const cursorPos = input.selectionStart ?? 0;
    const textUntilCursor = input.value.slice(0, cursorPos);
    const trimmedStart = textUntilCursor.trimStart();
    const isCommandContext = trimmedStart.startsWith(COMMAND_PREFIX);
    const wordStart = textUntilCursor.lastIndexOf(" ") + 1;
    const word = textUntilCursor.slice(wordStart, cursorPos);

    if (isCommandContext) {
      const spaceIndex = trimmedStart.indexOf(" ");

      if (spaceIndex === -1) {
        const filter = word.slice(1).toLowerCase();

        setOptions(
          getAllCommands()
            .filter((cmd) => cmd.id.toLowerCase().includes(filter))
            .map((cmd) =>
              toPromptOption("COMMAND", {
                name: cmd.displayName,
                description: cmd.description,
                value: cmd.id + " ",
              }),
            ),
        );
        setSelectedIndex(0);
        return;
      }

      const cmdId = trimmedStart.slice(1, spaceIndex);
      const command = getCommand(cmdId);
      const rawargs = trimmedStart.slice(spaceIndex + 1);

      const strict = command?.strictArgPosition ?? true;
      const spacingOk = !strict || isSingleSpaceAway(textUntilCursor, wordStart);

      setOptions(spacingOk ? (command?.getOptions?.(rawargs, { tags }) ?? []) : []);
      setSelectedIndex(0);
      return;
    }

    const modifier = getModifier(word[0]);
    setOptions(modifier?.getOptions?.(word.slice(1), { tags }) ?? []);
    setSelectedIndex(0);
  }, [inputRef, tags]);

  const onSelect = (index?: number) => {
    const input = inputRef.current;
    if (!input || options.length === 0) {
      setOptions([]);
      return;
    }

    const idx = index ?? selectedIndex;
    const selected = options[idx];
    if (!selected) return;

    const cursorPos = input.selectionStart ?? 0;
    const value = input.value;

    const textUntilCursor = value.slice(0, cursorPos);
    let wordStart = textUntilCursor.lastIndexOf(" ") + 1;

    if (selected.kind === "COMMAND_ARG") {
      const trimmedStart = textUntilCursor.trimStart();
      const spaceIndex = trimmedStart.startsWith(COMMAND_PREFIX) ? trimmedStart.indexOf(" ") : -1;

      if (spaceIndex !== -1) {
        const command = getCommand(trimmedStart.slice(1, spaceIndex));
        const leadingWhitespace = textUntilCursor.length - trimmedStart.length;
        const rawArgsStart = leadingWhitespace + spaceIndex + 1;
        const rawArgsSoFar = value.slice(rawArgsStart, cursorPos);

        wordStart = rawArgsStart + commandArgStart(rawArgsSoFar, command?.argCount ?? 1);
      }
    }

    const textFromCursor = value.slice(cursorPos);
    const spaceAfterOffset = textFromCursor.indexOf(" ");
    const wordEnd = spaceAfterOffset === -1 ? value.length : cursorPos + spaceAfterOffset;

    const before = value.slice(0, wordStart);
    const delimiter = value[wordStart] ?? "";
    const after = value.slice(wordEnd);

    const inserted =
      selected.kind === "COMMAND_ARG" ? selected.value : `${delimiter}${selected.value}`;
    const newPrompt = `${before}${inserted}${after}`;
    const newCursorPos = before.length + inserted.length;

    if (selected.kind === "MODIFIER") {
      const newPrompt = `${before}${selected.value}`;
      setPrompt(newPrompt);
      requestAnimationFrame(() => {
        input.focus();
        input.setSelectionRange(newPrompt.length, newPrompt.length);
        update();
      });
      return;
    }

    setPrompt(newPrompt);
    setOptions([]);

    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(newCursorPos, newCursorPos);
    });
  };

  const onKeyDown = (e: KeyboardEvent): boolean => {
    if (!isOpen) return false;

    switch (e.key) {
      case "Tab":
        e.preventDefault();
        if (e.shiftKey) {
          setSelectedIndex((prev) => (prev - 1 + options.length) % options.length);
        } else {
          setSelectedIndex((prev) => (prev + 1) % options.length);
        }
        return true;
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % options.length);
        return true;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + options.length) % options.length);
        return true;
      case "Enter":
        e.preventDefault();
        onSelect();
        return true;
      case "Escape":
        e.preventDefault();
        setOptions([]);
        return true;
      default:
        return false;
    }
  };

  return {
    options,
    selectedIndex,
    isOpen,
    update,
    onKeyDown,
    onSelect,
    setSelectedIndex,
  };
}

export type PromptHelper = ReturnType<typeof usePromptHelper>;
