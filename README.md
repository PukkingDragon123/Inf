# 🍫 Infinite Choco Inc.

A polished pixel-art **incremental game** about the legendary internet
"infinite chocolate" trick — cut a 6×4 chocolate bar *just right*, slide the
pieces back together, and somehow… there's a piece left over. Forever.

**Play it:** just open `index.html` in any modern browser. No build step, no
dependencies, works offline.

## How to play

1. **Do the trick** — drag the knife along the dotted lines (two cuts), then
   click the bar to rearrange the pieces. An impossible extra piece pops out.
   Grab it.
2. **Process** — melt 4 pieces into a chocolate bar, wrap 2 bars into a gift
   box. Fancier product = fancier price.
3. **Sell** — customers walk into your shop and ask for specific things:
   loose pieces, bars, gift boxes, specific flavors. Click a customer to serve
   them while their patience lasts. Fast service = big tips.
4. **Upgrade** — sharper knives, magic hands, choco-bots, marketing, and hire
   animal **employees** (melter helper, wrapper helper, cashier) to automate
   the shop; unlock seven chocolate flavors from Milk all the way to Golden.
5. **Goal** — earn **$1,000,000** and become the Chocolate Mogul.

## Features

- The actual infinite chocolate illusion, animated: slant cut → second cut →
  piece swap → the bar re-forms whole *and* drops a bonus square, with a flashy
  magic burst (ring shockwave + spinning stars) every time
- **Zootopia-style animal townsfolk**: every customer is a fox, rabbit, bear,
  cat, panda, pig, frog, or mouse — in clothes, with ears, muzzles and tails.
  Grandmas (glasses) pay double; rare top-hat **VIPs** pay triple with a golden
  aura + confetti; a **serve-streak combo** stacks a growing tip bonus
- A bear **shopkeeper** behind the counter and hireable **employees**: Pippa
  the mouse runs the melter, Benny the rabbit wraps boxes, Nadia the fox cashier
  auto-serves — plus choco-bots that do the trick for you
- **Cookie-Clicker-style upgrade panel**: 15 upgrades each with a custom
  pixel-art icon, tier badges (I/II/III/MAX) with tier-colored accents and
  glowing buy buttons; a **flavor shelf** of 7 recipes with price multipliers
- A stocked convenience-store display shelf (jars, bars, gift boxes, bottles,
  a SALE tag); production chain pieces → bars → gift boxes
- Juicy feedback: bouncy purchases, HUD number pops, pulsing "ready" buttons,
  screen shake, particles, floating numbers
- All pixel art drawn procedurally in code — zero image assets
- Synthesized sound effects (WebAudio), mute toggle
- Auto-save to localStorage + offline progress (your bots keep working up to 4h)
- Tutorial, screen shake, particles, floating numbers, and other juice

## Tech

Plain HTML/CSS/JS — `index.html`, `style.css`, `game.js`, plus the
"Press Start 2P" font ([OFL license](https://fonts.google.com/specimen/Press+Start+2P/license)).
Canvas is 640×360 logical pixels upscaled with `image-rendering: pixelated`.

*The chocolate is infinite. Do not question the chocolate.*
