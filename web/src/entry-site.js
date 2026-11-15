// The site's shared code, served as /data.js to the builder, home and share pages and run
// once in the Worker. It publishes the same three globals the page scripts have always used.
import { deskApi, deskLimits, defaultDesk, deskFallbackNotice, parseDeskInput, deskMm, deskAxisOk, deskOk, deskField, savedDesk, deskRangeMessage, measureText } from './desk.js';
import { catalog, idAlias, preferences } from './catalog.js';
import { cats, labels, padLabels, get, forSale, isMat, activePads, answers, answerText } from './products.js';
import { AMAZON_TAG, amazonLink, cartLink, buyLine, measurementInfo } from './links.js';
import { overhang, overlap } from './geometry.js';
import { check } from './fit.js';
import { place, layout, settle, retarget, previewSetup } from './layout.js';
import { fixSwap } from './fix-swap.js';
import { mouseSlot, recommend, omission, matchReason } from './recommend.js';
import { usedArea, percentText, usedPercent } from './usage.js';
import { encode, decode, invalidShareNotice } from './share.js';
import { drawMonitor, markPadContact, monitorMeasurements } from './draw.js';
import { track, copySetupLink } from './client.js';
import { COLORS, summary, shapes, svg, toCanvas, download } from './setup-image.js';

window.SVDesk = deskApi;

window.SV = {
  track, measurementInfo, markPadContact, drawMonitor, copySetupLink, invalidShareNotice, monitorMeasurements,
  catalog, cats, labels, padLabels, preferences, get padTry(){ return activePads(); }, idAlias, get, forSale, isMat,
  amazonLink, fixSwap, amazonTag: AMAZON_TAG, cartLink, buyLine, answers, answerText, mouseSlot,
  recommend, omission, matchReason, place, layout, settle, retarget, previewSetup, overhang, overlap, check, encode, decode, usedArea,
  deskLimits, defaultDesk, deskFallbackNotice,
  parseDeskInput, deskMm, deskAxisOk, deskOk, deskField, savedDesk,
  deskRangeMessage, measureText, percentText, usedPercent,
};

window.SVImage = { colors: COLORS, summary, shapes, svg, toCanvas, download };
