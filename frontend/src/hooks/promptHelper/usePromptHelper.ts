import { useState, type KeyboardEvent } from "react";
import { getOptionType, optionsByType, type Option } from "./utils";

export function usePromptHelper(
  inputRef: React.RefObject<HTMLInputElement | null>,
  setPrompt: (prompt: string) => void,
) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [options, setOptions] = useState<Option[]>([]);

  const isOpen = options.length > 0;

  const update = () => {
    const input = inputRef.current;
    if (!input) {
      setOptions([]);
      return;
    }

    const cursorPos = input.selectionStart ?? 0;
    const textUntilCursor = input.value.slice(0, cursorPos);
    const wordStart = textUntilCursor.lastIndexOf(" ") + 1;
    const word = textUntilCursor.slice(wordStart, cursorPos);

    if (word === "?") {
      setOptions(optionsByType.MODIFIER);
      setSelectedIndex(0);
      return;
    }

    if (word.startsWith("/")) {
      const filter = word.slice(1).toUpperCase();
      setOptions(
        optionsByType.COMMAND.filter(
          (o) =>
            o.value.toUpperCase().includes(filter) ||
            o.name.toUpperCase().includes(filter),
        ),
      );
      setSelectedIndex(0);
      return;
    }

    const modifier = word[0];

    const filter = word.slice(1).toUpperCase();

    const newOptions = optionsByType[getOptionType(modifier)].filter((opt) =>
      opt.value.includes(filter),
    );

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

    const before = value.slice(0, wordStart);
    const delimiter = value[wordStart] ?? "";
    const after = value.slice(cursorPos);

    const inserted = `${delimiter}${selected.value}`;
    const newPrompt = `${before}${inserted}${after}`;
    const newCursorPos = before.length + inserted.length;

    if (selected.type === "MODIFIER") {
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
        setSelectedIndex(
          (prev) => (prev - 1 + options.length) % options.length,
        );
        return true;
      case "ArrowRight":
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
