"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

type Mode = "adventure" | "practice" | "lab";
type Operation = "add" | "subtract" | "multiply" | "divide" | "mixed";
type Operator = "+" | "−" | "×" | "÷";
type Phase = "splash" | "modes" | "journey" | "playing" | "finished";
type SessionLevel = "apprentice" | "baker" | "master" | "endless";
type DishStage = "building" | "ready";
type AnswerFeedback = "idle" | "correct" | "wrong";

type NumberCard = {
  id: string;
  value: number;
  emoji: string;
  name: string;
};

type Token =
  | { kind: "number"; id: string; value: number }
  | { kind: "operator"; value: Operator };

type Recipe = {
  expression: string;
  signature: string;
  category: string;
  points: number;
};

type Order = {
  target: number;
  cards: NumberCard[];
  operation: Operation;
  operators: Operator[];
  timeLimit: number;
  customer: string;
  request: string;
  challenge: string;
};

type LabPiece = { id: string; weight: number; emoji: string; name: string };
type LabPuzzle = { leftBase: number; rightBase: number; pieces: LabPiece[]; moves: number };
type LabDifficulty = { minPieces: number; maxPieces: number; maxWeight: number; maxBase: number };
type DragItem =
  | { kind: "number"; id: string; label: string }
  | { kind: "operator"; operator: Operator; label: string }
  | { kind: "lab"; id: string; label: string };

const sessionLevels: Record<SessionLevel, { title: string; orders: number | null; note: string }> = {
  apprentice: { title: "Apprentice", orders: 6, note: "6 gentle orders" },
  baker: { title: "Baker", orders: 10, note: "10 growing orders" },
  master: { title: "Master Baker", orders: 12, note: "12 clever orders" },
  endless: { title: "Endless Shift", orders: null, note: "Play until you stop" },
};
const ingredientStyles = [
  { emoji: "🍓", name: "strawberry" },
  { emoji: "🫐", name: "blueberry" },
  { emoji: "🍪", name: "cookie" },
  { emoji: "🍫", name: "chocolate" },
  { emoji: "🍒", name: "cherry" },
  { emoji: "🍬", name: "candy" },
  { emoji: "🥝", name: "kiwi" },
  { emoji: "🍊", name: "orange" },
];
const customers = ["Milo", "Luna", "Pip", "Nora", "Theo", "Aya", "Max", "Ivy"];
const requests = [
  "A sparkle cake, please!",
  "Can you make my lucky number?",
  "I need a perfectly balanced treat!",
  "Something clever for my adventure!",
  "A number-perfect dessert, chef!",
];

const operatorInfo: Record<Operator, { operation: Exclude<Operation, "mixed">; title: string }> = {
  "+": { operation: "add", title: "Add" },
  "−": { operation: "subtract", title: "Subtract" },
  "×": { operation: "multiply", title: "Multiply" },
  "÷": { operation: "divide", title: "Divide" },
};

const allOperators = Object.keys(operatorInfo) as Operator[];
// Audio volume is perceived logarithmically, so each step needs a clearly larger ratio.
const musicVolumes = [0, 0.008, 0.03, 0.09, 0.2] as const;
const practiceStoryLevels: Record<Operator, number[]> = {
  "+": [1, 2, 3, 5],
  "−": [1, 2, 4, 6],
  "×": [7, 9],
  "÷": [8, 10],
};
const dishes = ["🧁", "🍰", "🥧", "🍮", "🍩", "🥐"];
const journeyNodes = [
  { icon: "🍓", title: "Tiny Numbers", skill: "+ − within 5", color: "coral", orders: 6 },
  { icon: "🧁", title: "Make Ten", skill: "+ − within 10", color: "gold", orders: 6 },
  { icon: "🌈", title: "Cross Ten", skill: "carrying addition within 20", color: "teal", orders: 6 },
  { icon: "🎒", title: "Borrow One", skill: "borrowing subtraction within 20", color: "violet", orders: 6 },
  { icon: "🍰", title: "Quick Add", skill: "mental addition within 100", color: "blue", orders: 8 },
  { icon: "🥧", title: "Quick Take Away", skill: "mental subtraction within 100", color: "coral", orders: 8 },
  { icon: "✖️", title: "Times Tables", skill: "multiplication facts", color: "gold", orders: 10 },
  { icon: "➗", title: "Fact Families", skill: "division from times tables", color: "teal", orders: 10 },
  { icon: "🚀", title: "Power Multiply", skill: "tens & hundreds × numbers", color: "violet", orders: 10 },
  { icon: "🏆", title: "Power Divide", skill: "tens & hundreds ÷ numbers", color: "blue", orders: 10 },
];

const labDifficulty: Record<Exclude<SessionLevel, "endless">, LabDifficulty> = {
  apprentice: { minPieces: 3, maxPieces: 4, maxWeight: 3, maxBase: 8 },
  baker: { minPieces: 4, maxPieces: 5, maxWeight: 4, maxBase: 12 },
  master: { minPieces: 5, maxPieces: 6, maxWeight: 5, maxBase: 15 },
};

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function makeCards(values: number[], round: number) {
  return shuffle(values).map((value, index) => ({
    id: `${round}-${index}-${value}`,
    value,
    ...ingredientStyles[index % ingredientStyles.length],
  }));
}

function createStoryOrder(level: number, question: number): Order {
  let operation: Operation = "add";
  let operators: Operator[] = ["+"];
  let solution: number[] = [2, 3];
  let target = 5;
  let challenge = "Use the cards to make the target.";

  if (level === 1 || level === 2) {
    const limit = level === 1 ? 5 : 10;
    const useAddition = (question + level) % 2 === 0;
    operators = ["+", "−"];
    if (useAddition) {
      operation = "add";
      target = randomInt(2, limit);
      const first = randomInt(1, target - 1);
      solution = [first, target - first];
    } else {
      operation = "subtract";
      const first = randomInt(2, limit);
      const second = randomInt(1, first - 1);
      target = first - second;
      solution = [first, second];
    }
    challenge = `Choose + or − and stay within ${limit}.`;
  } else if (level === 3) {
    const first = randomInt(6, 9);
    const second = randomInt(11 - first, Math.min(9, 20 - first));
    target = first + second;
    solution = [first, second];
    challenge = "Bridge through 10 to add.";
  } else if (level === 4) {
    operation = "subtract";
    operators = ["−"];
    const first = randomInt(11, 18);
    const ones = first % 10;
    const second = randomInt(Math.max(ones + 1, 2), 9);
    target = first - second;
    solution = [first, second];
    challenge = "Regroup one ten before subtracting.";
  } else if (level === 5) {
    const useWholeTen = question % 3 === 0;
    const addend = useWholeTen ? 10 : randomInt(1, 6);
    const twoDigit = useWholeTen
      ? randomInt(2, 4) * 10 + randomInt(1, 6)
      : randomInt(2, 4) * 10 + randomInt(1, 9 - addend);
    target = twoDigit + addend;
    solution = [twoDigit, addend];
    challenge = "Add a small number or one whole ten. No tricky carrying yet.";
  } else if (level === 6) {
    operation = "subtract";
    operators = ["−"];
    const useWholeTen = question % 3 === 0;
    const subtrahend = useWholeTen ? 10 : randomInt(1, 6);
    const first = useWholeTen
      ? randomInt(3, 6) * 10 + randomInt(1, 8)
      : randomInt(3, 6) * 10 + randomInt(subtrahend, 9);
    target = first - subtrahend;
    solution = [first, subtrahend];
    challenge = "Take away a small number or one whole ten. No tricky borrowing yet.";
  } else if (level === 7) {
    operation = "multiply";
    operators = ["×"];
    const first = randomInt(2, 9);
    const second = randomInt(2, 9);
    target = first * second;
    solution = [first, second];
    challenge = "Use a multiplication fact you know.";
  } else if (level === 8) {
    operation = "divide";
    operators = ["÷"];
    const divisor = randomInt(2, 9);
    target = randomInt(2, 9);
    solution = [divisor * target, divisor];
    challenge = "Use the related times-table fact.";
  } else if (level === 9) {
    operation = "multiply";
    operators = ["×"];
    const placeValue = question <= 5 ? randomInt(1, 5) * 10 : randomInt(1, 3) * 100;
    const factor = randomInt(2, question <= 5 ? 5 : 4);
    target = placeValue * factor;
    solution = [placeValue, factor];
    challenge = "Multiply one friendly ten or hundred by a small number.";
  } else if (level === 10) {
    operation = "divide";
    operators = ["÷"];
    const divisor = question <= 5 ? 10 : 100;
    target = randomInt(2, question <= 5 ? 9 : 5);
    solution = [divisor * target, divisor];
    challenge = "Divide a friendly ten or hundred into a small exact answer.";
  }

  const values = [...solution];
  const distractorMax = Math.max(10, ...solution);
  while (values.length < 5) values.push(randomInt(1, distractorMax));
  return {
    target,
    cards: makeCards(values, level * 100 + question),
    operation,
    operators,
    timeLimit: 60,
    customer: customers[(level + question - 2) % customers.length],
    request: requests[(level + question - 2) % requests.length],
    challenge,
  };
}

