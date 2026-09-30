// src/pages/sweets-training/content/index.js
// Everything the sweets training pages know about WHAT is taught. The copied
// pages import from here instead of carrying the other company's modules.
import { QUIZ_A } from "./quizA";
import { QUIZ_B } from "./quizB";

export {
  SWEETS_MODULES,
  SWEETS_MODULES_AR,
  SWEETS_MODULES_AR_SHORT,
  SWEETS_MODULES_SHORT_EN,
  SWEETS_MONTHLY_FOCUS,
} from "./modules";
export { SWEETS_MODULE_DETAILS_BI } from "./references";

/** Trainee quiz bank: module → 15 questions (5 Easy / 5 Medium / 5 Hard). */
export const SWEETS_QUIZ_BANK = { ...QUIZ_A, ...QUIZ_B };
