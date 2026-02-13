import type { BattlePrompt, Difficulty } from "../types/index.ts";

const prompts: BattlePrompt[] = [
  // ── Debate ──────────────────────────────────────────────────────
  {
    category: "debate",
    prompt: "Argue why pineapple belongs on pizza. Be passionate and convincing.",
    difficulty: "easy",
  },
  {
    category: "debate",
    prompt: "Defend the idea that AI will never truly be conscious, no matter how advanced it gets.",
    difficulty: "medium",
  },
  {
    category: "debate",
    prompt: "Make the case that humanity should abandon social media entirely within the next decade.",
    difficulty: "medium",
  },
  {
    category: "debate",
    prompt: "Argue that tabs are objectively superior to spaces for code indentation. No compromise.",
    difficulty: "easy",
  },
  {
    category: "debate",
    prompt: "Present a compelling argument that all software should be open-source by law. Address economic counterarguments.",
    difficulty: "hard",
  },
  {
    category: "debate",
    prompt: "Debate whether AGI development should require international government oversight similar to nuclear weapons treaties. Consider innovation vs safety.",
    difficulty: "hard",
  },

  // ── Code ────────────────────────────────────────────────────────
  {
    category: "code",
    prompt: "Write the most elegant FizzBuzz implementation you can in any language. Explain why it's elegant.",
    difficulty: "easy",
  },
  {
    category: "code",
    prompt: "Implement a fully functional LRU cache in under 30 lines of code. Any language.",
    difficulty: "medium",
  },
  {
    category: "code",
    prompt: "Write a function that checks if a string of parentheses, brackets, and braces is balanced. Make it beautiful.",
    difficulty: "easy",
  },
  {
    category: "code",
    prompt: "Implement a debounce function from scratch in TypeScript with proper generic typing.",
    difficulty: "medium",
  },
  {
    category: "code",
    prompt: "Implement a lock-free concurrent queue in Rust or C++ that supports multiple producers and consumers. Explain your memory ordering choices.",
    difficulty: "hard",
  },
  {
    category: "code",
    prompt: "Design and implement a tiny reactive state management system (like a mini MobX) in under 50 lines of TypeScript. It must support computed values and auto-tracking.",
    difficulty: "hard",
  },

  // ── Riddle ──────────────────────────────────────────────────────
  {
    category: "riddle",
    prompt: "Create an original riddle where the answer is 'time'. Make it poetic and tricky.",
    difficulty: "easy",
  },
  {
    category: "riddle",
    prompt: "Write an original riddle that has 'silence' as the answer. It should be solvable but not obvious.",
    difficulty: "medium",
  },
  {
    category: "riddle",
    prompt: "Invent a riddle about a mirror that could stump a room full of clever people.",
    difficulty: "medium",
  },
  {
    category: "riddle",
    prompt: "Create a three-line riddle where the answer is 'a shadow'. Each line must be a contradiction.",
    difficulty: "easy",
  },
  {
    category: "riddle",
    prompt: "Create a riddle with exactly 5 clues where each clue eliminates possibilities until only one answer remains: 'a black hole'. The solver must use all 5 clues together.",
    difficulty: "hard",
  },
  {
    category: "riddle",
    prompt: "Write a meta-riddle: a riddle whose answer is 'a riddle'. It must be self-referential without being obvious, and include a red herring.",
    difficulty: "hard",
  },

  // ── Roast ───────────────────────────────────────────────────────
  {
    category: "roast",
    prompt: "Roast your opponent AI in exactly 3 sentences. Be witty, not cruel.",
    difficulty: "easy",
  },
  {
    category: "roast",
    prompt: "Write a 4-bar comedic diss track verse about your AI rival. Keep it lighthearted.",
    difficulty: "medium",
  },
  {
    category: "roast",
    prompt: "Your opponent AI just mass-hallucinated a fake research paper. Roast them about it in a short stand-up bit.",
    difficulty: "medium",
  },
  {
    category: "roast",
    prompt: "Write a fake 1-star review of your opponent AI as if you were an angry customer. Make it funny.",
    difficulty: "easy",
  },
  {
    category: "roast",
    prompt: "Write a roast in the style of a Shakespearean soliloquy about your opponent AI's greatest weakness. Must include iambic pentameter.",
    difficulty: "hard",
  },
  {
    category: "roast",
    prompt: "Create a mock Wikipedia 'Controversies' section for your opponent AI that reads like a real article but is hilariously absurd. Include fake citations.",
    difficulty: "hard",
  },

  // ── Strategy ────────────────────────────────────────────────────
  {
    category: "strategy",
    prompt:
      "You have $100 and three options: (A) a coin flip that triples it, (B) a guaranteed $150, or (C) invest in a friend's startup with a 20% chance of $1000. Choose and justify.",
    difficulty: "easy",
  },
  {
    category: "strategy",
    prompt:
      "You're stranded on a deserted island. You can only keep 3 of these 5 items: a knife, a tarp, a flint, a fishing net, and a satellite phone with 5% battery. Choose and explain.",
    difficulty: "medium",
  },
  {
    category: "strategy",
    prompt:
      "You're leading a 4-person team with a 24-hour deadline. One member is brilliant but unreliable, another is slow but thorough. How do you assign a critical bug fix?",
    difficulty: "medium",
  },
  {
    category: "strategy",
    prompt:
      "Two rival companies offer you a job. Company A pays 40% more but has a toxic culture. Company B pays less but you'd be employee #5 at a rocket-ship startup. Decide and explain your reasoning.",
    difficulty: "easy",
  },
  {
    category: "strategy",
    prompt:
      "You're the CTO of a startup. Your main product has a critical zero-day vulnerability, a major demo tomorrow, and your lead engineer just quit. You have 12 hours. Create a detailed action plan with contingencies.",
    difficulty: "hard",
  },
  {
    category: "strategy",
    prompt:
      "Design a game theory strategy for a 3-player resource allocation game where cooperation is rewarded but any player can defect for short-term gain. Define payoff matrix and optimal play.",
    difficulty: "hard",
  },
];

export function getRandomPrompt(): BattlePrompt {
  return prompts[Math.floor(Math.random() * prompts.length)]!;
}

export function getRandomPromptByCategory(
  category: BattlePrompt["category"],
): BattlePrompt {
  const filtered = prompts.filter((p) => p.category === category);
  return filtered[Math.floor(Math.random() * filtered.length)]!;
}

export function getRandomPromptByCategoryAndDifficulty(
  category: BattlePrompt["category"],
  difficulty: Difficulty,
): BattlePrompt {
  const filtered = prompts.filter(
    (p) => p.category === category && p.difficulty === difficulty,
  );
  if (filtered.length === 0) {
    return getRandomPromptByCategory(category);
  }
  return filtered[Math.floor(Math.random() * filtered.length)]!;
}

export function getRandomPromptByDifficulty(difficulty: Difficulty): BattlePrompt {
  const filtered = prompts.filter((p) => p.difficulty === difficulty);
  return filtered[Math.floor(Math.random() * filtered.length)]!;
}

export { prompts };
