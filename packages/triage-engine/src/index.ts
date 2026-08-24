export { scoreTriage, isWorseningVitals } from "./scoring";
export type { ScoreOptions } from "./scoring";
export {
  VITAL_THRESHOLDS,
  WATCH_MINUTES_BY_ESI,
  SURGE_WATCH_FACTOR,
  countPresentVitals,
} from "./thresholds";
export { evaluateWatch, computeReassessMinutes } from "./watch";
export type { WatchPatientState, WatchAlert } from "./watch";
