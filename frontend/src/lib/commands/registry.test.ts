import { describe, expect, it } from "vitest";
import { useUiStore } from "../../stores/ui";
import {
  DESCRIPTION_MODIFIER,
  HELP_MODIFIER,
  ORDER_MODIFIER,
  STATUS_MODIFIER,
  TYPE_MODIFIER,
} from "../modifiers/delimiters";
import { modifierOptions } from "../modifiers/options";
import { getModifier } from "../modifiers/registry";
import { createConfigPane, createRootPane } from "../pane/factories";
import {
  commands,
  getAllCommands,
  isCommandAvailable,
  modifiersFor,
} from "./registry";

describe("isCommandAvailable", () => {
  it("allows commands without when() anywhere", () => {
    const config = createConfigPane("c1");
    useUiStore.setState({
      panes: [createRootPane(), config],
      activePaneId: config.id,
    });

    expect(isCommandAvailable(commands.theme, useUiStore.getState())).toBe(
      true,
    );
    expect(isCommandAvailable(commands.config, useUiStore.getState())).toBe(
      true,
    );
  });

  it("hides list commands outside a list pane", () => {
    const config = createConfigPane("c1");
    useUiStore.setState({
      panes: [createRootPane(), config],
      activePaneId: config.id,
    });

    expect(isCommandAvailable(commands.filter, useUiStore.getState())).toBe(
      false,
    );
    expect(isCommandAvailable(commands.create, useUiStore.getState())).toBe(
      false,
    );
  });

  it("hides :group until something is marked", () => {
    const root = createRootPane();
    useUiStore.setState({ panes: [root], activePaneId: root.id });
    expect(isCommandAvailable(commands.group, useUiStore.getState())).toBe(
      false,
    );

    useUiStore.setState({ panes: [{ ...root, markedGuids: new Set(["a"]) }] });
    expect(isCommandAvailable(commands.group, useUiStore.getState())).toBe(
      true,
    );
  });
});

describe("modifiersFor", () => {
  it("uses the filter modifiers for plain text and unknown commands", () => {
    expect(modifiersFor("milk")).toBe(commands.filter.modifiers);
    expect(modifiersFor(":banana milk")).toBe(commands.filter.modifiers);
  });

  it("uses the typed command's modifiers", () => {
    expect(modifiersFor("  :EDIT title")).toBe(commands.edit.modifiers);
    expect(modifiersFor(":theme nord")).toEqual([]);
  });

  it("never lets :create or :edit order, nor :edit change the type", () => {
    expect(commands.create.modifiers).not.toContain(ORDER_MODIFIER);
    expect(commands.edit.modifiers).not.toContain(ORDER_MODIFIER);
    expect(commands.edit.modifiers).not.toContain(TYPE_MODIFIER);
  });

  it("only declares modifiers that exist", () => {
    for (const cmd of getAllCommands())
      for (const m of cmd.modifiers ?? []) expect(getModifier(m)).toBeDefined();
  });
});

describe("modifierOptions", () => {
  const allowed = [STATUS_MODIFIER, DESCRIPTION_MODIFIER, HELP_MODIFIER];

  it("suggests nothing for a modifier the command doesn't accept", () => {
    expect(modifierOptions(allowed)(`${ORDER_MODIFIER}ti`)).toEqual([]);
  });

  it("suggests values for an accepted modifier", () => {
    expect(
      modifierOptions(allowed)(`${STATUS_MODIFIER}do`).length,
    ).toBeGreaterThan(0);
  });

  it("lists only accepted modifiers in the ? menu", () => {
    const names = modifierOptions(allowed)(HELP_MODIFIER).map((o) => o.name);
    expect(names).toEqual([STATUS_MODIFIER, DESCRIPTION_MODIFIER]);
  });
});
