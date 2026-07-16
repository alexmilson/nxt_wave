/**
 * triageEngine.js
 * Converts the heuristic vision signal (visionHeuristics.js) and/or
 * an operator's manual severity selection into a START-aligned triage
 * result.
 *
 * START = Simple Triage and Rapid Treatment, the standard mass-casualty
 * field protocol: IMMEDIATE (red) / DELAYED (yellow) / MINOR (green) /
 * EXPECTANT (black).
 *
 * HONEST SCOPE NOTE: the vision signal is a coarse Canvas-pixel
 * heuristic (redness, dark/charred tone, texture irregularity) — not
 * a trained classifier and not a diagnosis. It is one input signal;
 * the operator's manual severity selection, when provided, always
 * takes priority. This app is a documentation/compression/
 * transmission aid, not an autonomous diagnostic device.
 */

import { HEURISTIC_LABELS } from './visionHeuristics.js';

const LABEL_TO_TRIAGE = {
  [HEURISTIC_LABELS.CHARRED]: { category: 'IMMEDIATE', findingsCode: 'BURN3' },
  [HEURISTIC_LABELS.BURN]: { category: 'DELAYED', findingsCode: 'BURN2' },
  [HEURISTIC_LABELS.IRREGULAR]: { category: 'DELAYED', findingsCode: 'LACER' },
  [HEURISTIC_LABELS.UNIFORM]: { category: 'MINOR', findingsCode: 'AMBUL' }
};

const SEVERITY_TO_CATEGORY = {
  1: 'MINOR',
  2: 'MINOR',
  3: 'DELAYED',
  4: 'DELAYED',
  5: 'IMMEDIATE',
  6: 'IMMEDIATE',
  7: 'EXPECTANT'
};

const SEVERITY_TO_FINDINGS = {
  1: 'AMBUL',
  2: 'AMBUL',
  3: 'LACER',
  4: 'FRACT',
  5: 'HEMOR',
  6: 'RESP',
  7: 'UNRES'
};

const CATEGORY_META = {
  IMMEDIATE: { color: 'RED', label: 'Immediate', priority: 1 },
  DELAYED: { color: 'YELLOW', label: 'Delayed', priority: 2 },
  MINOR: { color: 'GREEN', label: 'Minor', priority: 3 },
  EXPECTANT: { color: 'BLACK', label: 'Expectant', priority: 4 }
};

/**
 * Combines the heuristic signal with an optional operator-selected
 * severity (1-7, from the on-screen manual triage slider) to produce
 * a final triage result.
 *
 * @param {Array<{label:string, score:number}>} signals - output of analyzeImage()
 * @param {number|null} manualSeverity - 1(minor)-7(expectant), or null
 *   if the operator has not made a manual selection yet.
 */
export function evaluateTriage(signals = [], manualSeverity = null) {
  const top = signals[0];
  let category = 'DELAYED';
  let findingsCode = 'UNK';
  let confidence = top ? top.score : 0.5;
  let source = 'heuristic';

  if (top && LABEL_TO_TRIAGE[top.label]) {
    category = LABEL_TO_TRIAGE[top.label].category;
    findingsCode = LABEL_TO_TRIAGE[top.label].findingsCode;
  }

  // Manual severity, when provided, is authoritative — a trained
  // responder's field judgment always outranks the heuristic signal.
  if (manualSeverity && SEVERITY_TO_CATEGORY[manualSeverity]) {
    category = SEVERITY_TO_CATEGORY[manualSeverity];
    findingsCode = SEVERITY_TO_FINDINGS[manualSeverity];
    confidence = 1.0;
    source = 'manual';
  }

  const meta = CATEGORY_META[category];

  return {
    category,
    color: meta.color,
    label: meta.label,
    priority: meta.priority,
    findingsCode,
    confidence,
    source,
    rawTopLabel: top ? top.label : null
  };
}

export { CATEGORY_META, SEVERITY_TO_CATEGORY };
