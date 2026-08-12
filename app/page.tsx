"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Mode = "adventure" | "practice" | "lab";
type Operation = "add" | "subtract" | "multiply" | "divide" | "mixed";
type Operator = "+" | "−" | "×" | "÷";
type Phase = "menu" | "playing" | "finished";
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
  if (round <= 2) return "add";
  if (round <= 4) return "subtract";
  if (round <= 6) return "multiply";
  if (round === 7) return "divide";
  return "mixed";
}

function createStandardOrder(round: number, operation: Operation, operators = allowedOperators(operation)): Order {
  let target = 10;
  let solution: number[] = [];
  let challenge = "Build one correct recipe.";

  if (operation === "add") {
    const a = randomInt(2, Math.min(9, 4 + round));
    const b = randomInt(2, 9);
    target = a + b;
    solution = [a, b];
    challenge = round > 1 ? "Try a three-card recipe after your first answer." : "Warm up with two number cards.";
  } else if (operation === "subtract") {
    target = randomInt(3, 12);
    const removed = randomInt(2, 8);
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
  while (values.length < 7) values.push(randomInt(1, Math.max(9, Math.min(20, target + 3))));
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
  const difficulty = level === "endless" ? endlessLabDifficulty(round) : labDifficulty[level];
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
  const [phase, setPhase] = useState<Phase>("menu");
  const [mode, setMode] = useState<Mode>("adventure");
  const [practiceOperators, setPracticeOperators] = useState<Operator[]>(["+"]);
  const [sessionLevel, setSessionLevel] = useState<SessionLevel>("baker");
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
  const audioRef = useRef<AudioContext | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const celebrationTimerRef = useRef<number | null>(null);
  const seenLabPuzzlesRef = useRef<Set<string>>(new Set());
  const labSessionSeedRef = useRef(0);

  const totalOrders = sessionLevels[sessionLevel].orders;
  const expression = expressionText(tokens);
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

  function startGame() {
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
    setRound(1);
    setScore(0);
    setCombo(0);
    setBestCombo(0);
    setOrdersServed(0);
    setFastestOrder(null);
    setStrategyCounts({});
    setCelebrating(false);
    if (mode === "lab") {
      seenLabPuzzlesRef.current.clear();
      labSessionSeedRef.current = randomInt(1, 1_000_000);
      resetLab(1);
    }
    else resetOrder(createOrder(1, mode, practiceOperators));
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
    playTone([520], 0.08, 0.035);
  }

  function addOperator(operator: Operator) {
    if (nextNeedsNumber || recipeSolved) return;
    setTokens((current) => [...current, { kind: "operator", value: operator }]);
    setMessage("Now choose another number card.");
    setMessageTone("neutral");
    playTone([620], 0.08, 0.03);
  }

  function undoToken() {
    if (recipeSolved) return;
    setTokens((current) => autoOperator && current.length > 1 ? current.slice(0, -2) : current.slice(0, -1));
    setMessage("Last choice removed. Pick again when you are ready.");
    setMessageTone("neutral");
    playTone([420], 0.07, 0.025);
  }

  function clearExpression() {
    setTokens([]);
    setRecipeSolved(false);
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

  function placeLabPiece(side: "left" | "right") {
    if (!selectedLabPiece || recipeSolved) return;
    const nextPlacements = { ...labPlacements, [selectedLabPiece]: side };
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
    setPhase("menu");
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
      <header className="brand-bar">
        <button className="brand-button" onClick={() => phase === "playing" ? exitToMenu() : setPhase("menu")} aria-label="Magic Math Bakery home">
          <span className="brand-mark" aria-hidden="true">✦</span>
          <span><small>NUMBER QUEST</small><strong>Magic Math Bakery</strong></span>
        </button>
        <button className={`sound-pill ${soundOn ? "active" : ""}`} onClick={toggleSound} aria-pressed={soundOn}>
          {soundOn ? "♪ Music on" : "♩ Sound off"}
        </button>
      </header>

      {phase === "menu" && (
        <section className="menu-card" aria-labelledby="menu-title">
          <div className="menu-copy">
            <p className="section-kicker">CHOOSE TODAY’S MISSION</p>
            <h1 id="menu-title">Bake the number.<br />Discover the recipe.</h1>
            <p className="intro-description">Build expressions with number cards and operation signs. One correct recipe serves the order; a different strategy earns discovery stars.</p>

            <div className="mode-grid" role="radiogroup" aria-label="Game mode">
              <button className={`mode-card ${mode === "adventure" ? "selected" : ""}`} onClick={() => setMode("adventure")} role="radio" aria-checked={mode === "adventure"}>
                <span className="mode-icon">🗺️</span><span><strong>Bakery Adventure</strong><small>Unlock +, −, × and ÷ through a guided shift</small></span><i>GUIDED</i>
              </button>
              <button className={`mode-card ${mode === "practice" ? "selected" : ""}`} onClick={() => setMode("practice")} role="radio" aria-checked={mode === "practice"}>
                <span className="mode-icon">⏱️</span><span><strong>Quick Practice</strong><small>Choose one or several operations for a focused shift</small></span><i>FLUENCY</i>
              </button>
              <button className={`mode-card ${mode === "lab" ? "selected" : ""}`} onClick={() => setMode("lab")} role="radio" aria-checked={mode === "lab"}>
                <span className="mode-icon">⚖️</span><span><strong>Oven Balance Lab</strong><small>A pure puzzle: balance ingredients without equations</small></span><i>PLAY</i>
              </button>
            </div>

            {mode === "practice" && (
              <div className="operation-picker">
                <span>CHOOSE ONE OR MORE OPERATIONS</span>
                <div>
                  {allOperators.map((operator) => (
                    <button key={operator} className={practiceOperators.includes(operator) ? "selected" : ""} onClick={() => togglePracticeOperator(operator)} aria-pressed={practiceOperators.includes(operator)}>
                      <strong>{operator}</strong><small>{operatorInfo[operator].title}</small>
                    </button>
                  ))}
                </div>
                <p>{practiceOperators.length === 1 ? `${practiceOperators[0]} will be inserted automatically during play.` : "You will choose between the selected signs during play."}</p>
              </div>
            )}

            <div className="session-picker">
              <span>CHOOSE SHIFT LENGTH</span>
              <div>
                {(Object.keys(sessionLevels) as SessionLevel[]).map((level) => (
                  <button key={level} className={sessionLevel === level ? "selected" : ""} onClick={() => setSessionLevel(level)} aria-pressed={sessionLevel === level}>
                    <strong>{sessionLevels[level].title}</strong><small>{sessionLevels[level].note}</small>
                  </button>
                ))}
              </div>
            </div>

            <button className="primary-button" onClick={startGame}>Start {mode === "lab" ? "exploring" : "the shift"} <span>→</span></button>
            <p className="tiny-note">P0.1 · per-order rewards · one answer is enough · ages 7–11</p>
          </div>
          <div className="menu-visual" aria-hidden="true">
            <div className="visual-badge">NEW RECIPE BOOK</div>
            <div className="target-cookie"><small>TARGET</small><strong>12</strong></div>
            <div className="recipe-slip slip-one"><span>PAIR</span><strong>4 + 8</strong><i>★</i></div>
            <div className="recipe-slip slip-two"><span>MULTIPLY</span><strong>3 × 4</strong><i>★</i></div>
            <div className="recipe-slip slip-three"><span>DIVIDE</span><strong>24 ÷ 2</strong><i>★</i></div>
            <div className="menu-chef">👩🏽‍🍳</div>
          </div>
        </section>
      )}

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
            {mode === "lab" ? (
              <div className="lab-layout">
                <div className="balance-game">
                  <div className="lab-heading"><span>OVEN BALANCE LAB</span><h2>Use every loose ingredient and level the beam</h2><small>Suggested moves: {labPuzzle.moves} · Your moves: {labMoves}</small></div>
                  <div className="lab-howto" aria-label="How to play Oven Balance Lab">
                    <div><strong>1</strong><span><b>Read the weight</b><small>Every ● dot and every food icon weighs 1.</small></span></div>
                    <div><strong>2</strong><span><b>Use every ingredient</b><small>Tap a food group, then choose either pan.</small></span></div>
                    <div><strong>3</strong><span><b>Make both sides equal</b><small>The beam must be level after all food is placed.</small></span></div>
                  </div>
                  <div className={`balance-scale ${labLeftWeight > labRightWeight ? "tilt-left" : labRightWeight > labLeftWeight ? "tilt-right" : "level"}`}>
                    <button className="scale-pan left-pan" onClick={() => placeLabPiece("left")} disabled={!selectedLabPiece || recipeSolved} aria-label="Place selected ingredient on the left pan">
                      <small>FIXED DOTS · {labPuzzle.leftBase}</small>
                      <span className="base-stack" aria-label="Fixed ingredients">{"●".repeat(labPuzzle.leftBase)}</span>
                      <span className="placed-stack">{labPuzzle.pieces.filter((piece) => labPlacements[piece.id] === "left").map((piece) => <i key={piece.id}>{piece.emoji.repeat(piece.weight)}</i>)}</span>
                      <strong>LEFT PAN</strong>
                    </button>
                    <div className="scale-post"><i /><strong>{labLeftWeight === labRightWeight ? Object.keys(labPlacements).length === labPuzzle.pieces.length ? "LEVEL" : "LEVEL FOR NOW" : "TILTING"}</strong></div>
                    <button className="scale-pan right-pan" onClick={() => placeLabPiece("right")} disabled={!selectedLabPiece || recipeSolved} aria-label="Place selected ingredient on the right pan">
                      <small>FIXED DOTS · {labPuzzle.rightBase}</small>
                      <span className="base-stack" aria-label="Fixed ingredients">{"●".repeat(labPuzzle.rightBase)}</span>
                      <span className="placed-stack">{labPuzzle.pieces.filter((piece) => labPlacements[piece.id] === "right").map((piece) => <i key={piece.id}>{piece.emoji.repeat(piece.weight)}</i>)}</span>
                      <strong>RIGHT PAN</strong>
                    </button>
                  </div>
                  <div className="lab-actions"><button onClick={undoLabMove} disabled={!labHistory.length || recipeSolved}><span>↶</span> Undo last move</button><button onClick={clearLab} disabled={!Object.keys(labPlacements).length || recipeSolved}><span>✕</span> Clear all</button></div>
                  <div className="loose-ingredients"><span>LOOSE INGREDIENTS</span><div>{labPuzzle.pieces.map((piece) => <button key={piece.id} className={`${selectedLabPiece === piece.id ? "selected" : ""} ${labPlacements[piece.id] ? "placed" : ""}`} onClick={() => chooseLabPiece(piece.id)} disabled={recipeSolved} aria-pressed={selectedLabPiece === piece.id}><span>{piece.emoji.repeat(piece.weight)}</span><small>{labPlacements[piece.id] ? `On ${labPlacements[piece.id]} pan · tap to move` : "Tap, then choose a pan"}</small></button>)}</div></div>
                  {recipeSolved && <div className="lab-success"><span>✓</span><div><strong>Perfect balance!</strong><small>Every ingredient is used and both pans have equal weight.</small></div><button className="serve-button" onClick={advanceLabPuzzle}>{totalOrders !== null && round >= totalOrders ? "View results →" : "Next puzzle →"}</button></div>}
                </div>
                <aside className="lab-rules"><span>GOAL OF THE PUZZLE</span><h3>Place all food. Level the oven.</h3><p>The dots are fixed weights and cannot move. The food groups are movable weights. You may add food to either side—not only the lighter side.</p><div><i>●</i><strong>One symbol = one weight</strong><small>A group of three berries weighs the same as three dots.</small></div><div><i>↔️</i><strong>Either pan is allowed</strong><small>Sometimes both sides need extra food to use every group.</small></div><div><i>✨</i><strong>Finish condition</strong><small>All loose food is placed and the beam is level.</small></div></aside>
              </div>
            ) : (
            <div className="builder-layout">
              <div className="builder-main">
                <div className="expression-board">
                  <div><span>YOUR EXPRESSION</span><strong>{expression || "Choose a number to begin"}</strong></div>
                  <div className={`value-orb ${currentValue === order.target ? "exact" : ""}`}><span>VALUE</span><strong>{currentValue === null ? "?" : Number(currentValue.toFixed(2))}</strong></div>
                </div>
                <div className="builder-actions"><button onClick={undoToken} disabled={!tokens.length || recipeSolved}><span>↶</span> Undo last</button><button onClick={clearExpression} disabled={!tokens.length || recipeSolved}><span>✕</span> Clear all</button><small>Tap the last selected card to undo it</small></div>

                <div className={`number-zone ${numberInputActive && !recipeSolved ? "input-focus" : ""}`}>
                <div className="shelf-heading"><div><span>1 · NUMBER CARDS</span><h2>{numberInputActive ? "Choose a number" : "Choose an operation first"}</h2></div><small>{numberInputActive ? "Your turn: pick a card" : "Waiting for a sign"}</small></div>
                <div className="number-grid">
                  {order.cards.map((card) => {
                    const used = usedCardIds.includes(card.id);
                    const isLast = tokens[tokens.length - 1]?.kind === "number" && tokens[tokens.length - 1].id === card.id;
                    return <button key={card.id} className={`number-card ${used ? "used" : ""} ${isLast ? "last-selected" : ""}`} onClick={() => addNumber(card)} disabled={(used && !isLast) || (!numberInputActive && !isLast) || recipeSolved} aria-label={`${card.name}, value ${card.value}${isLast ? ", last selected, tap to undo" : used ? ", used" : ""}`}><span aria-hidden="true">{card.emoji}</span><strong>{card.value}</strong><small>{isLast ? "tap to undo" : card.name}</small></button>;
                  })}
                </div>
                </div>

                <div className={`operator-row ${operatorInputActive && !recipeSolved ? "input-focus" : ""} ${autoOperator ? "auto-operator" : ""}`}><div><span>2 · OPERATION SIGNS</span><h2>{autoOperator ? `${autoOperator} is added automatically` : operatorInputActive ? "Choose an operation" : "Choose a number first"}</h2></div><div>{operators.map((operator) => <button key={operator} onClick={() => addOperator(operator)} disabled={!operatorInputActive || recipeSolved} aria-label={`Add ${operator} to expression`}>{operator}</button>)}</div></div>
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
                  <button className="serve-button" onClick={checkRecipe} disabled={!tokens.length}>Check recipe</button>
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
          <div className="result-actions"><button className="secondary-button" onClick={() => setPhase("menu")}>Change mode</button><button className="primary-button" onClick={startGame}>Play again <span>↻</span></button></div>
        </section>
      )}

      <footer><span>Educational game prototype · P0.1</span><span>Music: First Light Particles by Yoiyami · CC0</span></footer>
    </main>
  );
}
