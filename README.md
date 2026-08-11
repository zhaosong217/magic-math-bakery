# Magic Math Bakery

A small educational game prototype for children aged 6–9. Customers ask for a lucky number, and the player combines ingredient cards until their values equal that target.

## Game design goals

- Make number composition the core mechanic, not a quiz layered on top of a game.
- Give contextual feedback such as “you still need 3” instead of only right/wrong.
- Introduce complexity gradually across eight short orders.
- Reward experimentation with coins, combo bonuses, animation, and friendly coaching.

## Features

- Eight procedurally generated, always-solvable orders
- Addition targets from 6 to 20
- Adaptive hints after repeated mistakes
- Real-time difference feedback
- Score, combo, timer, and end-of-round summary
- Responsive touch and keyboard-friendly controls
- No accounts, ads, tracking, or external APIs

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Prototype scope

This was designed as a one-day Game Design Intern portfolio prototype. A future iteration could add subtraction recipes, teacher-selected difficulty, sound effects, and an optional AI tutor that generates age-appropriate hints without revealing the answer.
