"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Ingredient = {
  id: number;
  value: number;
  emoji: string;
  name: string;
};

type Order = {
  target: number;
  ingredients: Ingredient[];
  solutionValues: number[];
  customer: string;
  request: string;
};

const TOTAL_ORDERS = 8;
const ROUND_SECONDS = 100;
const ingredientStyles = [
  { emoji: "🍓", name: "strawberry" },
  { emoji: "🫐", name: "blueberry" },
  { emoji: "🍪", name: "cookie" },
  { emoji: "🍫", name: "chocolate" },
  { emoji: "🍒", name: "cherry" },
  { emoji: "🍬", name: "candy" },
];

const customers = ["Milo", "Luna", "Pip", "Nora", "Theo"];
const requests = [
  "A sparkle cake, please!",
  "Can you make my lucky number?",
  "I need a perfectly balanced treat!",
  "Something sweet for my adventure!",
  "A number-perfect dessert, chef!",
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

function makeParts(target: number, count: number) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const parts: number[] = [];
    let remaining = target;
    for (let i = 0; i < count - 1; i += 1) {
      const slotsLeft = count - i - 1;
      const min = Math.max(1, remaining - slotsLeft * 9);
      const max = Math.min(9, remaining - slotsLeft);
      const part = randomInt(min, max);
      parts.push(part);
      remaining -= part;
    }
    parts.push(remaining);
    if (parts.every((part) => part >= 1 && part <= 9)) return parts;
  }
  return count === 2 ? [Math.floor(target / 2), Math.ceil(target / 2)] : [4, 5, target - 9];
}

function createOrder(round: number): Order {
  const isEarly = round <= 2;
  const isMiddle = round <= 5;
  const target = isEarly
    ? randomInt(6, 10)
    : isMiddle
      ? randomInt(10, 15)
      : randomInt(15, 20);
  const partCount = isEarly ? 2 : isMiddle ? randomInt(2, 3) : 3;
  const solutionValues = makeParts(target, partCount);
  const optionCount = isEarly ? 5 : 6;
  const values = [...solutionValues];

  while (values.length < optionCount) {
    let candidate = randomInt(1, 9);
    let guard = 0;
    while (values.includes(candidate) && guard < 10) {
      candidate = randomInt(1, 9);
      guard += 1;
    }
    values.push(candidate);
  }

  const ingredients = shuffle(values).map((value, index) => ({
    id: round * 10 + index,
    value,
    ...ingredientStyles[index % ingredientStyles.length],
  }));

  return {
    target,
    ingredients,
    solutionValues,
    customer: customers[(round - 1) % customers.length],
    request: requests[(round - 1) % requests.length],
  };
}

