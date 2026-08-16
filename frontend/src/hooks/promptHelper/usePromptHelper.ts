import { useState, type KeyboardEvent } from "react";
import { getOptionType, MODIFIER_OPTIONS, optionsByType } from "./utils";
import { COMMAND_PREFIX, getAllCommands, getCommand } from "../../lib/commands/registry";
import { toPromptOption, type PromptOption } from "../../lib/promptOptions";

export function usePromptHelper(
  inputRef: React.RefObject<HTMLInputElement | null>,
  setPrompt: (prompt: string) => void,
) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [options, setOptions] = useState<PromptOption[]>([]);

  const isOpen = options.length > 0;

  const update = () => {
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

    if (word === "?") {
      setOptions(isCommandContext ? [] : MODIFIER_OPTIONS);
      setSelectedIndex(0);
      return;
    }

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

      setOptions(command?.getOptions?.(rawargs) ?? []);
      setSelectedIndex(0);
      return;
    }

    const modifier = word[0];

    const filter = word.slice(1).toUpperCase();

    const kind = getOptionType(modifier);
    const newOptions = kind
      ? optionsByType[kind].filter((opt) => opt.value.toUpperCase().includes(filter))
      : [];

    setOptions(newOptions);
    setSelectedIndex(0);
  };

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
    const wordStart = textUntilCursor.lastIndexOf(" ") + 1;

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
      case "ArrowDown":
      case "Tab":
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
