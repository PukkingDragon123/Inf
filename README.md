# 🍫 Infinite Choco — Street Hustle

Chocolate is **illegal**. You run a back-alley **lab** with the one thing the
law can't explain — an **endless chocolate bar**. Pull the impossible slicing
trick to conjure free product, cook it down, take **drops** on your burner
phone, slip up the Towers to hand off at the right door — and stay one step
ahead of the **cops** as your **heat** climbs. A grimy, pixel-filtered,
Schedule-I-flavored spin on the viral infinite-chocolate trick.

**Play it:** open `index.html` in any modern browser. No build step, no
dependencies, works offline.

## How to play

Everything runs from your **burner phone** (tap it, bottom-right) — no menu
chrome, just the block and your device.

1. **Drops** app → take a run (e.g. *2× Dark bar + Sprinkles → Maple Court 5A*).
2. **Map** app → head to **The Lab**.
3. **Cut the bar** — the real infinite-chocolate hack: drag the blade along the
   dotted **slant**, then the **vertical** cut, then slide the two top pieces
   into their ghost outlines. The bar reforms whole *and* an extra square drops
   out. Repeat for as many **pieces** as you need.
4. **Cook** — tap **COOK** to flip to the kitchen: **drag pieces** (real
   physics — they bounce and pile) into the **melting pot**, tap it to **pour**
   a bar into the mold, then **drag a topping** jar on to match the order. Tap
   the bar to finish it.
5. **Map** → slip into **Maple Court Towers**, pick a floor in the lift, then
   knock the highlighted **door** to hand off and get paid.
6. **Plug** → the corner store: **drag product into your basket** and pay the
   clerk — new flavors, sharper blades, and perks.
7. **Heat** app → watch your **wanted level**, and **lay low** at a safehouse
   to cool off when things get loud.

## Staying free (the heat system)

- Every **drop** turns up your **HEAT** (shown top-right, with a 0–5 star
  wanted level).
- Run too hot (~35+) and the **law** may be waiting behind the door. When you
  get **BUSTED**, pick your way out:
  - **Grease him** — pay the cop off; the drop still goes through.
  - **Stash & run** — bail on the drop, but cool the heat right down.
  - **Talk it out** — risky; talk your way clear, or eat a fine and lose the
    drop.
- Heat cools slowly on its own, or instantly (for a price) via **Lay low** on
  the Heat app.

## Features

- **Diegetic burner-phone UI** — a dark phone OS (clock, app grid, status bar)
  with Map, Drops, Plug, Recipes, Heat and Wallet apps; no traditional menus
- **The accurate infinite-chocolate trick** — two real drag-to-slice cuts plus
  a drag-to-rearrange step that yields the impossible extra piece
- **Physics crafting** — cut pieces become bouncy draggable tokens you drop
  into a **rounded, polished melting pot**, pour into a mold, and cut with
  toppings (sprinkles / hazelnuts / sea salt) to fill bar combos to order
- **Police & wanted system** — a HEAT meter, a stern K-9 officer, and a
  bribe / run / talk **bust choice** event with sirens and red-and-blue flash
- **Pixel-art post filter** — the smooth illustrated art is rendered, then
  downsampled and nearest-neighbour upscaled for a chunky retro look, under a
  cool, dark street color grade
- **City map** with three spots you travel between: your lab, the corner store,
  and the Towers
- **Apartment drops** — a lift, six floors, four doors each, target door
  highlighted, with a pixel client (or a cop) who answers
- **Corner store** — shelves of product with custom pixel sprites, a
  drag-into-basket flow, and a clerk to pay
- **Illustrated animal characters** — fox, cat, bear, rabbit, pig, frog, deer,
  panda, each with bold outlines, gradient shading and big expressive eyes;
  full-body at the door and head-and-shoulders **portraits** in dialogue
- **Dialogue** — clients greet you when you drop, the plug chats when you buy;
  portrait + name + a typed line, tap to continue
- **Juicy, bouncy feedback** — coin bursts on payout, screen shake, squishy
  physics tokens, a bouncy POUR button, cash-chip pops, and the bust flash
- Auto-save to localStorage, synthesized sound effects (incl. a siren),
  mute-friendly

## Tech

Plain HTML/CSS/JS — `index.html`, `style.css`, `game.js`, plus the rounded
"Baloo 2" display font. The world is a 640×360 canvas rendered at 2×, then run
through an in-canvas pixel-art downscale/upscale filter; the phone is a styled
DOM overlay drawn crisp on top.

*The bar is infinite. The block is hungry. The cops are watching. Get slicing.*
