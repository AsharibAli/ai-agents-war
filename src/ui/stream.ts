import chalk from "chalk";
import ora from "ora";
import type { Agent, AgentName, BattleResponse } from "../types/index.ts";
import {
  AGENT_MODELS,
  AGENT_FALLBACK_MODELS,
  callOpenRouterStream,
  callAgent,
} from "../agents/index.ts";
import { getPersonality } from "../agents/personalities.ts";
import { colorize } from "./helpers.ts";

function wrapText(text: string, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (paragraph.length === 0) {
      lines.push("");
      continue;
    }
    let remaining = paragraph;
    while (remaining.length > width) {
      let breakAt = remaining.lastIndexOf(" ", width);
      if (breakAt <= 0) breakAt = width;
      lines.push(remaining.slice(0, breakAt));
      remaining = remaining.slice(breakAt + 1);
    }
    if (remaining.length > 0) lines.push(remaining);
  }
  return lines;
}

/**
 * Stream both agent responses side-by-side in the terminal.
 * Falls back to non-streaming if streaming fails.
 */
export async function streamBattle(
  agent1: Agent,
  agent2: Agent,
  prompt: string,
): Promise<[BattleResponse, BattleResponse]> {
  const termWidth = process.stdout.columns || 100;
  const colWidth = Math.floor(termWidth / 2) - 3;
  const separator = chalk.gray("\u2502");

  // Print headers
  const header1 = colorize(agent1, chalk.bold(agent1.displayName));
  const header2 = colorize(agent2, chalk.bold(agent2.displayName));
  console.log();
  console.log(`  ${header1}${" ".repeat(Math.max(1, colWidth - agent1.displayName.length + 2))}${separator}  ${header2}`);
  console.log(`  ${chalk.gray("\u2500".repeat(colWidth))}${separator}${chalk.gray("\u2500".repeat(colWidth))}`);

  let text1 = "";
  let text2 = "";
  let done1 = false;
  let done2 = false;
  let lines1: string[] = [];
  let lines2: string[] = [];
  let lastRenderedLines = 0;
  const start1 = performance.now();
  const start2 = performance.now();
  let time1 = 0;
  let time2 = 0;

  function render() {
    lines1 = wrapText(text1, colWidth - 2);
    lines2 = wrapText(text2, colWidth - 2);
    const maxLines = Math.max(lines1.length, lines2.length, 1);

    // Clear previously rendered lines
    if (lastRenderedLines > 0) {
      process.stdout.write(`\x1b[${lastRenderedLines}A`);
      for (let i = 0; i < lastRenderedLines; i++) {
        process.stdout.write(`\x1b[2K\n`);
      }
      process.stdout.write(`\x1b[${lastRenderedLines}A`);
    }

    for (let i = 0; i < maxLines; i++) {
      const l1 = (lines1[i] ?? "").padEnd(colWidth);
      const l2 = lines2[i] ?? "";
      const cursor1 = !done1 && i === lines1.length - 1 ? chalk.green("\u2588") : " ";
      const cursor2 = !done2 && i === lines2.length - 1 ? chalk.green("\u2588") : "";
      process.stdout.write(`  ${l1}${cursor1}${separator}  ${l2}${cursor2}\n`);
    }

    lastRenderedLines = maxLines;
  }

  // Try streaming both agents in parallel
  let streamFailed1 = false;
  let streamFailed2 = false;

  const model1 = AGENT_MODELS[agent1.name as AgentName];
  const model2 = AGENT_MODELS[agent2.name as AgentName];
  const personality1 = getPersonality(agent1.name as AgentName);
  const personality2 = getPersonality(agent2.name as AgentName);

  const renderInterval = setInterval(render, 100);

  const stream1Promise = callOpenRouterStream(model1, prompt, personality1, {
    onChunk: (chunk) => { text1 += chunk; },
    onDone: () => { done1 = true; time1 = Math.round(performance.now() - start1); },
    onError: () => { streamFailed1 = true; done1 = true; },
  }).catch(async (err) => {
    streamFailed1 = true;
    done1 = true;
    // Try fallback model with streaming
    const fallback = AGENT_FALLBACK_MODELS[agent1.name as AgentName];
    if (fallback) {
      try {
        text1 = "";
        done1 = false;
        const result = await callOpenRouterStream(fallback, prompt, personality1, {
          onChunk: (chunk) => { text1 += chunk; },
          onDone: () => { done1 = true; time1 = Math.round(performance.now() - start1); },
          onError: () => { streamFailed1 = true; done1 = true; },
        });
        return result;
      } catch {
        // Fall back to non-streaming
        try {
          const resp = await callAgent(agent1.name as AgentName, prompt);
          text1 = resp.response;
          time1 = resp.timeMs;
          done1 = true;
          return resp.response;
        } catch {
          text1 = `[Error: ${err instanceof Error ? err.message : String(err)}]`;
          done1 = true;
          return text1;
        }
      }
    }
    // Non-streaming fallback
    try {
      const resp = await callAgent(agent1.name as AgentName, prompt);
      text1 = resp.response;
      time1 = resp.timeMs;
      done1 = true;
      return resp.response;
    } catch {
      text1 = `[Error: ${err instanceof Error ? err.message : String(err)}]`;
      done1 = true;
      return text1;
    }
  });

  const stream2Promise = callOpenRouterStream(model2, prompt, personality2, {
    onChunk: (chunk) => { text2 += chunk; },
    onDone: () => { done2 = true; time2 = Math.round(performance.now() - start2); },
    onError: () => { streamFailed2 = true; done2 = true; },
  }).catch(async (err) => {
    streamFailed2 = true;
    done2 = true;
    const fallback = AGENT_FALLBACK_MODELS[agent2.name as AgentName];
    if (fallback) {
      try {
        text2 = "";
        done2 = false;
        const result = await callOpenRouterStream(fallback, prompt, personality2, {
          onChunk: (chunk) => { text2 += chunk; },
          onDone: () => { done2 = true; time2 = Math.round(performance.now() - start2); },
          onError: () => { streamFailed2 = true; done2 = true; },
        });
        return result;
      } catch {
        try {
          const resp = await callAgent(agent2.name as AgentName, prompt);
          text2 = resp.response;
          time2 = resp.timeMs;
          done2 = true;
          return resp.response;
        } catch {
          text2 = `[Error: ${err instanceof Error ? err.message : String(err)}]`;
          done2 = true;
          return text2;
        }
      }
    }
    try {
      const resp = await callAgent(agent2.name as AgentName, prompt);
      text2 = resp.response;
      time2 = resp.timeMs;
      done2 = true;
      return resp.response;
    } catch {
      text2 = `[Error: ${err instanceof Error ? err.message : String(err)}]`;
      done2 = true;
      return text2;
    }
  });

  await Promise.all([stream1Promise, stream2Promise]);
  clearInterval(renderInterval);
  render(); // final render

  // Show timing
  console.log();
  console.log(
    `  ${colorize(agent1, agent1.displayName)}: ${chalk.gray(`${time1}ms`)}` +
    `${" ".repeat(Math.max(1, colWidth - agent1.displayName.length - String(time1).length - 2))}` +
    `${separator}  ${colorize(agent2, agent2.displayName)}: ${chalk.gray(`${time2}ms`)}`,
  );
  console.log();

  return [
    { agent: agent1.name as AgentName, response: text1, timeMs: time1 },
    { agent: agent2.name as AgentName, response: text2, timeMs: time2 },
  ];
}