function createStoryDeck(level: number) {
  const orderCount = journeyNodes[level - 1]?.orders ?? 6;
  return Array.from({ length: orderCount }, (_, index) => createStoryOrder(level, index + 1));
}

function unlockedPracticeOperators(journeyProgress: number) {
  const unlockedLevel = Math.min(journeyNodes.length, journeyProgress + 1);
  return allOperators.filter((operator) => practiceStoryLevels[operator].some((level) => level <= unlockedLevel));
}

function createPracticeOrder(round: number, operators: Operator[], journeyProgress: number): Order {
  const unlockedLevel = Math.min(journeyNodes.length, journeyProgress + 1);
  const available = unlockedPracticeOperators(journeyProgress);
  const safeOperators = operators.filter((operator) => available.includes(operator));
  const selectedOperators = safeOperators.length ? safeOperators : ["+"];
  const chosen = selectedOperators[(round - 1) % selectedOperators.length];
  const eligibleLevels = practiceStoryLevels[chosen].filter((level) => level <= unlockedLevel);
  const level = eligibleLevels[(round - 1) % eligibleLevels.length] ?? 1;
  let order = createStoryOrder(level, round);
  for (let offset = 1; order.operation !== operatorInfo[chosen].operation && offset < 4; offset += 1) {
    order = createStoryOrder(level, round + offset);
  }
  return { ...order, operators: selectedOperators };
}

function createPracticeDeck(count: number, operators: Operator[], journeyProgress: number) {
  return Array.from({ length: count }, (_, index) => createPracticeOrder(index + 1, operators, journeyProgress));
}

function createTutorialOrder(): Order {
  return {
    target: 5,
    cards: makeCards([2, 3, 1, 4, 5], 1),
    operation: "add",
    operators: ["+"],
    timeLimit: 60,
    customer: "Milo",
    request: "Will you bake my first number cake?",
    challenge: "Follow Chef Mira’s glowing hand: 2 + 3 makes 5.",
  };
}

function labPuzzleSignature(puzzle: LabPuzzle) {
  const bases = [puzzle.leftBase, puzzle.rightBase].sort((a, b) => a - b).join(",");
  const weights = puzzle.pieces.map((piece) => piece.weight).sort((a, b) => a - b).join(",");
  return `${bases}|${weights}`;
}

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function endlessLabDifficulty(round: number): LabDifficulty {
  const stage = Math.floor((round - 1) / 4);
  return {
    minPieces: Math.min(6, 4 + Math.floor(stage / 3)),
    maxPieces: Math.min(7, 5 + Math.floor(stage / 2)),
    maxWeight: Math.min(5, 3 + Math.floor(stage / 2)),
    maxBase: Math.min(18, 10 + stage),
  };
}

function createLabPuzzle(round: number, level: SessionLevel, seen = new Set<string>(), sessionSeed = 0): LabPuzzle {
  const levelDifficulty = level === "endless" ? endlessLabDifficulty(round) : labDifficulty[level];
  const warmup = round <= 2
    ? { maxPieces: 3, maxWeight: 2, maxBase: 5 }
    : round <= 4
      ? { maxPieces: 4, maxWeight: 3, maxBase: 8 }
      : { maxPieces: 5, maxWeight: levelDifficulty.maxWeight, maxBase: levelDifficulty.maxBase };
  const difficulty: LabDifficulty = {
    minPieces: Math.min(levelDifficulty.minPieces, warmup.maxPieces),
    maxPieces: Math.min(levelDifficulty.maxPieces, warmup.maxPieces, 5),
    maxWeight: Math.min(levelDifficulty.maxWeight, warmup.maxWeight),
    maxBase: Math.min(levelDifficulty.maxBase, warmup.maxBase),
  };
  const levelSeed = { apprentice: 1103, baker: 2207, master: 3313, endless: 4421 }[level];

  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const random = seededRandom(levelSeed + sessionSeed * 65537 + round * 104729 + attempt * 8191);
    const pieceCount = difficulty.minPieces
      + Math.floor(random() * (difficulty.maxPieces - difficulty.minPieces + 1));
    const weights = Array.from(
      { length: pieceCount },
      () => 1 + Math.floor(random() * difficulty.maxWeight),
    );
    // Assign by index so duplicate weights are still treated as separate food groups.
    const assignments = weights.map(() => random() < 0.5 ? "left" : "right");
    const leftCount = assignments.filter((side) => side === "left").length;
    const rightCount = assignments.length - leftCount;
    if (!leftCount || !rightCount) continue;
    const leftAdded = weights.reduce((sum, weight, index) => sum + (assignments[index] === "left" ? weight : 0), 0);
    const rightAdded = weights.reduce((sum, weight, index) => sum + (assignments[index] === "right" ? weight : 0), 0);
    const difference = Math.abs(leftAdded - rightAdded);
    if (!difference || difference >= difficulty.maxBase) continue;

    const slack = 1 + Math.floor(random() * (difficulty.maxBase - difference));
    const targetWeight = Math.max(leftAdded, rightAdded) + slack;
    const puzzle: LabPuzzle = {
      leftBase: targetWeight - leftAdded,
      rightBase: targetWeight - rightAdded,
      moves: pieceCount + (level === "apprentice" ? 2 : 1),
      pieces: weights.map((weight, index) => ({
        id: `lab-${level}-${round}-${index}-${weight}`,
        weight,
        ...ingredientStyles[(index + round + levelSeed) % ingredientStyles.length],
      })),
    };
    if (!seen.has(labPuzzleSignature(puzzle))) return puzzle;
  }

  // The generated space is very large; this is only a defensive fallback.
  return createLabPuzzle(round + 10000, level, new Set(), sessionSeed);
}

function expressionText(tokens: Token[]) {
  return tokens.map((token) => token.value).join(" ");
}

function evaluateExpression(tokens: Token[]) {
  if (!tokens.length || tokens[0].kind !== "number" || tokens[tokens.length - 1].kind !== "number") return null;
  const numbers: number[] = [];
  const operators: Operator[] = [];
  tokens.forEach((token) => token.kind === "number" ? numbers.push(token.value) : operators.push(token.value));
  if (numbers.length !== operators.length + 1) return null;

  const reducedNumbers = [numbers[0]];
  const reducedOperators: Operator[] = [];
  for (let i = 0; i < operators.length; i += 1) {
    const op = operators[i];
    const value = numbers[i + 1];
    if (op === "×") reducedNumbers[reducedNumbers.length - 1] *= value;
    else if (op === "÷") {
      if (value === 0) return null;
      reducedNumbers[reducedNumbers.length - 1] /= value;
    } else {
      reducedOperators.push(op);
      reducedNumbers.push(value);
    }
  }

  return reducedOperators.reduce(
    (total, op, index) => op === "+" ? total + reducedNumbers[index + 1] : total - reducedNumbers[index + 1],
    reducedNumbers[0],
  );
}

function classifyRecipe(tokens: Token[]) {
  const numbers = tokens.filter((token): token is Extract<Token, { kind: "number" }> => token.kind === "number");
  const operators = tokens.filter((token): token is Extract<Token, { kind: "operator" }> => token.kind === "operator");
  const uniqueOps = [...new Set(operators.map((token) => token.value))];
  if (uniqueOps.length > 1) return "Mixed recipe";
  if (uniqueOps[0] === "+") return numbers.length === 2 ? "Pair recipe" : "Multi-card recipe";
  if (uniqueOps[0] === "−") return "Subtraction recipe";
  if (uniqueOps[0] === "×") return "Multiplication recipe";
  if (uniqueOps[0] === "÷") return "Division recipe";
  return "Number recipe";
}

function recipeSignature(tokens: Token[]) {
  const numbers = tokens.filter((token): token is Extract<Token, { kind: "number" }> => token.kind === "number");
  const operators = tokens.filter((token): token is Extract<Token, { kind: "operator" }> => token.kind === "operator");
  const uniqueOps = [...new Set(operators.map((token) => token.value))];
  if (uniqueOps.length === 1 && (uniqueOps[0] === "+" || uniqueOps[0] === "×")) {
    return `${uniqueOps[0]}:${numbers.map((token) => token.value).sort((a, b) => a - b).join(",")}`;
  }
  return tokens.map((token) => token.value).join("");
}

