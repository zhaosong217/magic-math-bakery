"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Mode = "adventure" | "practice" | "lab";
type Operation = "add" | "subtract" | "multiply" | "divide" | "mixed";
type Operator = "+" | "−" | "×" | "÷";
type Phase = "menu" | "playing" | "finished";

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
  timeLimit: number;
  customer: string;
  request: string;
  challenge: string;
};

const TOTAL_STANDARD_ORDERS = 8;
const TOTAL_LAB_ORDERS = 5;
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

const labPuzzles = [
  { target: 12, values: [4, 8, 10, 2, 3, 4, 24, 2] },
  { target: 18, values: [9, 9, 20, 2, 3, 6, 36, 2] },
  { target: 24, values: [12, 12, 30, 6, 3, 8, 48, 2] },
  { target: 15, values: [7, 8, 20, 5, 3, 5, 30, 2] },
  { target: 16, values: [8, 8, 20, 4, 2, 8, 32, 2] },
];

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

function createStandardOrder(round: number, operation: Operation): Order {
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
    timeLimit,
    customer: customers[(round - 1) % customers.length],
    request: requests[(round - 1) % requests.length],
    challenge,
  };
}

function createLabOrder(round: number): Order {
  const puzzle = labPuzzles[(round - 1) % labPuzzles.length];
  return {
    target: puzzle.target,
    cards: makeCards(puzzle.values, round),
    operation: "mixed",
    timeLimit: 45,
    customer: customers[(round + 1) % customers.length],
    request: "Show me how flexible numbers can be!",
    challenge: "One recipe serves the order. Different structures earn discovery stars.",
  };
}

