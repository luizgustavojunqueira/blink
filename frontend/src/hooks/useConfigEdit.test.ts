import { act, renderHook } from "@testing-library/react";
import type { KeyboardEvent } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useConfigEdit } from "./useConfigEdit";
import { useUiStore } from "../stores/ui";
import { createConfigPane } from "../lib/pane/factories";

const ROW = "keys:moveDown";

const enter = () =>
  ({ key: "Enter", preventDefault: vi.fn(), stopPropagation: vi.fn() }) as unknown as KeyboardEvent<HTMLTextAreaElement>;

beforeEach(() => {
  const pane = createConfigPane("config", ROW);
  useUiStore.setState({ mode: "insert", panes: [pane], activePaneId: pane.id });
});

const setup = () => {
  const commit = vi.fn((draft: string) => (draft === "k" ? `"k" is already used` : null));
  const hook = renderHook(() => useConfigEdit({ paneId: "config", rowId: ROW, value: "j", commit }));
  const type = (draft: string) => act(() => hook.result.current.setDraft(draft));
  const press = () => act(() => hook.result.current.onKeyDown(enter()));
  return { hook, type, press };
};

describe("useConfigEdit", () => {
  it("shows the error of a rejected value", () => {
    const { hook, type, press } = setup();

    type("k");
    press();

    expect(hook.result.current.error).toBe(`"k" is already used`);
    expect(useUiStore.getState().mode).toBe("insert");
  });

  it("clears the error once another value is saved", () => {
    const { hook, type, press } = setup();

    type("k");
    press();
    type("x");
    press();

    expect(hook.result.current.error).toBeNull();
    expect(useUiStore.getState().mode).toBe("normal");
  });

  it("clears the error when the value is changed back and saved", () => {
    const { hook, type, press } = setup();

    type("k");
    press();
    type("j");
    press();

    expect(hook.result.current.error).toBeNull();
  });

  it("clears the error when the field loses focus", () => {
    const { hook, type, press } = setup();

    type("k");
    press();
    type("x");
    act(() => hook.result.current.onBlur());

    expect(hook.result.current.error).toBeNull();
  });
});