// ── Spinner-based collection (no visual streaming) ───────────────────

async function collectSingleResponse(
  agent: Agent,
  prompt: string,
): Promise<BattleResponse> {
  const model = AGENT_MODELS[agent.name as AgentName];
  const personality = getPersonality(agent.name as AgentName);
  const start = performance.now();
  let text = "";
  let timeMs = 0;

  const finalize = () => { timeMs = Math.round(performance.now() - start); };

  try {
    await callOpenRouterStream(model, prompt, personality, {
      onChunk: (chunk) => { text += chunk; },
      onDone: finalize,
      onError: () => {},
    });
  } catch {
    const fallback = AGENT_FALLBACK_MODELS[agent.name as AgentName];
    if (fallback) {
      try {
        text = "";
        await callOpenRouterStream(fallback, prompt, personality, {
          onChunk: (chunk) => { text += chunk; },
          onDone: finalize,
          onError: () => {},
        });
      } catch {
        try {
          const resp = await callAgent(agent.name as AgentName, prompt);
          return resp;
        } catch (innerErr) {
          finalize();
          return {
            agent: agent.name as AgentName,
            response: `[Error: ${innerErr instanceof Error ? innerErr.message : String(innerErr)}]`,
            timeMs,
          };
        }
      }
    } else {
      try {
        const resp = await callAgent(agent.name as AgentName, prompt);
        return resp;
      } catch (innerErr) {
        finalize();
        return {
          agent: agent.name as AgentName,
          response: `[Error: ${innerErr instanceof Error ? innerErr.message : String(innerErr)}]`,
          timeMs,
        };
      }
    }
  }

  return { agent: agent.name as AgentName, response: text, timeMs };
}

/**
 * Collect both agent responses in parallel with a spinner.
 * No visual streaming — accumulates text silently.
 */
export async function collectResponses(
  agent1: Agent,
  agent2: Agent,
  prompt: string,
): Promise<[BattleResponse, BattleResponse]> {
  const spinner = ora({
    text: `${colorize(agent1, agent1.displayName)} and ${colorize(agent2, agent2.displayName)} are thinking...`,
    spinner: "dots",
  }).start();

  try {
    const [r1, r2] = await Promise.all([
      collectSingleResponse(agent1, prompt),
      collectSingleResponse(agent2, prompt),
    ]);

    spinner.succeed("Both agents have responded!");
    return [r1, r2];
  } catch (err) {
    spinner.fail("One or more agents failed to respond.");
    throw err;
  }
}
