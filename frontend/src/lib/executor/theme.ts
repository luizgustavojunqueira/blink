const THEMES = new Set(["gruvbox", "catppuccin", "nord"]);

export function set({ theme }: { theme: string }) {
  if (!THEMES.has(theme)) return;
  document.documentElement.className = `theme-${theme}`;
  localStorage.setItem("theme", theme);
}
