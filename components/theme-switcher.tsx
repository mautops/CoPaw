"use client";

import { useEffect, useState } from "react";
import { themes, getTheme, DEFAULT_THEME_ID } from "@/lib/themes";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Moon, Sun, Palette } from "lucide-react";

const DARK_KEY = "theme";
const COLOR_KEY = "color-theme";

function applyColorThemeClass(id: string) {
  const html = document.documentElement;
  themes.forEach((t) => html.classList.remove(t.cssClass));
  html.classList.add(getTheme(id).cssClass);
}

function applyDarkMode(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  localStorage.setItem(DARK_KEY, dark ? "dark" : "light");
}

/** Apply saved color theme on mount — call once near the root. */
export function ColorThemeInitializer() {
  useEffect(() => {
    const saved = localStorage.getItem(COLOR_KEY) ?? DEFAULT_THEME_ID;
    applyColorThemeClass(saved);
  }, []);
  return null;
}

export function ThemeSwitcher({ className }: { className?: string }) {
  const [isDark, setIsDark] = useState(true);
  const [colorThemeId, setColorThemeId] = useState<string>(DEFAULT_THEME_ID);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsDark(document.documentElement.classList.contains("dark"));
    const saved = localStorage.getItem(COLOR_KEY) ?? DEFAULT_THEME_ID;
    setColorThemeId(saved);
    applyColorThemeClass(saved);
  }, []);

  if (!mounted) return null;

  function switchMode(dark: boolean) {
    applyDarkMode(dark);
    setIsDark(dark);
  }

  function switchColor(id: string) {
    applyColorThemeClass(id);
    localStorage.setItem(COLOR_KEY, id);
    setColorThemeId(id);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            className,
          )}
        >
          <Palette className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          明暗模式
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => switchMode(false)}>
          <Sun className="mr-2 h-4 w-4" />
          浅色
          {!isDark && <span className="ml-auto text-primary">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchMode(true)}>
          <Moon className="mr-2 h-4 w-4" />
          深色
          {isDark && <span className="ml-auto text-primary">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          配色主题
        </DropdownMenuLabel>
        {themes.map((t) => (
          <DropdownMenuItem key={t.id} onClick={() => switchColor(t.id)}>
            <span
              className="mr-2 h-3 w-3 rounded-full border border-border"
              style={{ background: t.previewColor }}
            />
            {t.label}
            {colorThemeId === t.id && (
              <span className="ml-auto text-primary">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
