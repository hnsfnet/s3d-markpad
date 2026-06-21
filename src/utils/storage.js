const STORAGE_KEY = 'markdown-notes-app';
const THEME_KEY = 'markdown-notes-theme';

export function loadAppState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load from localStorage:', e);
  }
  return null;
}

export function saveAppState(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
    return false;
  }
}

export function loadTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || null;
  } catch (e) {
    console.error('Failed to load theme:', e);
    return null;
  }
}

export function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
    return true;
  } catch (e) {
    console.error('Failed to save theme:', e);
    return false;
  }
}
