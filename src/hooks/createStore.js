export function createStore(initialState) {
  let state = initialState;
  const listeners = new Set();

  function getState() {
    return state;
  }

  function setState(newState) {
    if (typeof newState === 'function') {
      state = { ...state, ...newState(state) };
    } else {
      state = { ...state, ...newState };
    }
    notify();
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function notify() {
    listeners.forEach(listener => listener(state));
  }

  return { getState, setState, subscribe };
}
