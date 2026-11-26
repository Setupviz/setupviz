// A product's size, as the builder and share pages list it.
import { padLabels } from './products.js';

export function monitorMeasurements(s, one, two){
  return s.diagonalIn + "″ diagonal · " + one(s.dims.w) + " wide · " + one(s.d) + " deep with stand\nStand span (W × D): " + two(s.base[0], s.base[1]) + "\nTop view shows the stock stand at neutral tilt. Outline and panel position are approximate.";
}

// One line of sizes for any product; one(mm) and two(w, d) format lengths.
export function sizeLine(cat, s, one, two){
  return cat === 'monitor' ? monitorMeasurements(s, one, two) : two(s.w, s.d) + (s.g ? ' · ' + s.g + ' g' : '') + (s.kind ? ' · ' + padLabels[s.kind].toLowerCase() : '');
}
