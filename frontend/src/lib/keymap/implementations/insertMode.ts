import type { KeyBinding } from "../types";

export const prefixKeyBindings: KeyBinding[] = [
  {
    id: "insertMode",
    keys: ["i"],
    modes: ["normal"],
    scope: "list",
    description: "Enter insert mode",
    when: () => true,
    run: ({ app }) => app.ui.enterInsert(),
  },
  {
    id: "insertSearch",
    keys: ["/"],
    modes: ["normal"],
    scope: "list",
    description: "Clear the prompt and start filtering",
    when: () => true,
    run: ({ app }) => {
      app.ui.setPrompt("");
      app.ui.enterInsert();
    },
  },
  {
    id: "insertPrefix",
    keys: ["#", "!", "@", ":"],
    modes: ["normal"],
    scope: "list",
    description: "Enter insert mode with mod",
    fixed: true,
    when: () => true,
    run: ({ app }, key) => app.ui.enterInsert(key),
  },
];
