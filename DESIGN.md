# Design system

Clean, functional, monochrome UI that makes the skip numbers readable at a glance on a phone. Tokens live in `src/app/globals.css`. Components must use the semantic Tailwind names below and must not use raw hex values or Tailwind palette colors.

## Tokens

| Token | Light | Dark | Tailwind name |
|---|---|---|---|
| surface.muted (page) | `#fafafa` | `#000000` | `bg-page` |
| surface.raised (cards) | `#ffffff` | `#0a0a0a` | `bg-raised` |
| surface.base (primary action) | `#000000` | `#ededed` | `bg-primary` / `text-on-primary` |
| text.primary | `#000000` | `#ededed` | `text-ink` |
| text.secondary | `#666666` | `#a1a1a1` | `text-muted` |
| border.default | `#eaeaea` | `#262626` | `border-line` (`border-line-strong` for hover) |
| status safe / risky / danger | green / amber / red | lighter variants | `text-safe`, `bg-safe-soft`, … |
| theory / lab markers | blue / purple | lighter variants | `text-theory`, `border-l-lab`, … |

- **Font:** Manrope (self-hosted via `next/font`), 16px base.
- **Type scale:** `text-caption` 13 · `text-small` 14 · `text-body` 16 · `text-title` 20 · `text-display` 32.
- **Spacing:** only 8 / 16 / 32px (`2`, `4`, `8` in Tailwind units).
- **Radius:** `rounded-xs` = 3px everywhere.
- **Themes:** light and dark. `<html data-theme>` is set by an inline head script before first paint, using the saved choice or else the system setting. `ThemeToggle` in the top bar switches between them and stores only that choice.
- **Motion:** 200ms for color transitions (300ms for larger changes). Motion is turned off under `prefers-reduced-motion`.

## Components

Defined as classes in `globals.css` (`.card`, `.btn*`, `.input`, `.eyebrow`) and as primitives in `src/components/ui.tsx`.

| Component | States |
|---|---|
| `.btn-primary` / `.btn-secondary` / `.btn-quiet` / `.btn-danger` | default, hover, focus-visible (global 2px ring), active, disabled (50% opacity, not-allowed cursor), loading (`aria-busy` + `Spinner`, label changes to "Reading PDF…") |
| `.input` | default, hover (stronger border), focus-visible, disabled, error (`aria-invalid` → danger border, plus a `role="alert"` message) |
| `Notice` | info, warning, error (`role="alert"`) |
| `StatusBadge` | safe, risky, danger. The label always states the status, so it never relies on color alone. |
| Skip table | Horizontal scroll inside a focusable `role="region"`, with the subject column pinned. Rows highlight on hover. Unreachable targets show ✕ plus screen-reader text. |

- **Touch targets:** buttons and inputs are at least 44px tall (`min-h-11`).
- **File upload:** a real `<button>` opens a hidden file input, so it works with keyboard, pointer and touch alike.
- **Long content:** subject names truncate. The table scrolls instead of wrapping. When there are no subjects, the upload screen is shown.

## Accessibility (WCAG 2.2 AA)

Check each of these before release:

- [ ] Every text/background pair is at least 4.5:1, including `text-muted` on `bg-page` (5.5:1).
- [ ] Every interactive element shows a visible focus ring when reached by Tab.
- [ ] Every action can be done with the keyboard alone: upload, edit, save, cancel, remove, clear, and scrolling the table.
- [ ] Status is never shown by color alone: badges have text, and ✕ has sr-only text.
- [ ] Errors are announced (`role="alert"`) and invalid inputs set `aria-invalid`.
- [ ] Nothing overflows the page horizontally at 320px width.

## Don'ts

- Don't use raw hex values or Tailwind palette classes (`slate-*`, `sky-*`, …) in components.
- Don't add spacing or font sizes outside the scales above.
- Don't write vague button labels. Name the action and its target, e.g. "Edit CT-351 or override its %".
- Don't hide or remove the focus outline.
