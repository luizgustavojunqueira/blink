import type { GetItemRequest } from "../../types/backend";

export type Command = { type: "FILTER"; data: GetItemRequest };

export const PRIORITY_DELIMITER = "!";
export const TAG_DELIMITER = "#";
export const STATUS_DELIMITER = "@";
export const DESCRIPTION_DELIMITER = "$";
