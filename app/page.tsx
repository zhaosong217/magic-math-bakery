"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

type Mode = "adventure" | "practice" | "lab";
type Operation = "add" | "subtract" | "multiply" | "divide" | "mixed";
type Operator = "+" | "−" | "×" | "÷";
type Phase = "splash" | "modes" | "journey" | "playing" | "finished";
type SessionLevel = "apprentice" | "baker" | "master" | "endless";
type DishStage = "building" | "ready" | "plated" | "delivering";

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

const operationInfo: Record<Operation, { symbol: string; title: string; time: number }> = {
  add: { symbol: "+", title: "Addition", time: 20 },
  subtract: { symbol: "−", title: "Subtraction", time: 20 },
  multiply: { symbol: "×", title: "Multiplication", time: 25 },
  divide: { symbol: "÷", title: "Division", time: 25 },
  mixed: { symbol: "✦", title: "Mixed", time: 35 },
};

const operatorInfo: Record<Operator, { operation: Exclude<Operation, "mixed">; title: string }> = {
  "+": { operation: "add", title: "Add" },
  "−": { operation: "subtract", title: "Subtract" },
  "×": { operation: "multiply", title: "Multiply" },
  "÷": { operation: "divide", title: "Divide" },
};

const allOperators = Object.keys(operatorInfo) as Operator[];
const dishes = ["🧁", "🍰", "🥧", "🍮", "🍩", "🥐"];
const journeyNodes = [
  { icon: "🍓", title: "Make 5", skill: "Small number pairs", color: "coral" },
  { icon: "🧁", title: "Make 10", skill: "Friendly addition", color: "gold" },
  { icon: "🍪", title: "Number Pairs", skill: "Break apart numbers", color: "teal" },
  { icon: "🍒", title: "Add a Step", skill: "Addition within 20", color: "violet" },
  { icon: "🍰", title: "Take Away", skill: "Gentle subtraction", color: "blue" },
  { icon: "👑", title: "Plus & Minus Bake", skill: "Chapter challenge", color: "gold" },
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

function adventureOperation(round: number): Operation {
  return round <= 4 ? "add" : "subtract";
}

function createStandardOrder(round: number, operation: Operation, operators = allowedOperators(operation)): Order {
  let target = 10;
  let solution: number[] = [];
  let challenge = "Build one correct recipe.";

  if (operation === "add") {
    const maxAddend = round <= 1 ? 4 : round <= 3 ? 6 : 9;
    const a = randomInt(1, maxAddend);
    const b = randomInt(1, maxAddend);
    target = a + b;
    solution = [a, b];
    challenge = round > 1 ? "Try a three-card recipe after your first answer." : "Warm up with two number cards.";
  } else if (operation === "subtract") {
    target = randomInt(1, round <= 2 ? 6 : round <= 5 ? 10 : 14);
    const removed = randomInt(1, round <= 2 ? 4 : round <= 5 ? 6 : 9);
    solution = [target + removed, removed];
    challenge = "Start with the larger number, then take some away.";
  } else if (operation === "multiply") {
    const a = randomInt(2, Math.min(7, 3 + Math.floor(round / 2)));
    const b = randomInt(2, 9);
    target = a * b;
    solution = [a, b];
    challenge = "Think in equal groups instead of repeated addition.";
  } else if (operation === "divide") {
    target = randomInt(2, 9);
    const divisor = randomInt(2, 8);
    solution = [target * divisor, divisor];
    challenge = "Share the larger number into equal groups.";
  } else {
    const a = randomInt(2, 6);
    const b = randomInt(2, 6);
    const c = randomInt(2, 4);
    target = a + b * c;
    solution = [a, b, c];
    challenge = "Use two different operation signs.";
  }

  const values = [...solution];
  while (values.length < 5) values.push(randomInt(1, Math.max(6, Math.min(20, target + 3))));
  const timeLimit = operationInfo[operation].time;

  return {
    target,
    cards: makeCards(values, round),
    operation,
    operators,
    timeLimit,
    customer: customers[(round - 1) % customers.length],
    request: requests[(round - 1) % requests.length],
    challenge,
  };
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

function createOrder(round: number, mode: Exclude<Mode, "lab">, practiceOperators: Operator[]) {
  if (mode === "adventure") {
    const operation = adventureOperation(round);
    return createStandardOrder(round, operation);
  }
  const chosen = practiceOperators[(round - 1) % practiceOperators.length] ?? "+";
  return createStandardOrder(round, operatorInfo[chosen].operation, practiceOperators);
}

function allowedOperators(operation: Operation): Operator[] {
  if (operation === "add") return ["+"];
  if (operation === "subtract") return ["−"];
  if (operation === "multiply") return ["×"];
  if (operation === "divide") return ["÷"];
  return ["+", "−", "×", "÷"];
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
  const [round, setRound] = useState(1);
  const [order, setOrder] = useState<Order>(() => createOrder(1, "adventure", ["+"]));
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
  const [soundOn, setSoundOn] = useState(true);
  const [dishStage, setDishStage] = useState<DishStage>("building");
  const [journeyProgress, setJourneyProgress] = useState(0);
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);
  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [labMotion, setLabMotion] = useState(0);
  const audioRef = useRef<AudioContext | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const celebrationTimerRef = useRef<number | null>(null);
  const seenLabPuzzlesRef = useRef<Set<string>>(new Set());
  const labSessionSeedRef = useRef(0);
  const dragItemRef = useRef<DragItem | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragMovedRef = useRef(false);
  const suppressClickRef = useRef(false);

  const totalOrders = mode === "adventure" ? journeyNodes.length : sessionLevels[sessionLevel].orders;
  const currentValue = evaluateExpression(tokens);
  const usedCardIds = tokens
    .filter((token): token is Extract<Token, { kind: "number" }> => token.kind === "number")
    .map((token) => token.id);
  const nextNeedsNumber = !tokens.length || tokens[tokens.length - 1].kind === "operator";
  const operators = order.operators;
  const autoOperator = mode === "practice" && practiceOperators.length === 1 ? practiceOperators[0] : null;
  const numberInputActive = Boolean(autoOperator) || nextNeedsNumber;
  const operatorInputActive = !autoOperator && !nextNeedsNumber;
  const labLeftWeight = labPuzzle.leftBase + labPuzzle.pieces
    .filter((piece) => labPlacements[piece.id] === "left")
    .reduce((sum, piece) => sum + piece.weight, 0);
  const labRightWeight = labPuzzle.rightBase + labPuzzle.pieces
    .filter((piece) => labPlacements[piece.id] === "right")
    .reduce((sum, piece) => sum + piece.weight, 0);

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
      gain.gain.exponentialRampToValueAtTime(volume, context.currentTime + index * 0.07 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + index * 0.07 + duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(context.currentTime + index * 0.07);
      oscillator.stop(context.currentTime + index * 0.07 + duration + 0.02);
    });
  }, [ensureAudio, soundOn]);

  const stopMusic = useCallback(() => {
    musicRef.current?.pause();
  }, []);

  const playMusic = useCallback(() => {
    if (!soundOn) return;
    if (!musicRef.current) {
      const music = new Audio("/audio/first-light-particles.ogg");
      music.loop = true;
      music.volume = 0.16;
      musicRef.current = music;
    }
    void musicRef.current.play().catch(() => undefined);
  }, [soundOn]);

  const startMusic = useCallback(() => {
    if (phase !== "playing") return;
    playMusic();
  }, [phase, playMusic]);

  useEffect(() => {
    const stored = window.localStorage.getItem("magic-math-sound");
    if (stored !== "off") return;
    const timer = window.setTimeout(() => setSoundOn(false), 0);
    return () => window.clearTimeout(timer);
  }, []);

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

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    window.localStorage.setItem("magic-math-sound", next ? "on" : "off");
    if (!next) stopMusic();
    else {
      ensureAudio();
      if (!musicRef.current) {
        const music = new Audio("/audio/first-light-particles.ogg");
        music.loop = true;
        music.volume = 0.16;
        musicRef.current = music;
      }
      if (phase === "playing") void musicRef.current.play().catch(() => undefined);
    }
  }

  function resetOrder(nextOrder: Order) {
    setOrder(nextOrder);
    setTokens([]);
    setFoundRecipes([]);
    setMistakes(0);
    setOrderTimeLeft(nextOrder.timeLimit);
    setRecipeSolved(false);
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

  function startGame(forcedRound?: number) {
    ensureAudio();
    if (soundOn) {
      if (!musicRef.current) {
        const music = new Audio("/audio/first-light-particles.ogg");
        music.loop = true;
        music.volume = 0.16;
        musicRef.current = music;
      }
      void musicRef.current.play().catch(() => undefined);
    }
    const firstRound = forcedRound ?? (mode === "adventure" && journeyProgress < journeyNodes.length ? journeyProgress + 1 : 1);
    setRound(firstRound);
    setScore(0);
    setCombo(0);
    setBestCombo(0);
    setOrdersServed(0);
    setFastestOrder(null);
    setStrategyCounts({});
    setCelebrating(false);
    const needsTutorial = mode === "adventure"
      && journeyProgress === 0
      && firstRound === 1
      && window.localStorage.getItem("magic-math-tutorial") !== "done";
    setTutorialStep(needsTutorial ? 0 : null);
    if (mode === "lab") {
      seenLabPuzzlesRef.current.clear();
      labSessionSeedRef.current = randomInt(1, 1_000_000);
      resetLab(1);
    }
    else resetOrder(needsTutorial ? createTutorialOrder() : createOrder(firstRound, mode, practiceOperators));
    setPhase("playing");
  }

  function togglePracticeOperator(operator: Operator) {
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
    setTokens((current) => autoOperator && current.length
      ? [...current, { kind: "operator", value: autoOperator }, { kind: "number", id: card.id, value: card.value }]
      : [...current, { kind: "number", id: card.id, value: card.value }]);
    setMessage(autoOperator
      ? `${autoOperator} was added automatically. Choose another number or check your recipe.`
      : "Good choice. The operation signs are glowing — choose one next.");
    setMessageTone("neutral");
    if (tutorialStep === 0) setTutorialStep(1);
    else if (tutorialStep === 2) setTutorialStep(3);
    playTone([520], 0.08, 0.035);
  }

  function addOperator(operator: Operator) {
    if (nextNeedsNumber || recipeSolved) return;
    if (tutorialStep === 1 && operator !== "+") return;
    setTokens((current) => [...current, { kind: "operator", value: operator }]);
    setMessage("Now choose another number card.");
    setMessageTone("neutral");
    if (tutorialStep === 1) setTutorialStep(2);
    playTone([620], 0.08, 0.03);
  }

  function undoToken() {
    if (recipeSolved) return;
    setTokens((current) => autoOperator && current.length > 1 ? current.slice(0, -2) : current.slice(0, -1));
    setTutorialStep((current) => current === null ? null : Math.max(0, current - 1));
    setMessage("Last choice removed. Pick again when you are ready.");
    setMessageTone("neutral");
    playTone([420], 0.07, 0.025);
  }

  function clearExpression() {
    setTokens([]);
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

  function checkRecipe() {
    const value = evaluateExpression(tokens);
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
      playTone([260, 210], 0.16, 0.04);
      return;
    }

    if (tutorialStep !== null) {
      window.localStorage.setItem("magic-math-tutorial", "done");
      setTutorialStep(null);
    }

    const signature = recipeSignature(tokens);
    if (foundRecipes.some((recipe) => recipe.signature === signature)) {
      setMessage("That recipe is already in your book. Change the structure, not just the order.");
      setMessageTone("try");
      playTone([330, 300], 0.13, 0.035);
      return;
    }

    const category = classifyRecipe(tokens);
    const isFirst = foundRecipes.length === 0;
    const categoryIsNew = !foundRecipes.some((recipe) => recipe.category === category);
    const base = orderTimeLeft >= 0 ? 100 : orderTimeLeft >= -10 ? 60 : 30;
    const timeBonus = isFirst ? Math.min(60, Math.max(0, orderTimeLeft) * 3) : 0;
    const discoveryBonus = isFirst ? 0 : foundRecipes.length === 1 ? 50 : 75;
    const newStrategyBonus = !isFirst && categoryIsNew ? 30 : 0;
    const points = Math.max(
      20,
      (isFirst ? base + timeBonus : discoveryBonus + newStrategyBonus) - mistakes * 10,
    );
    const recipe: Recipe = { expression: expressionText(tokens), signature, category, points };
    setFoundRecipes((current) => [...current, recipe]);
    setScore((valueScore) => valueScore + points);
    setStrategyCounts((current) => ({ ...current, [category]: (current[category] ?? 0) + 1 }));
    setRecipeSolved(true);
    setDishStage("ready");
    setMessage(isFirst
      ? `Perfect recipe! +${points} coins. Serve it or explore another structure.`
      : `New discovery: ${category}! +${points} coins.`);
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
    setMessage("Same target, fresh structure. Which strategy has not been used yet?");
    setMessageTone("neutral");
    playTone([659, 784], 0.14, 0.04);
  }

  function finishExploring() {
    if (!foundRecipes.length) return;
    setTokens([]);
    setRecipeSolved(true);
    setDishStage("ready");
    setMessage("Your best recipe is ready. Bake it when you are happy with your discoveries.");
    setMessageTone("good");
  }

  function exitToMenu() {
    if (celebrationTimerRef.current !== null) window.clearTimeout(celebrationTimerRef.current);
    celebrationTimerRef.current = null;
    setCelebrating(false);
    setTokens([]);
    stopMusic();
    setPhase("modes");
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

  function bakeDish() {
    if (!recipeSolved || dishStage !== "ready") return;
    setDishStage("plated");
    setMessage("Fresh from the oven! The dish is plated — deliver it to the customer.");
    setMessageTone("good");
    playTone([523, 659, 784], 0.28, 0.045);
  }

  function deliverOrder() {
    if (!recipeSolved || dishStage !== "plated" || celebrating) return;
    const nextCombo = combo + 1;
    setCombo(nextCombo);
    setBestCombo((value) => Math.max(value, nextCombo));
    setOrdersServed((value) => value + 1);
    setCelebrating(true);
    setDishStage("delivering");
    if (mode === "adventure") {
      const nextProgress = Math.max(journeyProgress, round);
      setJourneyProgress(nextProgress);
      window.localStorage.setItem("magic-math-journey", String(nextProgress));
    }
    playTone([523, 659, 784], 0.25, 0.06);
    celebrationTimerRef.current = window.setTimeout(() => {
      celebrationTimerRef.current = null;
      if (totalOrders !== null && round >= totalOrders) {
        setPhase("finished");
        setCelebrating(false);
        return;
      }
      const nextRound = round + 1;
      setRound(nextRound);
      if (mode === "lab") resetLab(nextRound);
      else resetOrder(createOrder(nextRound, mode, practiceOperators));
      setCelebrating(false);
    }, 1300);
  }

  const progress = totalOrders === null ? ((round - 1) % 5 + 1) * 20 : (round / totalOrders) * 100;
  const topStrategies = useMemo(
    () => Object.entries(strategyCounts).sort((a, b) => b[1] - a[1]),
    [strategyCounts],
  );
  const titleForMode = mode === "adventure"
    ? "Bakery Adventure"
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
          <div className="splash-copy"><small>MAGIC MATH ADVENTURE</small><h1 id="splash-title">Math Garden</h1><p>Grow ideas. Bake numbers. Play with maths.</p></div>
          <button className="splash-start" onClick={() => setPhase("modes")} aria-label="Start Math Garden"><span aria-hidden="true">▶</span></button>
          <small className="tap-to-start">TAP TO START</small>
        </div>
      </section>}

      {phase !== "splash" && <header className="brand-bar">
        <button className="brand-button" onClick={() => phase === "playing" ? exitToMenu() : setPhase("modes")} aria-label="Math Garden mode selection">
          <span className="brand-mark" aria-hidden="true">✦</span>
          <span><small>MAGIC MATH BAKERY</small><strong>Math Garden</strong></span>
        </button>
        <button className={`sound-pill ${soundOn ? "active" : ""}`} onClick={toggleSound} aria-pressed={soundOn}>
          {soundOn ? "♪ Music on" : "♩ Sound off"}
        </button>
      </header>}

      {phase === "modes" && <section className="mode-select-home" aria-labelledby="mode-title">
        <div className="mode-select-intro"><p className="section-kicker">CHOOSE HOW TO PLAY</p><h1 id="mode-title">Where shall we grow today?</h1><p>Pick one big activity. You can always return here and choose another.</p></div>
        <div className="big-mode-grid">
          <button className="big-mode-card journey-choice" onClick={() => { setMode("adventure"); setPhase("journey"); }}><span>🗺️</span><div><small>STEP-BY-STEP</small><strong>Journey</strong><p>A gentle path using only addition and subtraction.</p></div><i>VIEW MAP →</i></button>
          <button className={`big-mode-card practice-choice ${mode === "practice" ? "selected" : ""}`} onClick={() => setMode("practice")}><span>⚡</span><div><small>CHOOSE A SKILL</small><strong>Practice</strong><p>Pick one or more signs and build number recipes.</p></div><i>{mode === "practice" ? "SELECTED ✓" : "CHOOSE →"}</i></button>
          <button className={`big-mode-card balance-choice ${mode === "lab" ? "selected" : ""}`} onClick={() => setMode("lab")}><span>⚖️</span><div><small>PUZZLE PLAY</small><strong>Balance</strong><p>Move small food groups until both oven pans match.</p></div><i>{mode === "lab" ? "SELECTED ✓" : "CHOOSE →"}</i></button>
        </div>
        {(mode === "practice" || mode === "lab") && <div className="mode-setup-panel">
          <div className="chef-welcome"><span aria-hidden="true">👩🏽‍🍳</span><div><small>CHEF MIRA SAYS</small><strong>{mode === "practice" ? "Choose the signs you already know." : "We will begin with tiny weights and only a few foods."}</strong></div></div>
          {mode === "practice" && <div className="operation-picker compact"><span>YOUR SIGNS</span><div>{allOperators.map((operator) => <button key={operator} className={practiceOperators.includes(operator) ? "selected" : ""} onClick={() => togglePracticeOperator(operator)} aria-pressed={practiceOperators.includes(operator)}><strong>{operator}</strong><small>{operatorInfo[operator].title}</small></button>)}</div><p>{practiceOperators.length === 1 ? `${practiceOperators[0]} is placed automatically.` : "Drag a sign when the recipe asks for one."}</p></div>}
          <div className="session-picker compact"><span>HOW LONG?</span><div>{(Object.keys(sessionLevels) as SessionLevel[]).map((level) => <button key={level} className={sessionLevel === level ? "selected" : ""} onClick={() => setSessionLevel(level)} aria-pressed={sessionLevel === level}><strong>{sessionLevels[level].title}</strong><small>{sessionLevels[level].orders === null ? "∞" : sessionLevels[level].orders}</small></button>)}</div></div>
          <button className="primary-button mission-start" onClick={() => startGame()}><span>{mode === "lab" ? "⚖️" : "⚡"}</span>{mode === "lab" ? "Start Balance" : "Start Practice"}</button>
        </div>}
      </section>}

      {phase === "journey" && <section className="journey-home" aria-labelledby="menu-title">
        <button className="journey-back" onClick={() => setPhase("modes")}>← Choose another mode</button>
        <div className="journey-intro starter-intro">
          <div><p className="section-kicker">STARTER GARDEN · + AND − ONLY</p><h1 id="menu-title">One small step<br />at a time.</h1><p>This first path stays with friendly addition and subtraction. Multiplication and division remain in Practice until your child is ready.</p></div>
          <div className="how-it-works" aria-label="How Journey works"><span><i>1</i><b>Tap your stop</b><small>The glowing level starts immediately.</small></span><span><i>2</i><b>Solve 5 cards</b><small>No crowded ingredient shelf.</small></span><span><i>3</i><b>Open the path</b><small>One completed stop unlocks the next.</small></span></div>
        </div>
        <div className="journey-layout">
          <div className="journey-map">
            <div className="map-heading"><div><span>CHAPTER 1 · BEGINNER</span><h2>Plus & Minus Garden</h2></div><strong>{journeyProgress} / {journeyNodes.length} ★</strong></div>
            <div className="map-path" aria-label="Addition and subtraction level path">{journeyNodes.map((node, index) => { const completed = index < journeyProgress; const current = index === journeyProgress || (journeyProgress === journeyNodes.length && index === journeyNodes.length - 1); return <button key={node.title} className={`path-stop ${node.color} ${completed ? "completed" : ""} ${current ? "current" : ""}`} onClick={() => startGame(index + 1)} disabled={!completed && !current} aria-label={`${node.title}, ${completed ? "completed, replay level" : current ? "current level, play now" : "locked"}`}><span>{completed ? "✓" : node.icon}</span><div><strong>{node.title}</strong><small>{node.skill}</small></div>{(completed || current) && <i>{completed ? "REPLAY" : "PLAY"}</i>}{!completed && !current && <i>🔒</i>}</button>; })}</div>
          </div>
          <aside className="mission-dock journey-guide"><div className="chef-welcome"><span aria-hidden="true">👩🏽‍🍳</span><div><small>YOUR NEXT STOP</small><strong>{journeyProgress === journeyNodes.length ? "Replay any colourful stop!" : journeyNodes[journeyProgress].title}</strong></div></div><div className="starter-badge"><span>🌱</span><strong>Made for beginners</strong><small>Only + and − · five food cards · gentle number growth</small></div><button className="primary-button mission-start" onClick={() => startGame()}><span>▶</span>{journeyProgress === journeyNodes.length ? "Replay from the start" : "Play the glowing level"}</button><div className="mini-legend"><span><i className="done" />Complete</span><span><i className="now" />Current</span><span><i className="later" />Locked</span></div></aside>
        </div>
      </section>}

      {phase === "playing" && (
        <section className={`play-area ${celebrating ? "is-celebrating" : ""}`} aria-live="polite">
          <div className="hud">
            <button className="exit-button" onClick={finishOrExit} aria-label={sessionLevel === "endless" && ordersServed > 0 ? "Finish the endless shift and view results" : "Exit the current game and return to the main menu"}>{sessionLevel === "endless" && ordersServed > 0 ? "✓ Finish shift" : "← Exit to menu"}</button>
            <div className="hud-stat"><span>COINS</span><strong>★ {score}</strong></div>
            <div className="progress-wrap">
              <div className="progress-label"><span>{titleForMode.toUpperCase()} · ORDER {round}{totalOrders === null ? " · ENDLESS" : ` OF ${totalOrders}`}</span><span>{totalOrders === null ? "∞" : `${Math.round(progress)}%`}</span></div>
              <div className="progress-track"><div style={{ width: `${progress}%` }} /></div>
            </div>
            {mode === "lab"
              ? <div className="hud-stat timer"><span>OVEN MOVES</span><strong>⚖ {labMoves} / {labPuzzle.moves}</strong></div>
              : <div className={`hud-stat timer ${orderTimeLeft <= 5 ? "urgent" : ""}`}><span>{orderTimeLeft >= 0 ? "BONUS TIME" : "OVERTIME"}</span><strong>◷ {Math.abs(orderTimeLeft)}s</strong></div>}
          </div>

          <div className={`order-stage dish-${dishStage}`}>
            <div className="customer-card"><div className="customer-face" aria-hidden="true">{dishStage === "delivering" ? "😋" : ["🧒🏽", "👧🏻", "👦🏾", "👧🏼", "🧒🏻"][(round - 1) % 5]}</div><div><span>CUSTOMER</span><strong>{mode === "lab" ? customers[(round + 1) % customers.length] : order.customer}</strong></div></div>
            <div className="speech-bubble">{mode === "lab" ? <><p>My magic oven is tilting!</p><div className="target-line">Make both baking pans level</div><small>No equation needed — read the movement and balance the ingredients.</small></> : <><p>{order.request}</p><div className="target-line">Make my treat equal <strong>{order.target}</strong></div><small>{order.challenge}</small></>}</div>
            <div className={`combo-badge ${combo > 1 ? "active" : ""}`}><span>COMBO</span><strong>×{Math.max(combo, 1)}</strong></div>
            {(dishStage === "plated" || dishStage === "delivering") && <div className="dish-delivery" aria-live="polite"><span>{dishes[(round - 1) % dishes.length]}</span><small>{dishStage === "plated" ? "FRESHLY PLATED" : "DELIVERING!"}</small></div>}
          </div>

          <div className="workbench">
            {tutorialStep !== null && mode === "adventure" && <div className="tutorial-ribbon" role="status"><span className="tutorial-chef">👩🏽‍🍳</span><div><small>YOUR FIRST RECIPE · STEP {tutorialStep + 1} OF 4</small><strong>{tutorialStep === 0 ? "Drag number 2 into the recipe bar" : tutorialStep === 1 ? "Drag the + sign into the recipe" : tutorialStep === 2 ? "Now drag number 3" : "Perfect — check your recipe!"}</strong><p>{tutorialStep < 3 ? "You can also tap the glowing tile." : "2 + 3 makes the customer’s target: 5."}</p></div><div className="tutorial-dots">{[0, 1, 2, 3].map((step) => <i key={step} className={step <= tutorialStep ? "active" : ""} />)}</div></div>}
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
                  <div className="loose-ingredients"><span>DRAG THESE INGREDIENTS</span><div>{labPuzzle.pieces.map((piece) => <button key={piece.id} className={`draggable ${selectedLabPiece === piece.id ? "selected" : ""} ${labPlacements[piece.id] ? "placed" : ""}`} {...dragProps({ kind: "lab", id: piece.id, label: piece.emoji.repeat(piece.weight) })} onClick={() => { if (!ignoreDragClick()) chooseLabPiece(piece.id); }} disabled={recipeSolved} aria-pressed={selectedLabPiece === piece.id}><span>{piece.emoji.repeat(piece.weight)}</span><small>{labPlacements[piece.id] ? `On ${labPlacements[piece.id]} pan · drag to move` : "Drag to a pan · or tap"}</small></button>)}</div></div>
                  {recipeSolved && <div className="lab-success"><span>✓</span><div><strong>Perfect balance!</strong><small>Every ingredient is used and both pans have equal weight.</small></div><button className="serve-button" onClick={advanceLabPuzzle}>{totalOrders !== null && round >= totalOrders ? "View results →" : "Next puzzle →"}</button></div>}
                </div>
                <aside className="lab-rules"><span>GOAL OF THE PUZZLE</span><h3>Place all food. Level the oven.</h3><p>The dots are fixed weights and cannot move. The food groups are movable weights. You may add food to either side—not only the lighter side.</p><div><i>●</i><strong>One symbol = one weight</strong><small>A group of three berries weighs the same as three dots.</small></div><div><i>↔️</i><strong>Either pan is allowed</strong><small>Sometimes both sides need extra food to use every group.</small></div><div><i>✨</i><strong>Finish condition</strong><small>All loose food is placed and the beam is level.</small></div></aside>
              </div>
            ) : (
            <div className="builder-layout">
              <div className="builder-main">
                <div className={`expression-board ${dragItem && dragItem.kind !== "lab" ? "drop-ready" : ""}`} data-drop-zone="expression">
                  <div><span>YOUR RECIPE · DROP HERE</span><div className="expression-slots">{tokens.length ? tokens.map((token, index) => <b key={token.kind === "number" ? token.id : `${token.value}-${index}`} className={token.kind}>{token.value}</b>) : <em>Drag a number here to begin</em>}</div></div>
                  <div className={`value-orb ${currentValue === order.target ? "exact" : ""}`}><span>VALUE</span><strong>{currentValue === null ? "?" : Number(currentValue.toFixed(2))}</strong></div>
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
                <div className="book-title"><span>RECIPE BOOK</span><strong>{foundRecipes.length} discovered</strong></div>
                <div className="recipe-list">
                  {foundRecipes.length === 0 && <div className="empty-recipe"><span>☆</span><p>Your first correct expression will be saved here.</p></div>}
                  {foundRecipes.map((recipe) => <div className="saved-recipe" key={recipe.signature}><span>★</span><div><small>{recipe.category}</small><strong>{recipe.expression} = {order.target}</strong></div><i>+{recipe.points}</i></div>)}
                </div>
                <div className="strategy-hints"><span>TRY A NEW STRUCTURE</span><div>{["Pair", "3+ cards", "Subtract", "Multiply", "Divide", "Mixed"].map((label) => <i key={label}>{label}</i>)}</div></div>
              </aside>
            </div>
            )}

            <div className={`coach-bar ${messageTone}`}>
              <div className="coach-icon" aria-hidden="true">👩🏽‍🍳</div><div><span>CHEF MIRA SAYS</span><p>{message}</p></div>
              <div className="coach-buttons">
                {mode !== "lab" && !recipeSolved && <>
                  {foundRecipes.length > 0 && <button className="secondary-button" onClick={finishExploring}>Finish exploring →</button>}
                  <button className={`serve-button ${tutorialStep === 3 ? "tutorial-target" : ""}`} onClick={checkRecipe} disabled={!tokens.length}>Check recipe</button>
                </>}
                {recipeSolved && dishStage === "ready" && mode === "lab" && <button className="serve-button" onClick={advanceLabPuzzle}>{totalOrders !== null && round >= totalOrders ? "View results →" : "Next puzzle →"}</button>}
                {recipeSolved && dishStage === "ready" && mode !== "lab" && <><button className="secondary-button" onClick={findAnotherWay}>Find another way</button><button className="serve-button" onClick={bakeDish}>Bake this dish →</button></>}
                {recipeSolved && dishStage === "plated" && <button className="serve-button deliver-button" onClick={deliverOrder}>Deliver order →</button>}
                {dishStage === "delivering" && <strong className="delivery-status">Order on its way!</strong>}
              </div>
            </div>
          </div>
          {celebrating && <div className="sparkles" aria-hidden="true"><i>✦</i><i>★</i><i>✧</i><i>✦</i><i>★</i></div>}
        </section>
      )}

      {phase === "finished" && (
        <section className="result-card" aria-labelledby="result-title">
          <div className="result-stars" aria-hidden="true">✦ ★ ✦</div><p className="section-kicker">SHIFT COMPLETE</p><h1 id="result-title">Your thinking made the bakery sparkle.</h1>
          <div className="score-medal"><span>TOTAL COINS</span><strong>{score}</strong></div>
          <div className="result-stats"><div><span>Orders served</span><strong>{ordersServed}{totalOrders === null ? "" : ` / ${totalOrders}`}</strong></div><div><span>Best combo</span><strong>×{Math.max(bestCombo, 1)}</strong></div><div><span>Fastest recipe</span><strong>{fastestOrder ?? "—"}s</strong></div><div><span>Strategies found</span><strong>{Object.values(strategyCounts).reduce((sum, value) => sum + value, 0)}</strong></div></div>
          <div className="thinking-report"><span>YOUR THINKING REPORT</span>{topStrategies.length ? topStrategies.map(([strategy, count]) => <div key={strategy}><strong>{strategy}</strong><span>{count} recipe{count > 1 ? "s" : ""}</span></div>) : <p>Try another shift to fill your strategy report.</p>}</div>
          <div className="result-actions"><button className="secondary-button" onClick={() => setPhase("modes")}>Change mode</button><button className="primary-button" onClick={() => startGame()}>Play again <span>↻</span></button></div>
        </section>
      )}

      {phase !== "splash" && <footer><span>Educational game prototype · P0.2</span><span>Music: First Light Particles by Yoiyami · CC0</span></footer>}
    </main>
  );
}
