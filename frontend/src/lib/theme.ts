export const setTheme = (theme: string) => {
  document.documentElement.className = `theme-${theme}`;
  localStorage.setItem("blink-theme", theme);
};

export const getTheme = () => {
  return window.localStorage.getItem("blink-theme") ?? "gruvbox";
};
