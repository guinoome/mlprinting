# Digital and print identity

Digital invitations and print files share one semantic design identity while retaining independent renderers.

`resolveDesignIdentity()` resolves the invitation's approved theme, typography, background, and decorative slugs. Its screen side supplies authored RGB/CSS values and font stacks; its print side supplies authored CMYK values and the typography slug used for licensed embedded fonts.

The web renderer continues to use React/CSS, motion profiles, responsive layouts, and interactive modules. The PDF renderer continues to produce deterministic drawing instructions with bleed, safe-area, DPI, font-embedding, and overflow validation. Neither renderer imports or calls the other.

This keeps “matching” honest: the same palette, typographic family, and decorative intent survive across media, while layout adapts to what each medium can reliably do. Motion is not flattened into fake print decoration, and press constraints do not leak into the interactive runtime.

Templates marked digital-only are rejected before PDF generation begins. Print-compatible templates use the shared identity and preserve the existing generator/template version audit fields.

## Validation

The identity tests prove that a single persisted choice resolves to coordinated screen and CMYK values and that invalid legacy slugs fall back as one unit. Existing PDF layout, preflight, and renderer tests remain the independent print proof.
