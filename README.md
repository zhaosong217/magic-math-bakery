# Magic Math Bakery

Magic Math Bakery is an educational web-game prototype for children aged 7–11. Players build expressions from number cards and operation signs, serve a target number, and earn extra discovery rewards for finding structurally different strategies.

## P0 gameplay

### Bakery Adventure

Eight guided orders introduce addition, subtraction, multiplication, division, and mixed operations in stages.

### Quick Practice

Players choose `+`, `−`, `×`, `÷`, or mixed operations. Every order has an individual bonus clock: early answers earn more coins, while correct overtime answers still receive credit.

### Number Lab

One valid recipe is enough to serve an order, but players may continue exploring. The recipe book recognises different structures, ignores commutative duplicates such as `4 + 8` and `8 + 4`, and awards bonuses for new strategy categories.

## Included systems

- Expression builder with standard multiplication/division precedence
- Unique number cards that can each be used once
- Multiple-solution recipe book
- Per-order time, mistake, discovery, and new-strategy scoring
- Procedural Web Audio background melody and interaction feedback
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

This P0 iteration separates arithmetic fluency from flexible number thinking. Future versions can add parity, making-ten, bar models, factors, patterns, enumeration, geometry, and original competition-style reasoning puzzles.
