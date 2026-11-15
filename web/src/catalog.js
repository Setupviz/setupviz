// The product catalog and the ordered pick lists. Pure data: every rule that reads it lives elsewhere.
// Products are in catalog/, one file per category.
// All sizes are in mm. A mouse's w is its width and d its length.
//
// Product record:
// {
//   id, name,
//   brand, model, asin,            // asin is 10 characters. The tagged URL is built from it, not stored.
//   dims: { w, d, h }, dimsSource,  // manufacturer size, and the page it came from.
//                                   // A monitor's dims are the cabinet when the outline lists that apart from the stand.
//   w, d,                           // desk footprint. Monitor d is depth with the stand.
//   base,                           // monitors: stand base [w, d], not the assembled depth
//   kind,                           // pads: cloth | mat | glass
//   g, grips, hands,                // mice: weight in grams, grip styles, hand sizes
//   tagsSource,                     // 'editorial' when grips or hands are a judgment, not a maker spec
//   retired,                        // true keeps the product for old links, and drops it from sale
//   why, alt
// }

import { monitors } from './catalog/monitors.js';
import { keyboards } from './catalog/keyboards.js';
import { pads } from './catalog/pads.js';
import { mice } from './catalog/mice.js';

export const catalog = { monitor: monitors, keyboard: keyboards, pad: pads, mouse: mice };
// woot60 was this slot's id. Old share links and saved picks still use it.
export const idAlias = { woot60: 'hv3m' };
// Each slot recommend() fills is an ordered list of product ids. The first id
// that exists and is not retired wins, so selling a different model is a data change.
export const preferences = {
  monitor: {
    default: ['mon27', 'xg27acs'],
    // No verified ultrawide yet. This stays its own list so a later swap is a one-line data change.
    wide: ['mon34', 'xg27acs'],
    shallow: ['mon24']
  },
  keyboard: {
    k75: ['k75'],
    full: ['full'],
    tkl: ['tkl']
  },
  pad: {
    mat: ['mat'],
    small: ['clothm', 'qckm', 'g640'],
    default: ['cloth']
  },
  mouse: {
    default: ['gpx2', 'vv3p'],
    da3: ['da3', 'ec2c'],
    ec2c: ['ec2c', 'da3'],
    // Claw and fingertip pick vv2p today. The next id is there so retiring vv2p is a data change.
    vv2p: ['vv2p', 'vv3p'],
    gpx2: ['gpx2', 'vv3p'],
    vv3p: ['vv3p', 'gpx2']
  }
};
// Decision 13. Rule 2 tries the desk's short list, then these ids. This is the only pad-order list;
// callers read it through activePads(), so a retired pad drops out everywhere.
export const padOrder = ['cloth', 'clothm', 'mat', 'glass', 'qckm', 'g640', 'g840', 'gigv2xxl', 'mm350xl', 'honeacexxl', 'sp004a', 'hienxl', 'zgsriii', 'zgsrsebi', 'zgsrseorange', 'zhsriii', 'zhsrseorange', 'zhsrserougeii', 'zhtr', 'emb', 'emc'];
