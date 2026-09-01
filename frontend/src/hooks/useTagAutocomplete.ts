import { useCallback, useState, type KeyboardEvent } from "react";
import { getModifier } from "../lib/modifiers/registry";
import { TAG_MODIFIER } from "../lib/modifiers/delimiters";
import type { PromptOption } from "../lib/promptOptions";
import { useTags } from "./useItems";

function currentWord(text: string, cursor: number) {
  const start = text.slice(0, cursor).lastIndexOf(" ") + 1;
  const afterCursor = text.slice(cursor);
  const spaceAfter = afterCursor.indexOf(" ");
  const end = spaceAfter === -1 ? text.length : cursor + spaceAfter;
  return { start, end, word: text.slice(start, end) };
}

export function useTagAutocomplete(
  inputRef: React.RefObject<HTMLTextAreaElement | null>,
  setValue: (value: string) => void,
) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [options, setOptions] = useState<PromptOption[]>([]);
  const { data: tags } = useTags();

  const isOpen = options.length > 0;

  const update = useCallback(() => {
    const input = inputRef.current;
    if (!input) {
      setOptions([]);
      return;
    }

    const cursorPos = input.selectionStart ?? 0;
    const { word } = currentWord(input.value, cursorPos);

    if (!word.startsWith(TAG_MODIFIER)) {
      setOptions([]);
      return;
    }

    setOptions(getModifier(TAG_MODIFIER)?.getOptions?.(word.slice(1), { tags }) ?? []);
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
    const { start, end } = currentWord(input.value, cursorPos);

    const before = input.value.slice(0, start);
    const after = input.value.slice(end);
    const inserted = `${TAG_MODIFIER}${selected.value} `;
    const newValue = `${before}${inserted}${after}`;
    const newCursorPos = before.length + inserted.length;

    setValue(newValue);
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

export type TagAutocomplete = ReturnType<typeof useTagAutocomplete>;
