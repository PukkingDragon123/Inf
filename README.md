# 🍫 Infinite Choco.co

A moody, pixel-art hustle. You take over a grimy little shop on the wrong side
of Choco-City with one **endless chocolate bar**. Pull the impossible slicing
trick to conjure free pieces, pick up **delivery jobs on your phone**, ride the
lift up the apartments, and drop orders at the right door.

**Play it:** open `index.html` in any modern browser. No build step, no
dependencies, works offline.

## How to play

Everything is run from your **phone** (tap the phone, bottom-right) — there's no
menu chrome, just the world and your device.

1. **Jobs** app → accept a delivery (e.g. *2× Milk → Maple Court 5A*).
2. **Map** app → travel to **Your Shop**.
3. **Cut the bar** — the real infinite-chocolate hack: drag the knife along the
   dotted **slant**, then the **vertical** cut, then drag the two top pieces
   into their ghost outlines. The bar reforms whole *and* an extra square pops
   out — collect it. Repeat forever. Tap a flavor chip to choose what you cut.
4. **Map** → travel to **Maple Court Apartments**, pick the floor in the lift,
   then tap the highlighted **door** to deliver and get paid.
5. **Store** → travel to the 24H convenience store, **drag products into your
   basket**, and tap the basket to pay the **cashier** — buy new flavors,
   sharper knives, and perks (insulated bag, delivery cart).

## Features

- **Diegetic phone UI** — a pixel-art phone OS (clock, app grid, status bar)
  with Map, Jobs, Store and Wallet apps; no traditional menus
- **The accurate infinite-chocolate trick** — two real drag-to-slice cuts plus
  a drag-to-rearrange step that yields the impossible extra piece
- **City map** with three locations you travel between: your shop, the store,
  and an apartment building
- **Apartment deliveries** — a lift, six floors, four doors each, with the
  target door highlighted and a pixel customer who answers
- **Convenience store** — shelves of products with custom pixel sprites, a
  drag-into-basket flow, and a cashier to pay
- **Custom pixel sprites** for customers (randomized skin/hair/outfit), the
  cashier, and every store item
- **Dark, gritty pixel-art** look: lamp-lit shop, textured surfaces, warm
  hallway lights, CRT scanlines and vignette
- Auto-save to localStorage, synthesized sound effects, mute-friendly

## Tech

Plain HTML/CSS/JS — `index.html`, `style.css`, `game.js`, plus the "Press
Start 2P" pixel font. The world is a 640×360 canvas rendered pixel-perfect; the
phone is a styled DOM overlay.

*The bar is infinite. The city is hungry. Get slicing.*
