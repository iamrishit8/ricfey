# Design system (v2 proposal)

Inspired by the owner's reference (two26.studio screenshots): warm paper, one loud colour, black
pill buttons, huge condensed capitals, rounded panels, playful motion. Ricfey's colours are **red,
green and white**. Live preview: **`/design`** (outside the app layout, with a light/dark toggle).

Status: **proposal, waiting for the owner's approval.** The tokens apply only inside
`[data-design="v2"]` (`apps/web/src/styles/design.css`), so the rest of the app is unchanged. After
approval they move into `:root` and every screen is restyled (P6-C2, P6-C3).

## Colour roles

| Token                           | Light                              | Dark                   | Used for                              |
| ------------------------------- | ---------------------------------- | ---------------------- | ------------------------------------- |
| `--background`                  | warm paper `oklch(0.967 0.014 62)` | `oklch(0.17 0.012 40)` | the page                              |
| `--card`                        | near white                         | slightly lifted dark   | cards, pills                          |
| `--foreground`                  | ink `oklch(0.16 0.01 40)`          | cream                  | text                                  |
| `--brand`                       | red `oklch(0.56 0.21 27)`          | `oklch(0.7 0.18 28)`   | main actions, links, statement fill   |
| `--brand-tint` / `--brand-soft` | red mixed into paper               | same                   | unfilled statements / selected, hover |
| `--green`                       | `oklch(0.5 0.13 155)`              | `oklch(0.75 0.14 155)` | progress, correct answers only        |
| `--pill`                        | near black                         | cream                  | the arrow button                      |

Contrast (WCAG 2 ratio, AA needs 4.5 for body text), computed from the oklch values:

| Pair                 | Light | Dark |
| -------------------- | ----- | ---- |
| text on page         | 17.6  | 16.5 |
| muted text on page   | 6.8   | 7.7  |
| button text on red   | 5.1   | 6.6  |
| red text on page     | 4.7   | 6.6  |
| button text on green | 5.5   | 9.1  |
| green text on page   | 5.1   | 9.1  |

## Type (Google Fonts)

- **Anton**: `h1` and big numbers, uppercase, line-height 0.95.
- **Bricolage Grotesque** (variable): `h2`, `h3`, statements, the wordmark.
- **Inter Tight**: everything you read, including lessons.

## Components (`apps/web/src/components/design/`)

`ArrowButton` (black pill, round red ↗ arrow, the one main action per screen) · `Pill`, `SectionLabel` ·
`Statement` (fills red word by word as it scrolls) · `Marquee` · `Faq` (pill questions, bubble answers) ·
`Squiggle` (a line that draws itself once) · `Wordmark` (giant cropped word in the red footer).

## Motion rules

Motion is decoration, never the only signal. With `prefers-reduced-motion: reduce`: the marquee stops,
the squiggle is drawn, statements are fully coloured, transitions are instant. Every control is keyboard
reachable with a visible focus ring.

## Not verified

Safari and a real phone; colour-blind simulation of red vs green (quiz states also carry ✓/✗ and words).
