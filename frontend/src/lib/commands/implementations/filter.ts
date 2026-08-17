import { getItems } from "../../../api/items";
import type { GetItemRequest } from "../../../types/backend";
import {
  DESCRIPTION_MODIFIER,
  PRIORITY_MODIFIER,
  STATUS_MODIFIER,
  TAG_MODIFIER,
} from "../../modifiers/delimiters";
import { getAllModifiers, getModifier } from "../../modifiers/registry";
import { queryClient } from "../../queryClient";
import { currentArgToken } from "../argToken";
import type { CommandDefinition } from "../types";

export function parseFilter(raw: string): GetItemRequest {
  let remaining = raw;
  const collected: Record<string, string[]> = {};

  for (const modifier of getAllModifiers()) {
    if (!modifier.extract || modifier.id === "?") continue;

    const { values, remaining: rest } = modifier.extract(remaining);
    collected[modifier.id] = values;
    remaining = rest;
  }

  const tags = collected[TAG_MODIFIER];
  const status = collected[STATUS_MODIFIER];
  const priority = collected[PRIORITY_MODIFIER];

  const descStart = remaining.indexOf(DESCRIPTION_MODIFIER);
  const title = (descStart === -1 ? remaining : remaining.slice(0, descStart)).trim() || undefined;
  const description =
    descStart === -1 ? undefined : remaining.slice(descStart + 1).trim() || undefined;

  return {
    title,
    description,
    tags: tags.length ? tags : undefined,
    priority: priority.length ? priority : undefined,
    status: status.length ? status : undefined,
  };
}

async function runFilter(filter: GetItemRequest) {
  await queryClient.fetchQuery({
    queryKey: ["items", filter],
    queryFn: () => getItems(filter),
  });
}

export const filterCommand: CommandDefinition = {
  id: "filter",
  displayName: "/filter",
  description: "Filter items",
  // The "args" here are free filter text (modifiers can show up anywhere,
  // not just right after the command name), so positional spacing doesn't apply.
  strictArgPosition: false,
  getOptions: (rawArgs) => {
    const current = currentArgToken(rawArgs).current;
    const modifier = getModifier(current[0]);
    return modifier?.getOptions?.(current.slice(1)) ?? [];
  },
  execute: async ({ rawArgs }) => {
    await runFilter(parseFilter(rawArgs));
  },
};
