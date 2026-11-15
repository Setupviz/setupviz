// This browser's saved values. Storage can be unavailable (Safari private mode, cookies
// disabled) or full: then reads return null, writes do nothing, and pages still work.
export function readStored(key){ try { return localStorage.getItem(key); } catch (e) { return null; } }
export function writeStored(key, value){ try { localStorage.setItem(key, value); } catch (e) {} }
export function removeStored(key){ try { localStorage.removeItem(key); } catch (e) {} }
