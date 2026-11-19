// The API object the pages have always used as window.SV and window.SVImage. Page modules
// import it from here; entry-site.js publishes it on window for the browser checks and old callers.
import { deskLimits, defaultDesk, deskFallbackNotice, parseDeskInput, deskMm, deskAxisOk, deskOk, deskField, savedDesk, deskRangeMessage, measureText } from './desk.js';
import { catalog, idAlias, preferences } from './catalog.js';
import { cats, labels, padLabels, get, customId, customLimits, forSale, isMat, activePads, answers, answerText } from './products.js';
import { AMAZON_TAG, amazonLink, cartLink, buyLine, measurementInfo } from './links.js';
import { overhang, overlap } from './geometry.js';
import { check } from './fit.js';
import { place, layout, settle, retarget, previewSetup } from './layout.js';
import { fixSwap } from './fix-swap.js';
import { mouseSlot, recommend, omission, matchReason } from './recommend.js';
import { usedArea, percentText, usedPercent } from './usage.js';
import { encode, decode, invalidShareNotice } from './share.js';
import { drawMonitor, markPadContact } from './draw.js';
import { monitorMeasurements } from './product-text.js';
import { track, copySetupLink } from './client.js';
import { summary, shapes, svg, toCanvas, download } from './setup-image.js';
import { FIT_COLORS } from './fit-words.js';

export const SV = {
  track, measurementInfo, markPadContact, drawMonitor, copySetupLink, invalidShareNotice, monitorMeasurements,
  catalog, cats, labels, padLabels, preferences, customId, customLimits, get padTry(){ return activePads(); }, idAlias, get, forSale, isMat,
  amazonLink, fixSwap, amazonTag: AMAZON_TAG, cartLink, buyLine, answers, answerText, mouseSlot,
  recommend, omission, matchReason, place, layout, settle, retarget, previewSetup, overhang, overlap, check, encode, decode, usedArea,
  deskLimits, defaultDesk, deskFallbackNotice,
  parseDeskInput, deskMm, deskAxisOk, deskOk, deskField, savedDesk,
  deskRangeMessage, measureText, percentText, usedPercent,
};

export const SVImage = { colors: FIT_COLORS, summary, shapes, svg, toCanvas, download };