function createOrder(round: number, mode: Mode, practiceOperation: Operation) {
  if (mode === "lab") return createLabOrder(round);
  const operation = mode === "adventure" ? adventureOperation(round) : practiceOperation;
  return createStandardOrder(round, operation);
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
  const [practiceOperation, setPracticeOperation] = useState<Operation>("add");
  const [round, setRound] = useState(1);
  const [order, setOrder] = useState<Order>(() => createOrder(1, "adventure", "add"));
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
  const audioRef = useRef<AudioContext | null>(null);
  const musicTimerRef = useRef<number | null>(null);
  const musicStepRef = useRef(0);
  const celebrationTimerRef = useRef<number | null>(null);

  const totalOrders = mode === "lab" ? TOTAL_LAB_ORDERS : TOTAL_STANDARD_ORDERS;
  const expression = expressionText(tokens);
  const currentValue = evaluateExpression(tokens);
  const usedCardIds = tokens
    .filter((token): token is Extract<Token, { kind: "number" }> => token.kind === "number")
    .map((token) => token.id);
  const nextNeedsNumber = !tokens.length || tokens[tokens.length - 1].kind === "operator";
  const operators = allowedOperators(order.operation);

  const ensureAudio = useCallback(() => {
    if (!audioRef.current && typeof window !== "undefined") audioRef.current = new AudioContext();
    void audioRef.current?.resume();
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

  const playAmbientChord = useCallback((frequencies: number[]) => {
    if (!soundOn) return;
    const context = ensureAudio();
    if (!context) return;
    const startAt = context.currentTime;
    frequencies.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const filter = context.createBiquadFilter();
      oscillator.type = index === 0 ? "sine" : "triangle";
      oscillator.frequency.value = frequency;
      filter.type = "lowpass";
      filter.frequency.value = 920;
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(index === 0 ? 0.009 : 0.0045, startAt + 0.9);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 4.2);
      oscillator.connect(filter).connect(gain).connect(context.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + 4.3);
    });
  }, [ensureAudio, soundOn]);

  const stopMusic = useCallback(() => {
    if (musicTimerRef.current !== null) window.clearInterval(musicTimerRef.current);
    musicTimerRef.current = null;
  }, []);

  const startMusic = useCallback(() => {
    stopMusic();
    if (!soundOn || phase !== "playing") return;
    const chords = [
      [130.81, 196, 246.94, 329.63],
      [110, 164.81, 220, 261.63],
      [146.83, 220, 261.63, 349.23],
      [98, 146.83, 196, 246.94],
    ];
    const playNext = () => {
      playAmbientChord(chords[musicStepRef.current % chords.length]);
      musicStepRef.current += 1;
    };
    playNext();
    musicTimerRef.current = window.setInterval(playNext, 4800);
  }, [phase, playAmbientChord, soundOn, stopMusic]);

  useEffect(() => {
    const stored = window.localStorage.getItem("magic-math-sound");
    if (stored === "off") setSoundOn(false);
  }, []);

  useEffect(() => {
    startMusic();
    return stopMusic;
  }, [startMusic, stopMusic]);

  useEffect(() => {
    return () => {
      stopMusic();
      if (celebrationTimerRef.current !== null) window.clearTimeout(celebrationTimerRef.current);
      void audioRef.current?.close();
    };
  }, [stopMusic]);

  useEffect(() => {
    if (phase !== "playing" || recipeSolved || celebrating) return;
    const timer = window.setInterval(() => {
      setOrderTimeLeft((value) => {
        const next = Math.max(-30, value - 1);
        if (next === 5) playTone([392, 523], 0.22, 0.018);
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [celebrating, phase, playTone, recipeSolved]);

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    window.localStorage.setItem("magic-math-sound", next ? "on" : "off");
    if (!next) stopMusic();
    else ensureAudio();
  }

  function resetOrder(nextOrder: Order) {
    setOrder(nextOrder);
    setTokens([]);
    setFoundRecipes([]);
    setMistakes(0);
    setOrderTimeLeft(nextOrder.timeLimit);
    setRecipeSolved(false);
    setMessage("Build an expression, then check your recipe.");
    setMessageTone("neutral");
  }

  function startGame() {
    ensureAudio();
    setRound(1);
    setScore(0);
    setCombo(0);
    setBestCombo(0);
    setOrdersServed(0);
    setFastestOrder(null);
    setStrategyCounts({});
    setCelebrating(false);
    resetOrder(createOrder(1, mode, practiceOperation));
    setPhase("playing");
  }

  function addNumber(card: NumberCard) {
    if (!nextNeedsNumber || usedCardIds.includes(card.id) || recipeSolved) return;
    setTokens((current) => [...current, { kind: "number", id: card.id, value: card.value }]);
    setMessage("Good choice. Add an operation sign next.");
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
    setTokens((current) => current.slice(0, -1));
    playTone([420], 0.07, 0.025);
  }

  function clearExpression() {
    setTokens([]);
    setRecipeSolved(false);
    setMessage("Recipe cleared. Try a fresh idea!");
    setMessageTone("neutral");
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
    setMessage("Same target, fresh structure. Which strategy has not been used yet?");
    setMessageTone("neutral");
    playTone([659, 784], 0.14, 0.04);
  }

  function exitToMenu() {
    if (celebrationTimerRef.current !== null) window.clearTimeout(celebrationTimerRef.current);
    celebrationTimerRef.current = null;
    setCelebrating(false);
    setTokens([]);
    setPhase("menu");
  }

  function serveOrder() {
    if (!foundRecipes.length || celebrating) return;
    const nextCombo = combo + 1;
    setCombo(nextCombo);
    setBestCombo((value) => Math.max(value, nextCombo));
    setOrdersServed((value) => value + 1);
    setCelebrating(true);
    playTone([523, 659, 784], 0.25, 0.06);
    celebrationTimerRef.current = window.setTimeout(() => {
      celebrationTimerRef.current = null;
      if (round >= totalOrders) {
        setPhase("finished");
        setCelebrating(false);
        return;
      }
      const nextRound = round + 1;
      setRound(nextRound);
      resetOrder(createOrder(nextRound, mode, practiceOperation));
      setCelebrating(false);
    }, 700);
  }

  const progress = (round / totalOrders) * 100;
  const topStrategies = useMemo(
    () => Object.entries(strategyCounts).sort((a, b) => b[1] - a[1]),
    [strategyCounts],
  );
  const titleForMode = mode === "adventure" ? "Bakery Adventure" : mode === "practice" ? `${operationInfo[practiceOperation].title} Practice` : "Number Lab";

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
                <span className="mode-icon">🗺️</span><span><strong>Bakery Adventure</strong><small>Unlock +, −, × and ÷ across 8 orders</small></span><i>GUIDED</i>
              </button>
              <button className={`mode-card ${mode === "practice" ? "selected" : ""}`} onClick={() => setMode("practice")} role="radio" aria-checked={mode === "practice"}>
                <span className="mode-icon">⏱️</span><span><strong>Quick Practice</strong><small>Train one operation with time bonuses</small></span><i>FLUENCY</i>
              </button>
              <button className={`mode-card ${mode === "lab" ? "selected" : ""}`} onClick={() => setMode("lab")} role="radio" aria-checked={mode === "lab"}>
                <span className="mode-icon">🔎</span><span><strong>Number Lab</strong><small>Find several structures for the same target</small></span><i>THINKING</i>
              </button>
            </div>

            {mode === "practice" && (
              <div className="operation-picker">
                <span>CHOOSE AN OPERATION</span>
                <div>
                  {(Object.keys(operationInfo) as Operation[]).map((operation) => (
                    <button key={operation} className={practiceOperation === operation ? "selected" : ""} onClick={() => setPracticeOperation(operation)} aria-pressed={practiceOperation === operation}>
                      <strong>{operationInfo[operation].symbol}</strong><small>{operationInfo[operation].title}</small>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button className="primary-button" onClick={startGame}>Start {mode === "lab" ? "exploring" : "the shift"} <span>→</span></button>
            <p className="tiny-note">Per-order time rewards · one answer is enough · ages 7–11</p>
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
            <button className="exit-button" onClick={exitToMenu} aria-label="Exit the current game and return to the main menu">← Exit to menu</button>
            <div className="hud-stat"><span>COINS</span><strong>★ {score}</strong></div>
            <div className="progress-wrap">
              <div className="progress-label"><span>{titleForMode.toUpperCase()} · ORDER {round} OF {totalOrders}</span><span>{Math.round(progress)}%</span></div>
              <div className="progress-track"><div style={{ width: `${progress}%` }} /></div>
            </div>
            <div className={`hud-stat timer ${orderTimeLeft <= 5 ? "urgent" : ""}`}><span>{orderTimeLeft >= 0 ? "BONUS TIME" : "OVERTIME"}</span><strong>◷ {Math.abs(orderTimeLeft)}s</strong></div>
          </div>

          <div className="order-stage">
            <div className="customer-card"><div className="customer-face" aria-hidden="true">{["🧒🏽", "👧🏻", "👦🏾", "👧🏼", "🧒🏻"][(round - 1) % 5]}</div><div><span>CUSTOMER</span><strong>{order.customer}</strong></div></div>
            <div className="speech-bubble"><p>{order.request}</p><div className="target-line">Make my treat equal <strong>{order.target}</strong></div><small>{order.challenge}</small></div>
            <div className={`combo-badge ${combo > 1 ? "active" : ""}`}><span>COMBO</span><strong>×{Math.max(combo, 1)}</strong></div>
          </div>

          <div className="workbench">
            <div className="builder-layout">
              <div className="builder-main">
                <div className="expression-board">
                  <div><span>YOUR EXPRESSION</span><strong>{expression || "Choose a number to begin"}</strong></div>
                  <div className={`value-orb ${currentValue === order.target ? "exact" : ""}`}><span>VALUE</span><strong>{currentValue === null ? "?" : Number(currentValue.toFixed(2))}</strong></div>
                  <div className="builder-actions"><button onClick={undoToken} disabled={!tokens.length || recipeSolved}>Undo</button><button onClick={clearExpression} disabled={!tokens.length}>Clear</button></div>
                </div>

                <div className="shelf-heading"><div><span>1 · NUMBER CARDS</span><h2>{nextNeedsNumber ? "Choose a number" : "Number cards are waiting"}</h2></div><small>Each card can be used once</small></div>
                <div className="number-grid">
                  {order.cards.map((card) => {
                    const used = usedCardIds.includes(card.id);
                    return <button key={card.id} className={`number-card ${used ? "used" : ""}`} onClick={() => addNumber(card)} disabled={used || !nextNeedsNumber || recipeSolved} aria-label={`${card.name}, value ${card.value}${used ? ", used" : ""}`}><span aria-hidden="true">{card.emoji}</span><strong>{card.value}</strong><small>{card.name}</small></button>;
                  })}
                </div>

                <div className="operator-row"><div><span>2 · OPERATION SIGNS</span><h2>{nextNeedsNumber ? "Choose a number first" : "Choose an operation"}</h2></div><div>{operators.map((operator) => <button key={operator} onClick={() => addOperator(operator)} disabled={nextNeedsNumber || recipeSolved} aria-label={`Add ${operator} to expression`}>{operator}</button>)}</div></div>
              </div>

              <aside className="recipe-book" aria-label="Discovered recipes">
                <div className="book-title"><span>RECIPE BOOK</span><strong>{foundRecipes.length} discovered</strong></div>
                <div className="recipe-list">
                  {foundRecipes.length === 0 && <div className="empty-recipe"><span>☆</span><p>Your first correct expression will be saved here.</p></div>}
                  {foundRecipes.map((recipe, index) => <div className="saved-recipe" key={recipe.signature}><span>★</span><div><small>{recipe.category}</small><strong>{recipe.expression} = {order.target}</strong></div><i>+{recipe.points}</i></div>)}
                </div>
                <div className="strategy-hints"><span>TRY A NEW STRUCTURE</span><div>{["Pair", "3+ cards", "Subtract", "Multiply", "Divide", "Mixed"].map((label) => <i key={label}>{label}</i>)}</div></div>
              </aside>
            </div>

            <div className={`coach-bar ${messageTone}`}>
              <div className="coach-icon" aria-hidden="true">👩🏽‍🍳</div><div><span>CHEF MIRA SAYS</span><p>{message}</p></div>
              <div className="coach-buttons">
                {!recipeSolved && <>
                  {foundRecipes.length > 0 && <button className="secondary-button" onClick={serveOrder}>Finish exploring →</button>}
                  <button className="serve-button" onClick={checkRecipe} disabled={!tokens.length}>Check recipe</button>
                </>}
                {recipeSolved && <><button className="secondary-button" onClick={findAnotherWay}>Find another way</button><button className="serve-button" onClick={serveOrder}>Serve now →</button></>}
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
          <div className="result-stats"><div><span>Orders served</span><strong>{ordersServed} / {totalOrders}</strong></div><div><span>Best combo</span><strong>×{Math.max(bestCombo, 1)}</strong></div><div><span>Fastest recipe</span><strong>{fastestOrder ?? "—"}s</strong></div><div><span>Strategies found</span><strong>{Object.values(strategyCounts).reduce((sum, value) => sum + value, 0)}</strong></div></div>
          <div className="thinking-report"><span>YOUR THINKING REPORT</span>{topStrategies.length ? topStrategies.map(([strategy, count]) => <div key={strategy}><strong>{strategy}</strong><span>{count} recipe{count > 1 ? "s" : ""}</span></div>) : <p>Try another shift to fill your strategy report.</p>}</div>
          <div className="result-actions"><button className="secondary-button" onClick={() => setPhase("menu")}>Change mode</button><button className="primary-button" onClick={startGame}>Play again <span>↻</span></button></div>
        </section>
      )}

      <footer><span>Educational game prototype · P0 learning systems</span><span>Calculate · connect · explain</span></footer>
    </main>
  );
}
