import { createStore } from './createStore.js';
import { extractTitle } from '../utils/helpers.js';

const store = createStore({
  query: ''
});

let searchTimer = null;
const SEARCH_DELAY = 200;

export function useSearch() {
  const { getState, setState, subscribe } = store;

  function getQuery() {
    return getState().query;
  }

  function setQuery(query) {
    setState({ query });
  }

  function clearQuery() {
    if (searchTimer) {
      clearTimeout(searchTimer);
      searchTimer = null;
    }
    setState({ query: '' });
  }

  function filterNotes(notes, query) {
    const searchQuery = query?.trim() || getState().query.trim();
    if (!searchQuery) return notes;
    
    const lowerQuery = searchQuery.toLowerCase();
    return notes.filter(note => {
      const title = extractTitle(note.content).toLowerCase();
      const content = note.content.toLowerCase();
      return title.includes(lowerQuery) || content.includes(lowerQuery);
    });
  }

  function debouncedSearch(newQuery, callback) {
    if (searchTimer) clearTimeout(searchTimer);
    
    searchTimer = setTimeout(() => {
      setState({ query: newQuery });
      if (callback) callback();
    }, SEARCH_DELAY);
  }

  return {
    getQuery,
    setQuery,
    clearQuery,
    filterNotes,
    debouncedSearch,
    subscribe
  };
}
