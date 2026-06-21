import { createStore } from './createStore.js';
import { loadTheme, saveTheme } from '../utils/storage.js';

const store = createStore({
  theme: 'light'
});

export function useTheme() {
  const { getState, setState, subscribe } = store;

  function getTheme() {
    return getState().theme;
  }

  function setTheme(theme) {
    setState({ theme });
    saveTheme(theme);
    applyThemeToDOM(theme);
  }

  function toggleTheme() {
    const current = getState().theme;
    const newTheme = current === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    return newTheme;
  }

  function applyThemeToDOM(theme) {
    if (theme === 'dark') {
      document.body.classList.add('dark');
      const sunIcon = document.querySelector('.icon-sun');
      const moonIcon = document.querySelector('.icon-moon');
      if (sunIcon) sunIcon.style.display = 'none';
      if (moonIcon) moonIcon.style.display = 'inline-block';
    } else {
      document.body.classList.remove('dark');
      const sunIcon = document.querySelector('.icon-sun');
      const moonIcon = document.querySelector('.icon-moon');
      if (sunIcon) sunIcon.style.display = 'inline-block';
      if (moonIcon) moonIcon.style.display = 'none';
    }
  }

  function initFromStorage() {
    const savedTheme = loadTheme();
    if (savedTheme) {
      setState({ theme: savedTheme });
      applyThemeToDOM(savedTheme);
      return savedTheme;
    }
    return 'light';
  }

  function reset() {
    setState({ theme: 'light' });
    document.body.classList.remove('dark');
  }

  return {
    getTheme,
    setTheme,
    toggleTheme,
    applyThemeToDOM,
    initFromStorage,
    reset,
    subscribe
  };
}
