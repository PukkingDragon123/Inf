# 🍫 Infinite Choco.co

A cute, hands-on chocolatier game. You rent a tiny run-down shop with nothing
but a **knife**, a **cutting board**, and one **endless block of chocolate**.
Cut it by hand, melt it in a pot, fill the order notes, and grow from a
one-person stall into an automated chocolate empire.

**Play it:** open `index.html` in any modern browser. No build step, no
dependencies, works offline.

## How to play

1. **Cut** — with the 🔪 knife selected, swipe across the big chocolate block
   to shave off pieces. They tumble onto the counter with real physics.
2. **Cook** — switch to the ✋ hand, drag pieces into the pot, then click the
   **HEAT** knob to turn up the burner. When the chocolate boils and fully
   melts, hit **POUR** to set it into bars (of the flavor you picked).
3. **Fill the order** — the pinned note asks for pieces and/or bars. When the
   checklist is complete, hit **Deliver ✔** for cash.
4. **Upgrade** — visit the 🏪 **Store** for new flavors, sharper knives, and
   kitchen gear (bigger pot, hotter burner).
5. **Automate** — open the 💻 **Computer** and browse `hire.choco.co` to hire
   staff: **Pippa** the mouse chops, **Cocoa** the bear cooks, **Nadia** the
   fox delivers — so the shop runs itself.

## Features

- **Physics-based cutting**: swipe the knife, watch glossy chocolate pieces
  bounce, pile, and get dragged/thrown around the counter
- **Real cooking**: drop pieces in the pot, crank the heat, watch it boil with
  flames, bubbles and steam, then pour molten chocolate into bars
- **Order notes** on pinned paper with live checklists and rewards
- **Convenience store**: 6 flavors (Milk → Gold, escalating value), 4 knives,
  and kitchen-gear upgrades, each with a rendered icon
- **Hiring website**: a little in-game browser where you hire animal employees
  who automate cutting, cooking and delivery
- **Glossy, rounded, "3D-ish" art**: gradient shading, soft shadows, a
  metallic pot, a real dial knob, coins, bubbles — all drawn in code
- Auto-save to localStorage, sound effects (WebAudio), mute toggle

## Tech

Plain HTML/CSS/JS — `index.html`, `style.css`, `game.js`, plus the rounded
"Baloo 2" font ([OFL license](https://fonts.google.com/specimen/Baloo+2/license)).
The kitchen is a 900×560 canvas; the store and computer are HTML/CSS screens.

*The block is infinite. The shop is yours. Get cutting.*
