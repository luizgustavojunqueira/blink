import type { CreateAgentResponse, GetAgentResponse } from "../types/backend";
import { api } from "./client";

export function getAgents() {
  return api<GetAgentResponse[]>("/agents");
}

export function createAgent(name: string) {
  return api<CreateAgentResponse>("/agents", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function deleteAgent(guid: string) {
  return api<void>(`/agents/${encodeURIComponent(guid)}`, { method: "DELETE" });
}