export default function Home() {
  const [phase, setPhase] = useState<Phase>("splash");
  const [mode, setMode] = useState<Mode>("adventure");
  const [practiceOperators, setPracticeOperators] = useState<Operator[]>(["+"]);
  const [sessionLevel, setSessionLevel] = useState<SessionLevel>("apprentice");
  const [storyLevel, setStoryLevel] = useState(1);
  const [storyDeck, setStoryDeck] = useState<Order[]>(() => createStoryDeck(1));
  const [completedDishes, setCompletedDishes] = useState<string[]>([]);
  const [bakedRecipes, setBakedRecipes] = useState<string[]>([]);
  const [round, setRound] = useState(1);
  const [order, setOrder] = useState<Order>(() => createStoryOrder(1, 1));
  const [labPuzzle, setLabPuzzle] = useState<LabPuzzle>(() => createLabPuzzle(1, "baker"));
  const [labPlacements, setLabPlacements] = useState<Record<string, "left" | "right">>({});
  const [labHistory, setLabHistory] = useState<Array<Record<string, "left" | "right">>>([]);
  const [selectedLabPiece, setSelectedLabPiece] = useState<string | null>(null);
  const [labMoves, setLabMoves] = useState(0);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [foundRecipes, setFoundRecipes] = useState<Recipe[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [ordersServed, setOrdersServed] = useState(0);
  const [orderTimeLeft, setOrderTimeLeft] = useState(20);
  const [fastestOrder, setFastestOrder] = useState<number | null>(null);
  const [recipeSolved, setRecipeSolved] = useState(false);
  const [message, setMessage] = useState("Build an expression, then check your recipe.");
  const [messageTone, setMessageTone] = useState<"neutral" | "good" | "try">("neutral");
  const [celebrating, setCelebrating] = useState(false);
  const [strategyCounts, setStrategyCounts] = useState<Record<string, number>>({});
  const [volumeLevel, setVolumeLevel] = useState(2);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [dishStage, setDishStage] = useState<DishStage>("building");
  const [answerFeedback, setAnswerFeedback] = useState<AnswerFeedback>("idle");
  const [storyCardDeparting, setStoryCardDeparting] = useState(false);
  const [journeyProgress, setJourneyProgress] = useState(0);
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);
  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [labMotion, setLabMotion] = useState(0);
  const audioRef = useRef<AudioContext | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const celebrationTimerRef = useRef<number | null>(null);
  const storyCardTimerRef = useRef<number | null>(null);
  const seenLabPuzzlesRef = useRef<Set<string>>(new Set());
  const labSessionSeedRef = useRef(0);
  const dragItemRef = useRef<DragItem | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragMovedRef = useRef(false);
  const suppressClickRef = useRef(false);

  const soundOn = volumeLevel > 0;
  const totalOrders = mode === "adventure" ? journeyNodes[storyLevel - 1].orders : sessionLevels[sessionLevel].orders;
  const currentValue = evaluateExpression(tokens);
  const storyExpressionIsLegal = currentValue !== null
    && tokens.filter((token) => token.kind === "number").length >= 2
    && tokens.filter((token) => token.kind === "operator").length >= 1;
  const storyCanCheck = mode !== "lab" && storyExpressionIsLegal && !recipeSolved;
  const usedCardIds = tokens
    .filter((token): token is Extract<Token, { kind: "number" }> => token.kind === "number")
    .map((token) => token.id);
  const nextNeedsNumber = !tokens.length || tokens[tokens.length - 1].kind === "operator";
  const operators = order.operators;
  const autoOperator = order.operators.length === 1 ? order.operators[0] : null;
  const numberInputActive = Boolean(autoOperator) || nextNeedsNumber;
  const operatorInputActive = !autoOperator && !nextNeedsNumber;
  const labLeftWeight = labPuzzle.leftBase + labPuzzle.pieces
    .filter((piece) => labPlacements[piece.id] === "left")
    .reduce((sum, piece) => sum + piece.weight, 0);
  const labRightWeight = labPuzzle.rightBase + labPuzzle.pieces
    .filter((piece) => labPlacements[piece.id] === "right")
    .reduce((sum, piece) => sum + piece.weight, 0);
  const availablePracticeOperators = unlockedPracticeOperators(journeyProgress);

  const ensureAudio = useCallback(() => {
    if (typeof window === "undefined") return null;
    if (!audioRef.current || audioRef.current.state === "closed") {
      audioRef.current = new AudioContext();
    }
    if (audioRef.current.state === "suspended") {
      void audioRef.current.resume().catch(() => undefined);
    }
    return audioRef.current;
  }, []);

  const playTone = useCallback((frequencies: number[], duration = 0.14, volume = 0.05) => {
    if (!soundOn) return;
    const context = ensureAudio();
    if (!context) return;
    frequencies.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = index % 2 ? "triangle" : "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, context.currentTime + index * 0.07);
      gain.gain.exponentialRampToValueAtTime(volume * (0.45 + volumeLevel * 0.11), context.currentTime + index * 0.07 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + index * 0.07 + duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(context.currentTime + index * 0.07);
      oscillator.stop(context.currentTime + index * 0.07 + duration + 0.02);
    });
  }, [ensureAudio, soundOn, volumeLevel]);

  const stopMusic = useCallback(() => {
    musicRef.current?.pause();
  }, []);

  const playMusic = useCallback(() => {
    if (!soundOn) return;
    if (!musicRef.current) {
      const music = new Audio("/audio/first-light-particles.ogg");
      music.loop = true;
      music.volume = musicVolumes[volumeLevel];
      musicRef.current = music;
    }
    musicRef.current.volume = musicVolumes[volumeLevel];
    void musicRef.current.play().catch(() => undefined);
  }, [soundOn, volumeLevel]);

  const startMusic = useCallback(() => {
    if (phase !== "playing") return;
    playMusic();
  }, [phase, playMusic]);

  useEffect(() => {
    const storedVolume = Number(window.localStorage.getItem("magic-math-volume"));
    const legacySound = window.localStorage.getItem("magic-math-sound");
    const nextLevel = Number.isInteger(storedVolume) && storedVolume >= 0 && storedVolume <= 4
      ? storedVolume
      : legacySound === "off" ? 0 : 2;
    const timer = window.setTimeout(() => setVolumeLevel(nextLevel), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (musicRef.current) musicRef.current.volume = musicVolumes[volumeLevel];
  }, [volumeLevel]);

  useEffect(() => {
    const stored = Number(window.localStorage.getItem("magic-math-journey") ?? 0);
    if (!Number.isFinite(stored)) return;
    const timer = window.setTimeout(() => setJourneyProgress(Math.min(journeyNodes.length, Math.max(0, stored))), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    startMusic();
    return stopMusic;
  }, [startMusic, stopMusic]);

  useEffect(() => {
    return () => {
      stopMusic();
      if (celebrationTimerRef.current !== null) window.clearTimeout(celebrationTimerRef.current);
      if (storyCardTimerRef.current !== null) window.clearTimeout(storyCardTimerRef.current);
      musicRef.current = null;
      const audioContext = audioRef.current;
      audioRef.current = null;
      if (audioContext && audioContext.state !== "closed") {
        void audioContext.close().catch(() => undefined);
      }
    };
  }, [stopMusic]);

  useEffect(() => {
    if (phase !== "playing" || mode === "lab" || recipeSolved || celebrating || dishStage !== "building") return;
    const timer = window.setInterval(() => {
      setOrderTimeLeft((value) => {
        const next = Math.max(-30, value - 1);
        if (next === 5) playTone([392, 523], 0.22, 0.018);
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [celebrating, dishStage, mode, phase, playTone, recipeSolved]);

  function changeVolume(level: number) {
    const nextLevel = Math.max(0, Math.min(4, level));
    setVolumeLevel(nextLevel);
    window.localStorage.setItem("magic-math-volume", String(nextLevel));
    window.localStorage.setItem("magic-math-sound", nextLevel > 0 ? "on" : "off");
    if (nextLevel === 0) stopMusic();
    else {
      ensureAudio();
      if (!musicRef.current) {
        const music = new Audio("/audio/first-light-particles.ogg");
        music.loop = true;
        music.volume = musicVolumes[nextLevel];
        musicRef.current = music;
      }
      musicRef.current.volume = musicVolumes[nextLevel];
      if (phase === "playing") void musicRef.current.play().catch(() => undefined);
    }
  }

  function resetStoryProgress() {
    if (!resetConfirm) {
      setResetConfirm(true);
      return;
    }
    setJourneyProgress(0);
    setStoryLevel(1);
    setPracticeOperators(["+"]);
    window.localStorage.setItem("magic-math-journey", "0");
    window.localStorage.removeItem("magic-math-tutorial");
    setResetConfirm(false);
  }

  function resetOrder(nextOrder: Order) {
    setOrder(nextOrder);
    setTokens([]);
    setFoundRecipes([]);
    setMistakes(0);
    setOrderTimeLeft(nextOrder.timeLimit);
    setRecipeSolved(false);
    setAnswerFeedback("idle");
    setStoryCardDeparting(false);
    setDishStage("building");
    setMessage("Build an expression, then check your recipe.");
    setMessageTone("neutral");
  }

  function resetLab(nextRound: number) {
    const nextPuzzle = createLabPuzzle(nextRound, sessionLevel, seenLabPuzzlesRef.current, labSessionSeedRef.current);
    seenLabPuzzlesRef.current.add(labPuzzleSignature(nextPuzzle));
    setLabPuzzle(nextPuzzle);
    setLabPlacements({});
    setLabHistory([]);
    setSelectedLabPiece(null);
    setLabMoves(0);
    setRecipeSolved(false);
    setDishStage("building");
    setMessage("Every dot and food icon weighs one unit. Use every loose ingredient and make both pans equal.");
    setMessageTone("neutral");
  }

  function beginDrag(event: ReactPointerEvent<HTMLElement>, item: DragItem) {
    if (recipeSolved) return;
    dragItemRef.current = item;
    dragMovedRef.current = false;
    dragStartRef.current = { x: event.clientX, y: event.clientY };
    setDragItem(item);
    setDragPosition({ x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: ReactPointerEvent<HTMLElement>) {
    if (!dragItemRef.current) return;
    if (Math.hypot(event.clientX - dragStartRef.current.x, event.clientY - dragStartRef.current.y) > 7) {
      dragMovedRef.current = true;
    }
    setDragPosition({ x: event.clientX, y: event.clientY });
  }

  function endDrag(event: ReactPointerEvent<HTMLElement>) {
    const item = dragItemRef.current;
    const moved = dragMovedRef.current;
    if (item && moved) {
      const dropTarget = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-drop-zone]");
      const zone = dropTarget?.dataset.dropZone;
      if (zone === "expression" && item.kind === "number") {
        const card = order.cards.find((candidate) => candidate.id === item.id);
        if (card) addNumber(card);
      } else if (zone === "expression" && item.kind === "operator") {
        addOperator(item.operator);
      } else if ((zone === "lab-left" || zone === "lab-right") && item.kind === "lab") {
        placeLabPiece(zone === "lab-left" ? "left" : "right", item.id);
      }
      suppressClickRef.current = true;
    }
    dragItemRef.current = null;
    dragMovedRef.current = false;
    setDragItem(null);
  }

  function cancelDrag() {
    dragItemRef.current = null;
    dragMovedRef.current = false;
    setDragItem(null);
  }

  function ignoreDragClick() {
    if (!suppressClickRef.current) return false;
    suppressClickRef.current = false;
    return true;
  }

  function dragProps(item: DragItem) {
    return {
      onPointerDown: (event: ReactPointerEvent<HTMLElement>) => beginDrag(event, item),
      onPointerMove: moveDrag,
      onPointerUp: endDrag,
      onPointerCancel: cancelDrag,
    };
  }

  function startGame(forcedStoryLevel?: number) {
    ensureAudio();
    if (soundOn) {
      if (!musicRef.current) {
        const music = new Audio("/audio/first-light-particles.ogg");
        music.loop = true;
        music.volume = musicVolumes[volumeLevel];
        musicRef.current = music;
      }
      musicRef.current.volume = musicVolumes[volumeLevel];
      void musicRef.current.play().catch(() => undefined);
    }
    const selectedStoryLevel = forcedStoryLevel ?? (journeyProgress < journeyNodes.length ? journeyProgress + 1 : 1);
    setRound(1);
    setScore(0);
    setCombo(0);
    setBestCombo(0);
    setOrdersServed(0);
    setFastestOrder(null);
    setStrategyCounts({});
    setCompletedDishes([]);
    setBakedRecipes([]);
    setAnswerFeedback("idle");
    setCelebrating(false);
    const needsTutorial = mode === "adventure"
      && journeyProgress === 0
      && selectedStoryLevel === 1
      && window.localStorage.getItem("magic-math-tutorial") !== "done";
    setTutorialStep(needsTutorial ? 0 : null);
    if (mode === "adventure") {
      const deck = createStoryDeck(selectedStoryLevel);
      if (needsTutorial) deck[0] = createTutorialOrder();
      setStoryLevel(selectedStoryLevel);
      setStoryDeck(deck);
      resetOrder(deck[0]);
    } else if (mode === "lab") {
      seenLabPuzzlesRef.current.clear();
      labSessionSeedRef.current = randomInt(1, 1_000_000);
      resetLab(1);
    }
    else {
      const available = unlockedPracticeOperators(journeyProgress);
      const selected = practiceOperators.filter((operator) => available.includes(operator));
      const safeOperators = selected.length ? selected : ["+"];
      const deckSize = sessionLevels[sessionLevel].orders ?? 12;
      const deck = createPracticeDeck(deckSize, safeOperators, journeyProgress);
      setPracticeOperators(safeOperators);
      setStoryDeck(deck);
      resetOrder(deck[0]);
    }
    setPhase("playing");
  }

  function togglePracticeOperator(operator: Operator) {
    if (!availablePracticeOperators.includes(operator)) return;
    setPracticeOperators((current) => {
      if (current.includes(operator)) return current.length === 1 ? current : current.filter((item) => item !== operator);
      return allOperators.filter((item) => [...current, operator].includes(item));
    });
  }

  function addNumber(card: NumberCard) {
    if (recipeSolved) return;
    if (tutorialStep === 0 && card.value !== 2) {
      setMessage("Find the glowing card with number 2.");
      return;
    }
    if (tutorialStep === 2 && card.value !== 3) {
      setMessage("Great start! Now drag the glowing number 3.");
      return;
    }
    const isLastSelected = tokens[tokens.length - 1]?.kind === "number" && tokens[tokens.length - 1].id === card.id;
    if (isLastSelected) {
      undoToken();
      return;
    }
    if (!numberInputActive || usedCardIds.includes(card.id)) return;
    const nextTokens: Token[] = autoOperator && tokens.length
      ? [...tokens, { kind: "operator", value: autoOperator }, { kind: "number", id: card.id, value: card.value }]
      : [...tokens, { kind: "number", id: card.id, value: card.value }];
    setTokens(nextTokens);
    setAnswerFeedback("idle");
    setMessage(autoOperator
      ? `${autoOperator} was added automatically. Choose another number or check your recipe.`
      : "Good choice. The operation signs are glowing — choose one next.");
    setMessageTone("neutral");
    if (tutorialStep === 0) setTutorialStep(autoOperator ? 2 : 1);
    else if (tutorialStep === 2) setTutorialStep(3);
    playTone([520], 0.08, 0.035);
  }

  function addOperator(operator: Operator) {
    if (nextNeedsNumber || recipeSolved) return;
    if (tutorialStep === 1 && operator !== "+") return;
    setTokens((current) => [...current, { kind: "operator", value: operator }]);
    setAnswerFeedback("idle");
    setMessage("Now choose another number card.");
    setMessageTone("neutral");
    if (tutorialStep === 1) setTutorialStep(2);
    playTone([620], 0.08, 0.03);
  }

  function undoToken() {
    if (recipeSolved) return;
    setTokens((current) => autoOperator && current.length > 1 ? current.slice(0, -2) : current.slice(0, -1));
    setAnswerFeedback("idle");
    setTutorialStep((current) => current === null ? null : current === 3 ? 2 : 0);
    setMessage("Last choice removed. Pick again when you are ready.");
    setMessageTone("neutral");
    playTone([420], 0.07, 0.025);
  }

  function clearExpression() {
    setTokens([]);
    setAnswerFeedback("idle");
    setRecipeSolved(false);
    setTutorialStep((current) => current === null ? null : 0);
    setMessage("Recipe cleared. Try a fresh idea!");
    setMessageTone("neutral");
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (phase !== "playing" || mode === "lab" || recipeSolved) return;
      if (event.key === "Backspace") {
        event.preventDefault();
        undoToken();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        clearExpression();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function chooseLabPiece(pieceId: string) {
    if (recipeSolved) return;
    if (labPlacements[pieceId]) {
      setLabHistory((current) => [...current, labPlacements]);
      setLabPlacements((current) => {
        const next = { ...current };
        delete next[pieceId];
        return next;
      });
      setLabMoves((value) => value + 1);
      setSelectedLabPiece(pieceId);
      setMessage("Ingredient returned to the counter. Choose a pan for it.");
      return;
    }
    setSelectedLabPiece(pieceId);
    setMessage("Now choose the left or right oven pan.");
  }

  function placeLabPiece(side: "left" | "right", draggedPieceId?: string) {
    const pieceId = draggedPieceId ?? selectedLabPiece;
    if (!pieceId || recipeSolved || labPlacements[pieceId] === side) return;
    const nextPlacements = { ...labPlacements, [pieceId]: side };
    const nextMoves = labMoves + 1;
    const nextLeft = labPuzzle.leftBase + labPuzzle.pieces
      .filter((piece) => nextPlacements[piece.id] === "left")
      .reduce((sum, piece) => sum + piece.weight, 0);
    const nextRight = labPuzzle.rightBase + labPuzzle.pieces
      .filter((piece) => nextPlacements[piece.id] === "right")
      .reduce((sum, piece) => sum + piece.weight, 0);
    const allPlaced = labPuzzle.pieces.every((piece) => nextPlacements[piece.id]);
    setLabHistory((current) => [...current, labPlacements]);
    setLabPlacements(nextPlacements);
    setLabMoves(nextMoves);
    setSelectedLabPiece(null);
    setLabMotion((value) => value + 1);
    playTone([440, 554], 0.12, 0.03);
    if (allPlaced && nextLeft === nextRight) {
      const points = Math.max(50, 180 - Math.max(0, nextMoves - labPuzzle.moves) * 15);
      setRecipeSolved(true);
      setDishStage("ready");
      setScore((value) => value + points);
      setStrategyCounts((current) => ({ ...current, "Balance thinking": (current["Balance thinking"] ?? 0) + 1 }));
      setMessage(`Perfect balance! +${points} coins. Continue when you are ready for the next puzzle.`);
      setMessageTone("good");
      playTone([392, 523, 659], 0.25, 0.05);
      return;
    }
    setMessage("Watch the oven tilt. Place every ingredient and make both pans level.");
  }

  function undoLabMove() {
    if (!labHistory.length || recipeSolved) return;
    const previous = labHistory[labHistory.length - 1];
    setLabPlacements(previous);
    setLabHistory((current) => current.slice(0, -1));
    setSelectedLabPiece(null);
    setLabMoves((value) => Math.max(0, value - 1));
    setMessage("Last move undone. Choose an ingredient and try again.");
    setMessageTone("neutral");
    playTone([420], 0.08, 0.025);
  }

  function clearLab() {
    if (!Object.keys(labPlacements).length || recipeSolved) return;
    setLabPlacements({});
    setLabHistory([]);
    setSelectedLabPiece(null);
    setLabMoves(0);
    setMessage("All loose ingredients are back on the counter. Start with either side.");
    setMessageTone("neutral");
  }

  function advanceLabPuzzle() {
    if (!recipeSolved || mode !== "lab" || celebrating) return;
    const nextCombo = combo + 1;
    setCombo(nextCombo);
    setBestCombo((value) => Math.max(value, nextCombo));
    setOrdersServed((value) => value + 1);
    setCelebrating(true);
    playTone([523, 659, 784], 0.25, 0.055);
    celebrationTimerRef.current = window.setTimeout(() => {
      celebrationTimerRef.current = null;
      if (totalOrders !== null && round >= totalOrders) {
        setPhase("finished");
        setCelebrating(false);
        return;
      }
      const nextRound = round + 1;
      setRound(nextRound);
      resetLab(nextRound);
      setCelebrating(false);
    }, 650);
  }

  function checkRecipe(recipeTokens = tokens) {
    const value = evaluateExpression(recipeTokens);
    if (value === null) {
      setMessage("Finish the expression with a number before checking it.");
      setMessageTone("try");
      playTone([220], 0.2, 0.04);
      return;
    }
    if (Math.abs(value - order.target) > 0.0001) {
      const nextMistakes = mistakes + 1;
      setMistakes(nextMistakes);
      setCombo(0);
      setMessage(value < order.target
        ? `Your recipe makes ${value}. You still need ${Number((order.target - value).toFixed(2))}.`
        : `Your recipe makes ${value}. That is ${Number((value - order.target).toFixed(2))} too much.`);
      setMessageTone("try");
      setAnswerFeedback("wrong");
      playTone([260, 210], 0.16, 0.04);
      return;
    }

    if (tutorialStep !== null) {
      window.localStorage.setItem("magic-math-tutorial", "done");
      setTutorialStep(null);
    }

    const signature = recipeSignature(recipeTokens);
    if (foundRecipes.some((recipe) => recipe.signature === signature)) {
      setMessage("That recipe is already in your book. Change the structure, not just the order.");
      setMessageTone("try");
      setAnswerFeedback("wrong");
      playTone([330, 300], 0.13, 0.035);
      return;
    }

    const category = classifyRecipe(recipeTokens);
    const isFirst = foundRecipes.length === 0;
    const categoryIsNew = !foundRecipes.some((recipe) => recipe.category === category);
    const base = mode === "adventure" ? 100 : orderTimeLeft >= 0 ? 100 : orderTimeLeft >= -10 ? 60 : 30;
    const timeBonus = mode === "practice" && isFirst ? Math.min(60, Math.max(0, orderTimeLeft) * 3) : 0;
    const discoveryBonus = isFirst ? 0 : foundRecipes.length === 1 ? 50 : 75;
    const newStrategyBonus = !isFirst && categoryIsNew ? 30 : 0;
    const points = Math.max(20, (isFirst ? base + timeBonus : discoveryBonus + newStrategyBonus) - mistakes * 10);
    const dish = dishes[(round - 1) % dishes.length];
    const recipe: Recipe = { expression: expressionText(recipeTokens), signature, category, points };
    setFoundRecipes((current) => [...current, recipe]);
    setScore((valueScore) => valueScore + points);
    setStrategyCounts((current) => ({ ...current, [category]: (current[category] ?? 0) + 1 }));
    setBakedRecipes((current) => [...current, dish]);
    if (isFirst) {
      setCompletedDishes((current) => [...current, dish]);
      setOrdersServed((current) => current + 1);
    }
    setRecipeSolved(true);
    setDishStage("ready");
    setAnswerFeedback("correct");
    setMessage(isFirst
      ? `Perfect! +${points} coins. ${dish} is in your Recipe Book. Try another way or continue.`
      : `Another clever recipe! +${points} coins. ${dish} now shows ×${foundRecipes.length + 1}.`);
    setMessageTone("good");
    if (isFirst) {
      const elapsed = Math.max(1, order.timeLimit - orderTimeLeft);
      setFastestOrder((current) => current === null ? elapsed : Math.min(current, elapsed));
      playTone([392, 523, 659], 0.22, 0.055);
    } else {
      playTone([523, 659, 784, 1047], 0.25, 0.05);
    }
  }

  function findAnotherWay() {
    setTokens([]);
    setRecipeSolved(false);
    setDishStage("building");
    setAnswerFeedback("idle");
    setMessage("Same target, fresh structure. Which strategy has not been used yet?");
    setMessageTone("neutral");
    playTone([659, 784], 0.14, 0.04);
  }

  function exitToMenu() {
    if (celebrationTimerRef.current !== null) window.clearTimeout(celebrationTimerRef.current);
    if (storyCardTimerRef.current !== null) window.clearTimeout(storyCardTimerRef.current);
    celebrationTimerRef.current = null;
    storyCardTimerRef.current = null;
    setCelebrating(false);
    setTokens([]);
    stopMusic();
    setPhase("modes");
  }

  function advanceStoryOrder() {
    if (mode === "lab" || !foundRecipes.length || (totalOrders !== null && round >= totalOrders)) return;
    const nextRound = round + 1;
    if (mode === "practice" && !storyDeck[nextRound - 1]) {
      const nextOrder = createPracticeOrder(nextRound, practiceOperators, journeyProgress);
      setStoryDeck((current) => [...current, nextOrder]);
      setRound(nextRound);
      resetOrder(nextOrder);
      playTone([659, 784], 0.14, 0.04);
      return;
    }
    setRound(nextRound);
    resetOrder(storyDeck[nextRound - 1]);
    playTone([659, 784], 0.14, 0.04);
  }

  function goToNextStoryOrder() {
    if (mode === "lab" || !foundRecipes.length || storyCardDeparting) return;
    if (totalOrders === null || round < totalOrders) {
      setStoryCardDeparting(true);
      storyCardTimerRef.current = window.setTimeout(() => {
        storyCardTimerRef.current = null;
        advanceStoryOrder();
      }, 520);
      return;
    }
    setTokens([]);
    setRecipeSolved(true);
    setAnswerFeedback("correct");
    setMessage("All orders are complete. Use the orange Submit button to finish the level.");
    setMessageTone("good");
  }

  function submitStoryLevel() {
    if (mode === "lab" || totalOrders === null || completedDishes.length !== totalOrders) return;
    if (mode === "adventure") {
      const nextProgress = Math.max(journeyProgress, storyLevel);
      setJourneyProgress(nextProgress);
      window.localStorage.setItem("magic-math-journey", String(nextProgress));
    }
    setBestCombo((value) => Math.max(value, completedDishes.length));
    setPhase("finished");
    playTone([523, 659, 784, 1047], 0.32, 0.055);
  }

  function finishOrExit() {
    if (sessionLevel === "endless" && ordersServed > 0) {
      if (celebrationTimerRef.current !== null) window.clearTimeout(celebrationTimerRef.current);
      celebrationTimerRef.current = null;
      setCelebrating(false);
      stopMusic();
      setPhase("finished");
      return;
    }
    exitToMenu();
  }

  const progress = totalOrders === null
    ? ((round - 1) % 5 + 1) * 20
    : mode !== "lab"
      ? (completedDishes.length / totalOrders) * 100
      : (round / totalOrders) * 100;
  const bakedRecipeCounts = useMemo(() => bakedRecipes.reduce<Record<string, number>>((counts, dish) => {
    counts[dish] = (counts[dish] ?? 0) + 1;
    return counts;
  }, {}), [bakedRecipes]);
  const topStrategies = useMemo(
    () => Object.entries(strategyCounts).sort((a, b) => b[1] - a[1]),
    [strategyCounts],
  );
  const titleForMode = mode === "adventure"
    ? `Story · ${journeyNodes[storyLevel - 1].title}`
    : mode === "practice"
      ? `${practiceOperators.join(" ")} Practice`
      : "Oven Balance Lab";

  return (
    <main className="game-shell">
      <div className="cloud cloud-one" />
      <div className="cloud cloud-two" />
      {dragItem && <div className={`drag-ghost drag-${dragItem.kind}`} style={{ left: dragPosition.x, top: dragPosition.y }} aria-hidden="true">{dragItem.label}</div>}

      {phase === "splash" && <section className="splash-screen" aria-labelledby="splash-title">
        <div className="splash-card">
          <div className="splash-sun" aria-hidden="true">☀</div>
          <div className="splash-cloud splash-cloud-one" aria-hidden="true">☁</div>
          <div className="splash-cloud splash-cloud-two" aria-hidden="true">☁</div>
          <div className="garden-hill hill-back" aria-hidden="true" />
          <div className="garden-hill hill-front" aria-hidden="true" />
          <div className="garden-sprinkles sprinkles-one" aria-hidden="true">✿ ✦ ✿</div>
          <div className="garden-sprinkles sprinkles-two" aria-hidden="true">✦ ✿ ✦ ✿</div>
          <div className="garden-bakery" aria-hidden="true"><span>🍰</span><strong>1 + 2 = 3</strong></div>
          <div className="garden-friends" aria-hidden="true"><span>🐰</span><span>👩🏽‍🍳</span><span>🐿️</span></div>
          <div className="splash-copy"><small>BAKE · THINK · PLAY</small><h1 id="splash-title">Magic Math<br />Bakery</h1><p>Turn number ideas into delicious discoveries.</p></div>
          <button className="splash-start" onClick={() => setPhase("modes")} aria-label="Start Magic Math Bakery"><span aria-hidden="true">▶</span></button>
          <small className="tap-to-start">TAP TO START</small>
        </div>
      </section>}

      {phase !== "splash" && <header className="brand-bar">
        <button className="brand-button" onClick={() => phase === "playing" ? exitToMenu() : setPhase("modes")} aria-label="Magic Math Bakery mode selection">
          <span className="brand-mark" aria-hidden="true">✦</span>
          <span><small>NUMBER ADVENTURES</small><strong>Magic Math Bakery</strong></span>
        </button>
        <button className="settings-pill" onClick={() => { setSettingsOpen(true); setResetConfirm(false); }} aria-haspopup="dialog"><span>⚙</span> Settings</button>
      </header>}

      {settingsOpen && <div className="settings-backdrop">
        <section className="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
          <button className="settings-close" onClick={() => setSettingsOpen(false)} aria-label="Close settings">×</button>
          <p className="section-kicker">YOUR BAKERY</p><h2 id="settings-title">Settings</h2>
          <div className="volume-setting"><div><strong>Music volume</strong><small>{volumeLevel === 0 ? "Muted" : `Level ${volumeLevel} of 4`}</small></div><div className="volume-steps" aria-label="Choose one of five music volume levels">{musicVolumes.map((_, level) => <button key={level} className={volumeLevel === level ? "selected" : ""} onClick={() => changeVolume(level)} aria-label={level === 0 ? "Mute music" : `Music volume level ${level}`} aria-pressed={volumeLevel === level}><span>{level === 0 ? "×" : "▮".repeat(level)}</span></button>)}</div></div>
          <div className="reset-setting"><div><strong>Story progress</strong><small>Start the ten-level Story again from the beginning.</small></div><button className={resetConfirm ? "confirming" : ""} onClick={resetStoryProgress}>{resetConfirm ? "Tap again to reset" : "Reset progress"}</button></div>
        </section>
      </div>}

      {phase === "modes" && <section className="mode-select-home" aria-labelledby="mode-title">
        <div className="mode-select-intro"><p className="section-kicker">CHOOSE HOW TO PLAY</p><h1 id="mode-title">Where shall we grow today?</h1><p>Pick one big activity. You can always return here and choose another.</p></div>
        <div className="big-mode-grid">
          <button className="big-mode-card journey-choice" onClick={() => { setMode("adventure"); setPhase("journey"); }}><span>📖</span><div><small>FOLLOW THE PATH</small><strong>Story</strong><p>Grow from tiny sums to place-value challenges.</p></div><i>Go!</i></button>
          <button className={`big-mode-card practice-choice ${mode === "practice" ? "selected" : ""}`} onClick={() => setMode("practice")}><span>🧠</span><div><small>TRAIN YOUR BRAIN</small><strong>Practice</strong><p>Pick one or more signs and build number recipes.</p></div><i>Go!</i></button>
          <button className={`big-mode-card balance-choice ${mode === "lab" ? "selected" : ""}`} onClick={() => setMode("lab")}><span>⚖️</span><div><small>PUZZLE PLAY</small><strong>Balance</strong><p>Move small food groups until both oven pans match.</p></div><i>Go!</i></button>
        </div>
        {(mode === "practice" || mode === "lab") && <div className={`mode-setup-panel ${mode === "practice" ? "practice-setup" : ""}`}>
          <div className="chef-welcome"><span aria-hidden="true">👩🏽‍🍳</span><div><small>CHEF MIRA SAYS</small><strong>{mode === "practice" ? "Choose the signs you already know." : "We will begin with tiny weights and only a few foods."}</strong></div></div>
          {mode === "practice" && <div className="operation-picker compact symbol-picker"><span>CHOOSE SIGNS</span><div>{allOperators.map((operator) => { const unlocked = availablePracticeOperators.includes(operator); return <button key={operator} className={practiceOperators.includes(operator) ? "selected" : ""} onClick={() => togglePracticeOperator(operator)} aria-label={`${operatorInfo[operator].title}${unlocked ? "" : ", locked until its Story level is open"}`} aria-pressed={practiceOperators.includes(operator)} disabled={!unlocked}><strong>{operator}</strong></button>; })}</div><p>{practiceOperators.length === 1 ? `${practiceOperators[0]} is placed automatically.` : "Choose the sign you need while playing."}</p></div>}
          <div className="session-picker compact quiz-picker"><span>{mode === "practice" ? "HOW MANY QUIZ?" : "HOW MANY PUZZLES?"}</span><div>{(Object.keys(sessionLevels) as SessionLevel[]).map((level) => <button key={level} className={sessionLevel === level ? "selected" : ""} onClick={() => setSessionLevel(level)} aria-label={`${sessionLevels[level].title}, ${sessionLevels[level].orders ?? "endless"}`} aria-pressed={sessionLevel === level}><strong>{sessionLevels[level].orders === null ? "∞" : sessionLevels[level].orders}</strong></button>)}</div></div>
          <button className="primary-button mission-start" onClick={() => startGame()}><span>{mode === "lab" ? "⚖️" : "🧠"}</span><strong>Go!</strong></button>
        </div>}
      </section>}

      {phase === "journey" && <section className="journey-home" aria-labelledby="menu-title">
        <button className="journey-back" onClick={() => setPhase("modes")}>← Choose another mode</button>
        <div className="journey-intro starter-intro"><div><p className="section-kicker">MAGIC MATH STORY</p><h1 id="menu-title">Bake your way<br />through number land.</h1><p>Tap the glowing stop to begin. Each completed bakery chapter opens the next part of the path.</p></div><span className="story-hero" aria-hidden="true">🗺️</span></div>
        <div className="journey-layout">
          <div className="journey-map">
            <div className="map-heading"><div><span>THE BAKERY STORY</span><h2>Ten stops, one growing mind</h2></div><strong>{journeyProgress} / {journeyNodes.length} ★</strong></div>
            <div className="map-path" aria-label="Magic Math Story level path">{journeyNodes.map((node, index) => { const completed = index < journeyProgress; const current = index === journeyProgress || (journeyProgress === journeyNodes.length && index === journeyNodes.length - 1); return <button key={node.title} className={`path-stop ${node.color} ${completed ? "completed" : ""} ${current ? "current" : ""}`} onClick={() => startGame(index + 1)} disabled={!completed && !current} aria-label={`${node.title}, ${node.skill}, ${completed ? "completed, replay level" : current ? "current level, play now" : "locked"}`}><span>{completed ? "✓" : node.icon}</span><div><small>LEVEL {index + 1} · {node.orders} ORDERS</small><strong>{node.title}</strong><small>{node.skill}</small></div>{(completed || current) && <i>{completed ? "↻" : "▶"}</i>}{!completed && !current && <i>🔒</i>}</button>; })}</div>
          </div>
          <aside className="mission-dock journey-guide"><div className="chef-welcome"><span aria-hidden="true">👩🏽‍🍳</span><div><small>YOUR NEXT STOP</small><strong>{journeyProgress === journeyNodes.length ? "Every stop is open — choose any!" : journeyNodes[journeyProgress].title}</strong></div></div><div className="next-stop-preview"><span>{journeyProgress === journeyNodes.length ? "🏆" : journeyNodes[journeyProgress].icon}</span><small>{journeyProgress === journeyNodes.length ? "Story complete" : journeyNodes[journeyProgress].skill}</small></div><div className="mini-legend"><span><i className="done" />Complete</span><span><i className="now" />Current</span><span><i className="later" />Locked</span></div></aside>
        </div>
      </section>}

      {phase === "playing" && (
        <section className={`play-area ${celebrating ? "is-celebrating" : ""}`} aria-live="polite">
          <div className={`hud ${mode === "lab" ? "hud-lab" : ""}`}>
            <button className="exit-button" onClick={finishOrExit} aria-label={sessionLevel === "endless" && ordersServed > 0 ? "Finish the endless shift and view results" : "Exit the current game and return to the main menu"}>{sessionLevel === "endless" && ordersServed > 0 ? "✓ Finish shift" : "← Exit to menu"}</button>
            <div className="hud-stat"><span>COINS</span><strong>★ {score}</strong></div>
            <div className="progress-wrap">
              <div className="progress-label"><span>{titleForMode.toUpperCase()} · ORDER {round}{totalOrders === null ? " · ENDLESS" : ` OF ${totalOrders}`}</span><span>{totalOrders === null ? "∞" : `${Math.round(progress)}%`}</span></div>
              <div className="progress-track"><div style={{ width: `${progress}%` }} /></div>
            </div>
            {mode === "lab" && <div className="hud-stat timer"><span>OVEN MOVES</span><strong>⚖ {labMoves} / {labPuzzle.moves}</strong></div>}
          </div>

          <div className={`order-stage dish-${dishStage}`}>
            <div className="customer-card"><div className="customer-face" aria-hidden="true">{["🧒🏽", "👧🏻", "👦🏾", "👧🏼", "🧒🏻"][(round - 1) % 5]}</div><div><span>CUSTOMER</span><strong>{mode === "lab" ? customers[(round + 1) % customers.length] : order.customer}</strong></div></div>
            {mode === "lab" ? <div className="speech-bubble"><p>My magic oven is tilting!</p><div className="target-line">Make both baking pans level</div><small>No equation needed — read the movement and balance the ingredients.</small></div> : <div className="story-order-shelf"><div className="story-order-heading"><span>{mode === "adventure" ? "STORY ORDERS" : "PRACTICE QUIZ"} · {completedDishes.length} COMPLETE</span><small>Next target always starts here ↓</small></div><div className={`story-order-track ${storyCardDeparting ? "advancing" : ""}`}>{storyDeck.slice(round - 1).map((mission, offset) => { const index = round - 1 + offset; const active = offset === 0; const departing = active && storyCardDeparting; return <div key={`${mode}-${storyLevel}-${index}`} className={`story-target-card ${active ? "active" : ""} ${departing ? "departing" : ""} ${active && answerFeedback === "correct" && foundRecipes.length === 1 ? "just-completed" : ""}`} aria-label={`Order ${index + 1}, ${dishes[index % dishes.length]}, target ${mission.target}${active ? ", current" : ""}`}><span>{dishes[index % dishes.length]}</span><strong>{mission.target}</strong><small>{`ORDER ${index + 1}`}</small></div>; })}</div></div>}
            <div className={`combo-badge ${combo > 1 ? "active" : ""}`}><span>COMBO</span><strong>×{Math.max(combo, 1)}</strong></div>
          </div>

          <div className="workbench">
            {tutorialStep !== null && mode === "adventure" && <div className="tutorial-ribbon" role="status"><span className="tutorial-chef">👩🏽‍🍳</span><div><small>YOUR FIRST RECIPE · STEP {tutorialStep === 0 ? 1 : tutorialStep === 2 ? 2 : 3} OF 3</small><strong>{tutorialStep === 0 ? "Drag number 2 into the recipe bar" : tutorialStep === 2 ? "+ is automatic — now drag number 3" : "Great — now tap Check recipe!"}</strong><p>{tutorialStep < 3 ? "You can also tap the glowing tile." : "A correct recipe flies into your Recipe Book."}</p></div><div className="tutorial-dots">{[0, 2, 3].map((step) => <i key={step} className={step <= tutorialStep ? "active" : ""} />)}</div></div>}
            {mode === "lab" ? (
              <div className="lab-layout">
                <div className="balance-game">
                  <div className="lab-heading"><span>OVEN BALANCE LAB</span><h2>Use every loose ingredient and level the beam</h2><small>Suggested moves: {labPuzzle.moves} · Your moves: {labMoves}</small></div>
                  <div className="lab-howto" aria-label="How to play Oven Balance Lab">
                    <div><strong>1</strong><span><b>Read the weight</b><small>Every ● dot and every food icon weighs 1.</small></span></div>
                    <div><strong>2</strong><span><b>Drag every ingredient</b><small>Move each food group directly onto either pan.</small></span></div>
                    <div><strong>3</strong><span><b>Make both sides equal</b><small>The beam must be level after all food is placed.</small></span></div>
                  </div>
                  <div className={`balance-scale ${labLeftWeight > labRightWeight ? "tilt-left" : labRightWeight > labLeftWeight ? "tilt-right" : "level"} ${labMotion ? `settling-${labMotion % 2}` : ""}`}>
                    <div className={`scale-pan left-pan ${dragItem?.kind === "lab" ? "drop-ready" : ""}`} data-drop-zone="lab-left" onClick={() => placeLabPiece("left")} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") placeLabPiece("left"); }} role="button" tabIndex={selectedLabPiece && !recipeSolved ? 0 : -1} aria-disabled={!selectedLabPiece || recipeSolved} aria-label="Drop an ingredient on the left pan">
                      <small>FIXED DOTS · {labPuzzle.leftBase}</small>
                      <span className="base-stack" aria-label="Fixed ingredients">{"●".repeat(labPuzzle.leftBase)}</span>
                      <span className="placed-stack">{labPuzzle.pieces.filter((piece) => labPlacements[piece.id] === "left").map((piece) => <button key={piece.id} className="placed-piece draggable" {...dragProps({ kind: "lab", id: piece.id, label: piece.emoji.repeat(piece.weight) })} onClick={(event) => { event.stopPropagation(); if (!ignoreDragClick()) chooseLabPiece(piece.id); }} aria-label={`Move ${piece.name} group`}>{piece.emoji.repeat(piece.weight)}</button>)}</span>
                      <strong>LEFT PAN</strong>
                    </div>
                    <div className="scale-post"><i /><strong>{labLeftWeight === labRightWeight ? Object.keys(labPlacements).length === labPuzzle.pieces.length ? "LEVEL" : "LEVEL FOR NOW" : "TILTING"}</strong></div>
                    <div className={`scale-pan right-pan ${dragItem?.kind === "lab" ? "drop-ready" : ""}`} data-drop-zone="lab-right" onClick={() => placeLabPiece("right")} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") placeLabPiece("right"); }} role="button" tabIndex={selectedLabPiece && !recipeSolved ? 0 : -1} aria-disabled={!selectedLabPiece || recipeSolved} aria-label="Drop an ingredient on the right pan">
                      <small>FIXED DOTS · {labPuzzle.rightBase}</small>
                      <span className="base-stack" aria-label="Fixed ingredients">{"●".repeat(labPuzzle.rightBase)}</span>
                      <span className="placed-stack">{labPuzzle.pieces.filter((piece) => labPlacements[piece.id] === "right").map((piece) => <button key={piece.id} className="placed-piece draggable" {...dragProps({ kind: "lab", id: piece.id, label: piece.emoji.repeat(piece.weight) })} onClick={(event) => { event.stopPropagation(); if (!ignoreDragClick()) chooseLabPiece(piece.id); }} aria-label={`Move ${piece.name} group`}>{piece.emoji.repeat(piece.weight)}</button>)}</span>
                      <strong>RIGHT PAN</strong>
                    </div>
                  </div>
                  <div className="lab-actions"><button onClick={undoLabMove} disabled={!labHistory.length || recipeSolved}><span>↶</span> Undo last move</button><button onClick={clearLab} disabled={!Object.keys(labPlacements).length || recipeSolved}><span>✕</span> Clear all</button></div>
                  <div className="loose-ingredients"><span>DRAG EACH INGREDIENT ONCE</span><div>{labPuzzle.pieces.map((piece) => {
                    const isPlaced = Boolean(labPlacements[piece.id]);
                    return <button key={piece.id} className={`draggable ${selectedLabPiece === piece.id ? "selected" : ""} ${isPlaced ? "placed" : ""}`} {...(!isPlaced ? dragProps({ kind: "lab", id: piece.id, label: piece.emoji.repeat(piece.weight) }) : {})} onClick={() => { if (!isPlaced && !ignoreDragClick()) chooseLabPiece(piece.id); }} disabled={isPlaced || recipeSolved} aria-pressed={selectedLabPiece === piece.id}><span>{piece.emoji.repeat(piece.weight)}</span><small>{isPlaced ? `USED · on ${labPlacements[piece.id]} pan` : "Drag to a pan · or tap"}</small></button>;
                  })}</div></div>
                  {recipeSolved && <div className="lab-success"><span>✓</span><div><strong>Perfect balance!</strong><small>Every ingredient is used and both pans have equal weight.</small></div><button className="serve-button" onClick={advanceLabPuzzle}>{totalOrders !== null && round >= totalOrders ? "View results →" : "Next puzzle →"}</button></div>}
                </div>
                <aside className="lab-rules"><span>GOAL OF THE PUZZLE</span><h3>Place all food. Level the oven.</h3><p>The dots are fixed weights and cannot move. The food groups are movable weights. You may add food to either side—not only the lighter side.</p><div><i>●</i><strong>One symbol = one weight</strong><small>A group of three berries weighs the same as three dots.</small></div><div><i>↔️</i><strong>Either pan is allowed</strong><small>Sometimes both sides need extra food to use every group.</small></div><div><i>✨</i><strong>Finish condition</strong><small>All loose food is placed and the beam is level.</small></div></aside>
              </div>
            ) : (
            <div className="builder-layout">
              <div className="builder-main">
                <div className={`expression-board story-expression feedback-${answerFeedback} ${dragItem && dragItem.kind !== "lab" ? "drop-ready" : ""}`} data-drop-zone="expression">
                  <div><span>YOUR RECIPE · DROP HERE</span><div className="expression-slots">{tokens.length ? tokens.map((token, index) => <b key={token.kind === "number" ? token.id : `${token.value}-${index}`} className={token.kind}>{token.value}</b>) : <em>Drag a number here to begin</em>}</div></div>
                  <><button className={`value-orb check-orb ${storyCanCheck ? "ready" : ""} ${answerFeedback !== "idle" ? `is-${answerFeedback}` : ""} ${tutorialStep === 3 ? "tutorial-target" : ""}`} onClick={() => checkRecipe()} disabled={!storyCanCheck} aria-label={storyCanCheck ? "Check this recipe" : recipeSolved ? "Recipe checked" : "Finish a valid expression to check it"}><span>{answerFeedback === "wrong" ? "TRY AGAIN" : recipeSolved ? "CHECKED" : storyCanCheck ? "CHECK" : "ADD MORE"}</span><strong>{answerFeedback === "wrong" ? "↻" : recipeSolved || storyCanCheck ? "✓" : "?"}</strong></button><div className="story-expression-actions"><button className="find-way-inline" onClick={findAnotherWay} disabled={!recipeSolved || !foundRecipes.length}>Find another way</button>{foundRecipes.length > 0 && (totalOrders === null || round < totalOrders) && <button className="go-next-inline" onClick={goToNextStoryOrder}>Go to next →</button>}</div></>
                </div>
                <div className="builder-actions"><button onClick={undoToken} disabled={!tokens.length || recipeSolved}><span>↶</span> Undo last</button><button onClick={clearExpression} disabled={!tokens.length || recipeSolved}><span>✕</span> Clear all</button><small>Tap the last selected card to undo it</small></div>

                <div className={`number-zone ${numberInputActive && !recipeSolved ? "input-focus" : ""}`}>
                <div className="shelf-heading"><div><span>1 · NUMBER CARDS</span><h2>{numberInputActive ? "Choose a number" : "Choose an operation first"}</h2></div><small>{numberInputActive ? "Your turn: pick a card" : "Waiting for a sign"}</small></div>
                <div className="number-grid">
                  {order.cards.map((card) => {
                    const used = usedCardIds.includes(card.id);
                    const isLast = tokens[tokens.length - 1]?.kind === "number" && tokens[tokens.length - 1].id === card.id;
                    const tutorialTarget = (tutorialStep === 0 && card.value === 2) || (tutorialStep === 2 && card.value === 3);
                    return <button key={card.id} className={`number-card draggable ${used ? "used" : ""} ${isLast ? "last-selected" : ""} ${tutorialTarget ? "tutorial-target" : ""}`} {...dragProps({ kind: "number", id: card.id, label: `${card.emoji} ${card.value}` })} onClick={() => { if (!ignoreDragClick()) addNumber(card); }} disabled={(used && !isLast) || (!numberInputActive && !isLast) || recipeSolved} aria-label={`${card.name}, value ${card.value}${isLast ? ", last selected, tap to undo" : used ? ", used" : ""}`}><span aria-hidden="true">{card.emoji}</span><strong>{card.value}</strong><small>{tutorialTarget ? "drag me" : isLast ? "tap to undo" : card.name}</small></button>;
                  })}
                </div>
                </div>

                <div className={`operator-row ${operatorInputActive && !recipeSolved ? "input-focus" : ""} ${autoOperator ? "auto-operator" : ""}`}><div><span>2 · OPERATION SIGNS</span><h2>{autoOperator ? `${autoOperator} is added automatically` : operatorInputActive ? "Drag a sign into your recipe" : "Choose a number first"}</h2></div><div>{operators.map((operator) => <button key={operator} className={`draggable ${tutorialStep === 1 && operator === "+" ? "tutorial-target" : ""}`} {...dragProps({ kind: "operator", operator, label: operator })} onClick={() => { if (!ignoreDragClick()) addOperator(operator); }} disabled={!operatorInputActive || recipeSolved} aria-label={`Add ${operator} to expression`}>{operator}</button>)}</div></div>
              </div>

              <aside className="recipe-book" aria-label="Discovered recipes">
                <div className="book-title"><span>RECIPE BOOK</span><strong>{`${completedDishes.length} orders · ${bakedRecipes.length} recipes`}</strong></div>
                <div className="recipe-list">
                  <>{bakedRecipes.length === 0 && <div className="empty-recipe"><span>☆</span><p>Your first correct recipe will land here.</p></div>}<div className="dish-summary">{Object.entries(bakedRecipeCounts).map(([dish, count]) => <div key={dish}><span>{dish}</span><strong>×{count}</strong></div>)}</div></>
                </div>
              </aside>
            </div>
            )}

            <div className={`coach-bar ${messageTone}`}>
              <div className="coach-icon" aria-hidden="true">👩🏽‍🍳</div><div><span>CHEF MIRA SAYS</span><p>{message}</p></div>
              <div className="coach-buttons">
                {mode !== "lab" && recipeSolved && totalOrders !== null && completedDishes.length === totalOrders && <button className="serve-button submit-level" onClick={submitStoryLevel}>Submit ✓</button>}
              </div>
            </div>
          </div>
          {celebrating && <div className="sparkles" aria-hidden="true"><i>✦</i><i>★</i><i>✧</i><i>✦</i><i>★</i></div>}
        </section>
      )}

      {phase === "finished" && (
        <section className="result-card" aria-labelledby="result-title">
          <div className="result-stars" aria-hidden="true">✦ ★ ✦</div><p className="section-kicker">{mode === "adventure" ? "STORY LEVEL COMPLETE" : "SHIFT COMPLETE"}</p><h1 id="result-title">{mode === "adventure" ? `${journeyNodes[storyLevel - 1].title} is baked!` : "Your thinking made the bakery sparkle."}</h1>
          <div className="score-medal"><span>TOTAL COINS</span><strong>{score}</strong></div>
          <div className="result-stats"><div><span>Orders served</span><strong>{ordersServed}{totalOrders === null ? "" : ` / ${totalOrders}`}</strong></div><div><span>Best combo</span><strong>×{Math.max(bestCombo, 1)}</strong></div><div><span>Fastest recipe</span><strong>{fastestOrder ?? "—"}s</strong></div><div><span>Strategies found</span><strong>{Object.values(strategyCounts).reduce((sum, value) => sum + value, 0)}</strong></div></div>
          <div className="thinking-report"><span>YOUR THINKING REPORT</span>{topStrategies.length ? topStrategies.map(([strategy, count]) => <div key={strategy}><strong>{strategy}</strong><span>{count} recipe{count > 1 ? "s" : ""}</span></div>) : <p>Try another shift to fill your strategy report.</p>}</div>
          <div className="result-actions">{mode === "adventure" ? <><button className="secondary-button" onClick={() => setPhase("journey")}>Story Map</button><button className="secondary-button replay-level-button" onClick={() => startGame(storyLevel)}>Play Again</button>{storyLevel < journeyNodes.length && <button className="primary-button next-level-button" onClick={() => startGame(storyLevel + 1)}>Next Level</button>}</> : <><button className="secondary-button" onClick={() => setPhase("modes")}>Change mode</button><button className="primary-button" onClick={() => startGame()}>Play again <span>↻</span></button></>}</div>
        </section>
      )}

      {phase !== "splash" && <footer><span>Educational game prototype · P0.4</span><span>Music: First Light Particles by Yoiyami · CC0</span></footer>}
    </main>
  );
}
