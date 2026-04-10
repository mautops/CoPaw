export interface ThemeConfig {
  id: string;
  label: string;
  cssClass: string;
  /** Preview color for the theme picker swatch */
  previewColor: string;
}

export const themes: ThemeConfig[] = [
  {
    id: "default",
    label: "默认",
    cssClass: "theme-default",
    previewColor: "#18181b",
  },
  {
    id: "ocean",
    label: "深海",
    cssClass: "theme-ocean",
    previewColor: "#3b82f6",
  },
  {
    id: "forest",
    label: "森林",
    cssClass: "theme-forest",
    previewColor: "#22c55e",
  },
  {
    id: "rose",
    label: "玫瑰",
    cssClass: "theme-rose",
    previewColor: "#f43f5e",
  },
];

export const DEFAULT_THEME_ID = "default";

export function getTheme(id: string): ThemeConfig {
  return themes.find((t) => t.id === id) ?? themes[0];
}
