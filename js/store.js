/**
 * Minimal observable store: one source of truth, UI re-renders from it.
 * Small enough to read in one sitting, but it keeps the same mental model
 * you'd use with Redux/Zustand if the app grows (e.g. "Compare locations").
 */
export function createStore(initialState) {
  let state = initialState;
  const listeners = new Set();

  return {
    getState: () => state,
    setState(patch) {
      state = { ...state, ...patch };
      listeners.forEach((listener) => listener(state));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
