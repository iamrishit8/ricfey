# Design directions (proposal)

The first proposal (one direction, Anton + Bricolage, mostly red/green/white) was judged too plain
by the owner on 2026-10-28: "be more creative with font, styling, UI, more graphics, more colour".
This proposal offers **three complete directions** on one page, so the owner can pick by looking.

Live: **`/design?d=sticker`**, **`?d=poster`**, **`?d=garden`** (a switcher at the bottom of the
page; light and dark with the moon). Nothing outside `/design` uses these styles yet.

|              | A · Sticker Club                                       | B · Big Poster                                 | C · Soft Garden                             |
| ------------ | ------------------------------------------------------ | ---------------------------------------------- | ------------------------------------------- |
| Feel         | playful, outlined, hand-made                           | loud, editorial, graphic                       | warm, soft, organic                         |
| Headlines    | Bagel Fat One                                          | Unbounded 900, capitals                        | Fraunces (soft, wonky)                      |
| Accent words | same face                                              | Instrument Serif italic                        | Fraunces italic                             |
| Body         | DM Sans                                                | Instrument Sans                                | Outfit                                      |
| Handwriting  | Caveat                                                 | (serif italic)                                 | Gochi Hand                                  |
| Colour       | tomato red, grass green, butter, bubblegum, sky        | red, forest green, orange, lilac, black blocks | coral, deep leaf green, lemon, peach, lilac |
| Edges        | 3px ink outlines, hard offset shadows, tilted stickers | flat colour blocks, square corners             | very round, soft green shadows              |

Red and green stay the core in every direction (main action, brand word, progress); the other colours
are for graphics, cards and packs.

## What is on the page (same structure in all three)

Header with pills and the credit balance · hero with a fanned stack of course cards, a "100 free
credits" burst, stickers and a handwritten note · two crossing marquees · how it works (4 numbered
steps on a self-drawing line) · a statement that fills red as you scroll · gallery cards with
textures (dots, checker, stripes) and icons · the chat, a quiz with right/wrong states, and progress
bars with a streak burst · five credit packs ("best value" burst) · FAQ pills · red footer with a
giant wordmark.

## Graphics

Hand-made SVG in `apps/web/src/components/design/graphics.tsx`: `Burst` (badge with text), `Flower`,
`Sparkle`, `Smiley`, `Star`, `Blob`, `CurvedArrow`, `Squiggle` (draws itself), `Spiral`, `Book`. They take
their fill from the direction's colours and their outline from its ink, so they follow the look and
dark mode. Textures are CSS (`dz-dots`, `dz-checker`, `dz-stripes`, `dz-grain`). No photos to license.

## Rules kept in every direction

- Body text passes WCAG AA (4.5:1) in light and dark; checked from the oklch values. Text on the bright
  fills always uses a fixed dark ink (`--on-c`), on Poster's black block a fixed cream (`--on-c5`).
  Sticker Club's red is used as text only in big headlines (large text: 3.6:1 ≥ 3:1).
- Quiz states never rely on colour alone (✓ / ✗ and a word).
- Motion (marquee, float, spin, self-drawing line, hover tilt) stops with "reduce motion".
- Keyboard focus shows a red outline.
- No horizontal overflow at 390px and 1280px (checked with `bun run shot`).

## Code

Tokens per direction and shared `dz-*` classes: `apps/web/src/styles/design.css` (the classes live in
the components layer so Tailwind utilities still win). Page: `apps/web/src/pages/design.tsx`. Parts:
`components/design/parts.tsx` (`ArrowButton`, `Chip`, `SectionLabel`, `Statement`, `Marquee`, `Faq`).

## After the owner chooses

The chosen direction's tokens move to `:root`, the fonts of the other two are dropped, and every screen
is restyled with these parts (landing page, chat, roadmap and buy, day, quiz, progress, gallery, credits).

Not verified: Safari, a real phone, colour-blind simulation.
