import {
  BACKGROUND_STYLES,
  DECORATIVE_STYLES,
  DESIGN_DEFAULTS,
  colorTheme,
  typography,
} from "@/lib/config/design-vocabulary";

export interface DesignIdentityInput {
  colorTheme: string;
  typography: string;
  backgroundStyle: string;
  decorativeStyle: string;
}

/**
 * Shared semantic identity for screen and press. Renderers consume this
 * contract independently; neither renderer imports the other.
 */
export function resolveDesignIdentity(input: DesignIdentityInput | null) {
  const theme = colorTheme(input?.colorTheme ?? DESIGN_DEFAULTS.colorTheme);
  const type = typography(input?.typography ?? DESIGN_DEFAULTS.typography);
  const backgroundStyle =
    BACKGROUND_STYLES.find((option) => option.slug === input?.backgroundStyle)
      ?.slug ?? DESIGN_DEFAULTS.backgroundStyle;
  const decorativeStyle =
    DECORATIVE_STYLES.find((option) => option.slug === input?.decorativeStyle)
      ?.slug ?? DESIGN_DEFAULTS.decorativeStyle;
  return {
    colorThemeSlug: theme.slug,
    typographySlug: type.slug,
    backgroundStyle,
    decorativeStyle,
    screen: {
      background: theme.swatch.background,
      foreground: theme.swatch.foreground,
      accent: theme.swatch.accent,
      headingFont: type.preview.heading,
      bodyFont: type.preview.body,
    },
    print: {
      background: theme.cmyk.background,
      foreground: theme.cmyk.foreground,
      accent: theme.cmyk.accent,
    },
  };
}