export default function Home() {
  const [phase, setPhase] = useState<"intro" | "playing" | "finished">("intro");
  const [round, setRound] = useState(1);
  const [order, setOrder] = useState<Order>(() => createOrder(1));
  const [selected, setSelected] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [message, setMessage] = useState("Choose ingredients that add up to the order.");
  const [messageTone, setMessageTone] = useState<"neutral" | "good" | "try">("neutral");
  const [celebrating, setCelebrating] = useState(false);

  const selectedIngredients = useMemo(
    () => order.ingredients.filter((ingredient) => selected.includes(ingredient.id)),
    [order.ingredients, selected],
  );
  const currentSum = selectedIngredients.reduce((sum, ingredient) => sum + ingredient.value, 0);
  const difference = order.target - currentSum;

  const finishGame = useCallback(() => {
    setPhase("finished");
    setCelebrating(false);
  }, []);

  useEffect(() => {
    if (phase !== "playing" || celebrating) return;
    const timer = window.setInterval(() => {
      setTimeLeft((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          window.setTimeout(finishGame, 0);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [celebrating, finishGame, phase]);

  function startGame() {
    setRound(1);
    setOrder(createOrder(1));
    setSelected([]);
    setScore(0);
    setCombo(0);
    setBestCombo(0);
    setMistakes(0);
    setTimeLeft(ROUND_SECONDS);
    setMessage("Choose ingredients that add up to the order.");
    setMessageTone("neutral");
    setPhase("playing");
  }

  function toggleIngredient(id: number) {
    if (celebrating) return;
    const next = selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id];
    setSelected(next);
    setMessageTone("neutral");
    const nextSum = order.ingredients
      .filter((ingredient) => next.includes(ingredient.id))
      .reduce((sum, ingredient) => sum + ingredient.value, 0);
    if (nextSum > order.target) {
      setMessage(`Oops — that is ${nextSum - order.target} too many. Try taking one away.`);
      setMessageTone("try");
    } else if (nextSum === order.target) {
      setMessage("Perfect total! Serve it while it’s sparkling.");
      setMessageTone("good");
    } else {
      setMessage(next.length ? `Almost there — you still need ${order.target - nextSum}.` : "Choose ingredients that add up to the order.");
    }
  }

  function submitOrder() {
    if (!selected.length || celebrating) return;
    if (currentSum === order.target) {
      const nextCombo = combo + 1;
      const points = 100 + Math.max(0, nextCombo - 1) * 25;
      setScore((value) => value + points);
      setCombo(nextCombo);
      setBestCombo((value) => Math.max(value, nextCombo));
      setMessage(`Brilliant! +${points} coins`);
      setMessageTone("good");
      setCelebrating(true);
      window.setTimeout(() => {
        if (round >= TOTAL_ORDERS) {
          finishGame();
        } else {
          const nextRound = round + 1;
          setRound(nextRound);
          setOrder(createOrder(nextRound));
          setSelected([]);
          setMistakes(0);
          setMessage("New order! What combination will you try?");
          setMessageTone("neutral");
          setCelebrating(false);
        }
      }, 900);
      return;
    }

    const nextMistakes = mistakes + 1;
    setMistakes(nextMistakes);
    setCombo(0);
    setMessageTone("try");
    if (nextMistakes >= 2) {
      const missing = order.target - currentSum;
      const helpful = order.ingredients.find(
        (ingredient) => !selected.includes(ingredient.id) && ingredient.value === missing,
      );
      setMessage(
        helpful
          ? `Chef hint: you need ${missing} more. Look for the ${helpful.name}.`
          : `Chef hint: try making ${order.solutionValues.slice(0, -1).join(" + ")} first, then see what is missing.`,
      );
    } else {
      setMessage(difference > 0 ? `Not quite — the plate needs ${difference} more.` : `Too much magic! Remove ${Math.abs(difference)}.`);
    }
  }

  const progress = (round / TOTAL_ORDERS) * 100;

  return (
    <main className="game-shell">
      <div className="cloud cloud-one" />
      <div className="cloud cloud-two" />
      <header className="brand-bar">
        <div className="brand-mark" aria-hidden="true">✦</div>
        <div>
          <p className="eyebrow">NUMBER QUEST</p>
          <h1>Magic Math Bakery</h1>
        </div>
        <div className="sound-pill" aria-label="Sound effects are represented visually">♪ Magic on</div>
      </header>

      {phase === "intro" && (
        <section className="intro-card" aria-labelledby="intro-title">
          <div className="intro-copy">
            <p className="section-kicker">Today’s mini mission</p>
            <h2 id="intro-title">Bake the number.<br />Make someone smile.</h2>
            <p className="intro-description">
              Each customer has a lucky number. Pick tasty ingredients whose values add up to it —
              then serve your perfectly balanced treat.
            </p>
            <div className="how-to-play">
              <div><span>1</span><p><strong>Read</strong> the target</p></div>
              <div><span>2</span><p><strong>Combine</strong> ingredients</p></div>
              <div><span>3</span><p><strong>Serve</strong> the exact total</p></div>
            </div>
            <button className="primary-button" onClick={startGame}>Open the bakery <span>→</span></button>
            <p className="tiny-note">8 orders · about 2 minutes · ages 6–9</p>
          </div>
          <div className="bakery-scene" aria-hidden="true">
            <div className="sun">✦</div>
            <div className="shop-sign">MAGIC<br /><strong>BAKERY</strong></div>
            <div className="awning"><i /><i /><i /><i /><i /></div>
            <div className="shop-window">
              <div className="cake cake-one">🍰</div>
              <div className="cake cake-two">🧁</div>
              <div className="counter" />
            </div>
            <div className="door"><span>OPEN</span></div>
            <div className="plant">🌿</div>
          </div>
        </section>
      )}

      {phase === "playing" && (
        <section className={`play-area ${celebrating ? "is-celebrating" : ""}`} aria-live="polite">
          <div className="hud">
            <div className="hud-stat"><span>COINS</span><strong>★ {score}</strong></div>
            <div className="progress-wrap">
              <div className="progress-label"><span>ORDER {round} OF {TOTAL_ORDERS}</span><span>{Math.round(progress)}%</span></div>
              <div className="progress-track"><div style={{ width: `${progress}%` }} /></div>
            </div>
            <div className="hud-stat timer"><span>TIME</span><strong>◷ {timeLeft}s</strong></div>
          </div>

          <div className="order-stage">
            <div className="customer-card">
              <div className="customer-face" aria-hidden="true">{["🧒🏽", "👧🏻", "👦🏾", "👧🏼", "🧒🏻"][(round - 1) % 5]}</div>
              <div><span>CUSTOMER</span><strong>{order.customer}</strong></div>
            </div>
            <div className="speech-bubble">
              <p>{order.request}</p>
              <div className="target-line">Make my treat equal <strong>{order.target}</strong></div>
            </div>
            <div className={`combo-badge ${combo > 1 ? "active" : ""}`}><span>COMBO</span><strong>×{Math.max(combo, 1)}</strong></div>
          </div>

          <div className="workbench">
            <div className="plate-zone">
              <div className="sum-copy">
                <span>YOUR PLATE</span>
                <strong>{selectedIngredients.length ? selectedIngredients.map((item) => item.value).join(" + ") : "Pick a card"}</strong>
              </div>
              <div className={`sum-orb ${difference === 0 ? "exact" : difference < 0 ? "over" : ""}`}>
                <span>TOTAL</span><strong>{currentSum}</strong>
              </div>
              <div className="difference-copy">
                {difference > 0 && <><span>STILL NEED</span><strong>+{difference}</strong></>}
                {difference === 0 && <><span>PERFECT!</span><strong>✓</strong></>}
                {difference < 0 && <><span>TOO MANY</span><strong>{Math.abs(difference)}</strong></>}
              </div>
            </div>

            <div className="ingredient-section">
              <div className="section-heading">
                <div><span>INGREDIENT SHELF</span><h2>Choose your number cards</h2></div>
                <button className="text-button" onClick={() => { setSelected([]); setMessage("Plate cleared. Try a fresh combination!"); setMessageTone("neutral"); }}>Clear plate</button>
              </div>
              <div className="ingredient-grid">
                {order.ingredients.map((ingredient) => {
                  const isSelected = selected.includes(ingredient.id);
                  return (
                    <button
                      key={ingredient.id}
                      className={`ingredient-card ${isSelected ? "selected" : ""}`}
                      onClick={() => toggleIngredient(ingredient.id)}
                      aria-pressed={isSelected}
                      aria-label={`${ingredient.name}, value ${ingredient.value}${isSelected ? ", selected" : ""}`}
                    >
                      <span className="ingredient-emoji" aria-hidden="true">{ingredient.emoji}</span>
                      <span className="ingredient-value">{ingredient.value}</span>
                      <span className="ingredient-name">{ingredient.name}</span>
                      <span className="check-mark">✓</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={`coach-bar ${messageTone}`}>
              <div className="coach-icon" aria-hidden="true">👩🏽‍🍳</div>
              <div><span>CHEF MIRA SAYS</span><p>{message}</p></div>
              <button className="serve-button" onClick={submitOrder} disabled={!selected.length || celebrating}>
                {celebrating ? "Served! ✦" : "Serve order"}
              </button>
            </div>
          </div>
          {celebrating && <div className="sparkles" aria-hidden="true"><i>✦</i><i>★</i><i>✧</i><i>✦</i><i>★</i></div>}
        </section>
      )}

      {phase === "finished" && (
        <section className="result-card" aria-labelledby="result-title">
          <div className="result-stars" aria-hidden="true">✦ ★ ✦</div>
          <p className="section-kicker">Bakery closed — great work!</p>
          <h2 id="result-title">You made the numbers sparkle.</h2>
          <div className="score-medal"><span>TOTAL COINS</span><strong>{score}</strong></div>
          <div className="result-stats">
            <div><span>Orders served</span><strong>{Math.min(round, TOTAL_ORDERS)} / {TOTAL_ORDERS}</strong></div>
            <div><span>Best combo</span><strong>×{Math.max(bestCombo, 1)}</strong></div>
            <div><span>Math skill</span><strong>{score >= 900 ? "Master Chef" : score >= 600 ? "Star Baker" : "Brave Baker"}</strong></div>
          </div>
          <p className="result-note">Every number can be built in more than one way. Try again and find a new recipe!</p>
          <button className="primary-button" onClick={startGame}>Play another round <span>↻</span></button>
        </section>
      )}

      <footer><span>Designed as a one-day educational game prototype</span><span>Build numbers · learn through play</span></footer>
    </main>
  );
}
