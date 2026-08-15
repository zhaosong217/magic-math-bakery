# Magic Math Bakery

Magic Math Bakery is an educational web-game prototype for children aged 7–11. Players build expressions from number cards and operation signs, serve a target number, and earn extra discovery rewards for finding structurally different strategies.

## P0.2 gameplay

The game opens on a **Math Garden** cartoon title screen. A gently pulsing play button leads into the main journey, making the first action obvious before any mode or instructions appear.

### Bakery Adventure

After the title screen, players first choose Journey, Practice, or Balance. Journey then opens its own visual roadmap, where every colourful unlocked stop starts directly when tapped. The beginner chapter uses addition and subtraction only. First-time players receive a four-step interactive recipe tutorial.

### Quick Practice

Players select one or several signs from `+`, `−`, `×`, and `÷`. Number ingredients and operation signs can be dragged into the recipe bar on mouse or touch devices, while tapping remains available as a fallback. Every order has an individual bonus clock and no more than five number cards.

### Oven Balance Lab

This equation-free puzzle turns equality into a physical rule. Players drag ingredient clusters directly onto or between two oven pans, observe a damped beam movement, and use every piece to achieve balance in as few moves as possible. Every session begins with small fixed weights and three food groups, then grows gradually without exceeding five groups.

## Included systems

- Expression builder with standard multiplication/division precedence
- Unique number cards that can each be used once
- Multiple-solution recipe book
- Per-order time, mistake, discovery, and new-strategy scoring
- Baking, plating, delivery, customer, and coin feedback stages
- First Light Particles piano/ambient background music with procedural interaction feedback
- Sound preference saved on the current device
- Coins, combo, order progression, and animated feedback
- End-of-shift thinking report showing strategy use
- Responsive touch and keyboard-accessible controls
- Pointer-based drag and drop for tablets, touchscreens, and mouse users
- Device-local adventure progress and first-use tutorial state
- Custom social preview card

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Design direction

P0.2 makes the learning path and interaction language visible before asking children to read instructions. Future versions can deepen the map with parity, making-ten, bar models, factors, patterns, enumeration, geometry, and original competition-style reasoning puzzles.

## Music license

`public/audio/first-light-particles.ogg` is a web-compressed copy of **First Light Particles** by Yoiyami, downloaded from [OpenGameArt](https://opengameart.org/node/182244). The original work is released under [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/). Attribution is not required; it is included here as a courtesy.
