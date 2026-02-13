import chalk from "chalk";
import type { Agent, AgentName, Tournament } from "../types/index.ts";

function colorize(color: string, text: string): string {
  const fn = (chalk as unknown as Record<string, unknown>)[color];
  return typeof fn === "function"
    ? (fn as (t: string) => string)(text)
    : text;
}

function getAgentColor(name: AgentName, agents: Record<AgentName, Agent>): string {
  return agents[name]?.color ?? "white";
}

function pad(text: string, len: number): string {
  const visible = text.replace(/\x1b\[[0-9;]*m/g, "");
  return text + " ".repeat(Math.max(0, len - visible.length));
}

export function showBracket(tournament: Tournament, agents: Record<AgentName, Agent>): void {
  const w = 18; // width for name slot
  const matches = tournament.matches;

  function agentLabel(name: AgentName | undefined, highlight: boolean = false): string {
    if (!name) return chalk.gray("???".padEnd(w - 3));
    const display = agents[name]?.displayName ?? name;
    const color = getAgentColor(name, agents);
    const text = display.length > w - 2 ? display.slice(0, w - 2) : display;
    const colored = colorize(color, highlight ? chalk.bold(text) : text);
    return pad(colored, w - 2);
  }

  // Quarter-finals
  const qf1 = matches[0]!;
  const qf2 = matches[1]!;
  const qf3 = matches[2]!;
  const qf4 = matches[3]!;
  // Semi-finals
  const sf1 = matches[4]!;
  const sf2 = matches[5]!;
  // Finals
  const final = matches[6]!;

  const sf1a1 = qf1.winner ?? undefined;
  const sf1a2 = qf2.winner ?? undefined;
  const sf2a1 = qf3.winner ?? undefined;
  const sf2a2 = qf4.winner ?? undefined;
  const f1 = sf1.winner ?? undefined;
  const f2 = sf2.winner ?? undefined;
  const champ = final.winner ?? undefined;

  console.log(chalk.bold.yellow("\n  TOURNAMENT BRACKET\n"));

  const g = chalk.gray;
  const lines = [
    `  ${g("\u250C\u2500")} ${agentLabel(qf1.agent1, qf1.winner === qf1.agent1)} ${g("\u2510")}`,
    `  ${g("\u2502")}${" ".repeat(w)}${g("\u251C\u2500")} ${agentLabel(sf1a1, sf1.winner === sf1a1)} ${g("\u2510")}`,
    `  ${g("\u2514\u2500")} ${agentLabel(qf1.agent2, qf1.winner === qf1.agent2)} ${g("\u2518")}${" ".repeat(w)}${g("\u2502")}`,
    `  ${" ".repeat(w + 2)}${" ".repeat(w + 2)}${g("\u251C\u2500")} ${agentLabel(f1, final.winner === f1)} ${g("\u2510")}`,
    `  ${g("\u250C\u2500")} ${agentLabel(qf2.agent1, qf2.winner === qf2.agent1)} ${g("\u2510")}${" ".repeat(w)}${g("\u2502")}`,
    `  ${g("\u2502")}${" ".repeat(w)}${g("\u251C\u2500")} ${agentLabel(sf1a2, sf1.winner === sf1a2)} ${g("\u2518")}`,
    `  ${g("\u2514\u2500")} ${agentLabel(qf2.agent2, qf2.winner === qf2.agent2)} ${g("\u2518")}`,
    ``,
    champ
      ? `  ${" ".repeat(w * 2 + 8)}${g("\u251C\u2500")} ${colorize(getAgentColor(champ, agents), chalk.bold(agents[champ]?.displayName ?? champ))} ${chalk.yellow("\uD83C\uDFC6")}`
      : `  ${" ".repeat(w * 2 + 8)}${g("\u251C\u2500")} ${chalk.gray("???")}`,
    ``,
    `  ${g("\u250C\u2500")} ${agentLabel(qf3.agent1, qf3.winner === qf3.agent1)} ${g("\u2510")}`,
    `  ${g("\u2502")}${" ".repeat(w)}${g("\u251C\u2500")} ${agentLabel(sf2a1, sf2.winner === sf2a1)} ${g("\u2510")}`,
    `  ${g("\u2514\u2500")} ${agentLabel(qf3.agent2, qf3.winner === qf3.agent2)} ${g("\u2518")}${" ".repeat(w)}${g("\u2502")}`,
    `  ${" ".repeat(w + 2)}${" ".repeat(w + 2)}${g("\u251C\u2500")} ${agentLabel(f2, final.winner === f2)} ${g("\u2518")}`,
    `  ${g("\u250C\u2500")} ${agentLabel(qf4.agent1, qf4.winner === qf4.agent1)} ${g("\u2510")}${" ".repeat(w)}${g("\u2502")}`,
    `  ${g("\u2502")}${" ".repeat(w)}${g("\u251C\u2500")} ${agentLabel(sf2a2, sf2.winner === sf2a2)} ${g("\u2518")}`,
    `  ${g("\u2514\u2500")} ${agentLabel(qf4.agent2, qf4.winner === qf4.agent2)} ${g("\u2518")}`,
  ];

  for (const line of lines) {
    console.log(line);
  }
  console.log();
}
