# Design system

Inkest has one quiet, Markdown-first product language across its authenticated
workspace and public marketing pages. It is implemented in
[`src/app/globals.css`](../src/app/globals.css), with primitives in
[`src/components/ui`](../src/components/ui). Use semantic tokens and shared
patterns before introducing a new color, shadow, radius, or transition.

## Foundations

| Concern | Standard |
| --- | --- |
| Color | `background`, `foreground`, `card`, `muted`, `border`, `primary`, `destructive`, plus `success` and `warning` for feedback. All have light and dark values. |
| Typography | Geist for interface text, Geist Mono for labels/metadata, Lora for editorial emphasis, and Vazirmatn fallback for RTL content. Users may select the bundled clean sans, editorial serif, or Persian-friendly writing font without changing type scale or spacing. |
| Shape and elevation | Controls use the UI primitive radius; durable surfaces use `rounded-2xl` with the restrained `surface-card` shadow. |
| Spacing | Routes use `app-page` or `app-page-wide`; cards use their primitive spacing or a `p-4`/`p-5` interior. |
| Motion | Interaction transitions are short and limited to color, shadow, and small transforms. Every new motion treatment must honor `prefers-reduced-motion`. |

## Reusable patterns

- Use the UI `Button`, `Badge`, `Card`, `Dialog`, `Input`, `Select`, and
  `Skeleton` primitives rather than rebuilding their base states.
- Use `surface-card` for static grouped content, `surface-card-interactive`
  for navigable cards, and `surface-card-dashed` for empty or setup states.
- Use `notice notice-success` and `notice notice-warning` for feedback that
  needs a semantic outcome. Errors use the existing destructive primitive.
- Use `section-label` for compact section headings and `app-canvas` for the
  authenticated workspace background. Do not use fixed light-palette utility
  colors for feedback, because they do not adapt with the theme.

## Intentional exceptions

The marketing route has an editorial paper/graphite/green palette scoped below
`.marketing-site`. It shares typography, rounded geometry, motion constraints,
and accessibility rules with the application while retaining a distinct public
storytelling tone. AI affordances use the scoped `--ai-*` gradient tokens, and
the focus reader deliberately uses a high-contrast dark overlay for reading.
These are product-specific surfaces, not alternatives to the shared application
theme.

## Appearance choices

Settings offers system/light/dark mode and the Paper, Forest, and Violet
palettes. Palette overrides remain semantic-token based, so controls, focus
states, editor/preview surfaces, and marketing routes retain their contrast
relationships. The preference is stored with the authenticated user's settings;
the top-bar theme menu updates the same preference.

## Review checklist

- Verify light and dark themes, keyboard focus, RTL text, and reduced motion.
- Prefer a named token or pattern; document any necessary new exception here.
- Keep empty, loading, error, and success states visually related to their
  surrounding route.
