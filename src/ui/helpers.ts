import chalk from "chalk";
import type { Agent } from "../types/index.ts";

/** Apply the agent's named chalk color to text. */
export function colorize(agent: Agent, text: string): string {
  const fn = (chalk as unknown as Record<string, unknown>)[agent.color];
  return typeof fn === "function"
    ? (fn as (t: string) => string)(text)
    : text;
}
