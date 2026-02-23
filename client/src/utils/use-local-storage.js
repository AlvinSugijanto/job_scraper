// Get saved state from localStorage
export const getSavedState = (storageKey) => {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

// Save state to localStorage
export const saveState = (storageKey, state) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
};
