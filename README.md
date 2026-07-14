# 🍫 Infinite Choco.co

A warm, hand-illustrated cartoon hustle (think *Dave the Diver* energy — smooth
shapes, bold outlines, expressive **animal** townsfolk). You take over a little
corner shop in Choco-City with one **endless chocolate bar**. Pull the
impossible slicing trick to conjure free pieces, pick up **delivery jobs on
your phone**, ride the lift up the apartments, and drop orders at the right
door — where a chatty critter answers.

**Play it:** open `index.html` in any modern browser. No build step, no
dependencies, works offline.

## How to play

Everything is run from your **phone** (tap the phone, bottom-right) — there's no
menu chrome, just the world and your device.

1. **Jobs** app → accept a delivery (e.g. *2× Dark bar + Sprinkles → Maple Court 5A*).
2. **Map** app → travel to **Your Shop**.
3. **Cut the bar** — the real infinite-chocolate hack: drag the knife along the
   dotted **slant**, then the **vertical** cut, then drag the two top pieces
   into their ghost outlines. The bar reforms whole *and* an extra square pops
   out. Repeat for as many **pieces** as you need.
4. **Cook** — tap **COOK** to flip to the kitchen: **drag pieces** (with real
   physics — they bounce and pile) into the **melting pot**, tap the pot to
   **pour** a bar into the **mold**, then **drag a topping** jar onto it to
   match the order. Tap the bar to finish it.
5. **Map** → travel to **Maple Court Apartments**, pick the floor in the lift,
   then tap the highlighted **door** to deliver and get paid.
6. **Store** → the 24H shop: **drag products into your basket** and tap it to
   pay the **cashier** — buy flavors, sharper knives, and perks.
7. **Recipes** app → a little recipe book with the full craft chain, topping
   list, and your current order's target.

## Features

- **Diegetic phone UI** — a pixel-art phone OS (clock, app grid, status bar)
  with Map, Jobs, Store and Wallet apps; no traditional menus
- **The accurate infinite-chocolate trick** — two real drag-to-slice cuts plus
  a drag-to-rearrange step that yields the impossible extra piece
- **Physics crafting** — cut pieces become bouncy draggable tokens you drop
  into a melting pot, pour into a mold, and sprinkle with toppings
  (sprinkles / hazelnuts / sea salt) to make finished bar combos to order
- **Recipe book** app + contextual **interactive tutorial** hints
- **City map** with three locations you travel between: your shop, the store,
  and an apartment building
- **Apartment deliveries** — a lift, six floors, four doors each, with the
  target door highlighted and a pixel customer who answers
- **Convenience store** — shelves of products with custom pixel sprites, a
  drag-into-basket flow, and a cashier to pay
- **Illustrated animal characters** — fox, cat, bear, rabbit, pig, frog, deer,
  panda, each drawn with bold outlines, gradient shading and big expressive
  eyes; full-body at the door and head-and-shoulders **portraits** in dialogue
- **Dialogue** — customers greet you when you deliver, the shop cashier chats
  when you buy; portrait + name + a typed line, tap to continue
- **Smooth, polished cartoon look** (not pixel): hi-res canvas, a rounded
  display font, soft gradients and drop shadows; a sunlit shop with a window,
  plants, a sleeping cat and a pendant lamp; a stocked wooden store rack; a
  cozy apartment corridor with a carpet runner, sconces and framed art
- Auto-save to localStorage, synthesized sound effects, mute-friendly

## Tech

Plain HTML/CSS/JS — `index.html`, `style.css`, `game.js`, plus the "Press
Start 2P" pixel font. The world is a 640×360 canvas rendered pixel-perfect; the
phone is a styled DOM overlay.

*The bar is infinite. The city is hungry. Get slicing.*
