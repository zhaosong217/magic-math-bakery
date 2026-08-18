# Magic Math Bakery

Magic Math Bakery is an educational web-game prototype for children aged 7–11. Players build expressions from number cards and operation signs, serve a target number, and earn extra discovery rewards for finding structurally different strategies.

## P0.3 gameplay

The game opens on a **Magic Math Bakery** cartoon title screen. A gently pulsing play button leads into three icon-led modes, making the first action obvious before any instructions appear.

### Story

Story presents ten connected roadmap stops, progressing from addition and subtraction within 5 through carrying, borrowing, mental arithmetic within 100, times tables, related division, and place-value multiplication and division. Each stop contains 6–10 bakery orders. The current target stays in the first queue position with a pulsing reminder ring. After Go to next, it fades away while the remaining cards slide left and the new target takes the first slot. The orange circular control accepts Check only after a valid expression contains at least two numbers and one operation. Find another way sits beside it, and Go to next remains available as soon as the first correct solution is found. Completed dishes collect in the Recipe Book before the player submits the level, and every distinct extra solution increases that dish’s recipe count.

After completing a Story level, players can replay the same level, continue directly to the next level, or return to the Story map.

### Quick Practice

Players select one or several signs from `+`, `−`, `×`, and `÷`. When an activity offers only one sign, it is inserted automatically; with several signs, players drag the one they need. Number ingredients and operation signs can be dragged into the recipe bar on mouse or touch devices, while tapping remains available as a fallback. Every order uses no more than five number cards.

### Oven Balance Lab

This equation-free puzzle turns equality into a physical rule. Players drag ingredient clusters directly onto or between two oven pans, observe a damped beam movement, and use every piece to achieve balance in as few moves as possible. Every session begins with small fixed weights and three food groups, then grows gradually without exceeding five groups.

## Included systems

- Expression builder with standard multiplication/division precedence
- Unique number cards that can each be used once
- Multiple-solution recipe book
- Manual Story checking with clear success and retry animation
- Optional multiple-solution discovery for every Story order
- Mistake, discovery, and new-strategy scoring
- Baking, plating, delivery, customer, and coin feedback stages
- First Light Particles piano/ambient background music with procedural interaction feedback
- Sound preference saved on the current device
- Coins, combo, order progression, and animated feedback
- End-of-shift thinking report showing strategy use
- Responsive touch and keyboard-accessible controls
- Pointer-based drag and drop for tablets, touchscreens, and mouse users
- Device-local Story progress and first-use tutorial state
- Custom social preview card

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Design direction

P0.3 makes the learning path and interaction language visible before asking children to read instructions. Future versions can deepen the map with parity, bar models, factors, patterns, enumeration, geometry, and original competition-style reasoning puzzles.

## Music license

`public/audio/first-light-particles.ogg` is a web-compressed copy of **First Light Particles** by Yoiyami, downloaded from [OpenGameArt](https://opengameart.org/node/182244). The original work is released under [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/). Attribution is not required; it is included here as a courtesy.
