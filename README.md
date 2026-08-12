# Magic Math Bakery

Magic Math Bakery is an educational web-game prototype for children aged 7–11. Players build expressions from number cards and operation signs, serve a target number, and earn extra discovery rewards for finding structurally different strategies.

## P0.1 gameplay

### Bakery Adventure

Guided shifts introduce addition, subtraction, multiplication, division, and mixed operations in stages. Players can choose 6, 10, 12, or endless orders.

### Quick Practice

Players select one or several signs from `+`, `−`, `×`, and `÷`. A single selected sign is inserted automatically; with several signs selected, the number and operation areas take turns glowing to guide the next action. Every order has an individual bonus clock.

### Oven Balance Lab

This equation-free puzzle turns equality into a physical rule. Players move ingredient clusters between two oven pans, observe the beam tilt, and use every piece to achieve balance in as few moves as possible.

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
- Custom social preview card

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Design direction

This P0.1 iteration separates arithmetic fluency from a game-first mathematical system. Future versions can add parity, making-ten, bar models, factors, patterns, enumeration, geometry, and original competition-style reasoning puzzles.

## Music license

`public/audio/first-light-particles.ogg` is a web-compressed copy of **First Light Particles** by Yoiyami, downloaded from [OpenGameArt](https://opengameart.org/node/182244). The original work is released under [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/). Attribution is not required; it is included here as a courtesy.
