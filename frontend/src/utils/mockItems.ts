import { faker } from "@faker-js/faker";
import type { GetItemResponse } from "../types/backend";

const MOCK_ITEM_COUNT = 1000;

const statuses = ["TODO", "IN_PROGRESS", "DONE", "CANCELED", "ARCHIVED"] as const;
const priorities = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
const types = ["TASK", "GROUP"] as const;

let cachedItems: GetItemResponse[] | null = null;

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateMockItems(count: number = MOCK_ITEM_COUNT): GetItemResponse[] {
  if (cachedItems && cachedItems.length === count) return cachedItems;

  cachedItems = Array.from({ length: count }, () => ({
    guid: faker.string.uuid(),
    title: faker.lorem.sentence({ min: 3, max: 8 }),
    description: Math.random() > 0.3 ? faker.lorem.paragraph() : undefined,
    type: pick(types),
    status: pick(statuses),
    priority: pick(priorities),
    tags: Array.from({ length: Math.floor(Math.random() * 5) }, () => faker.word.noun()),
  }));

  return cachedItems;
}

export function resetMockItems() {
  cachedItems = null;
}
