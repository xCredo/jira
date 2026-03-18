// src/cloud/features/person-limits/tokens.ts
// Токены для DI - Person Limits

import { Token } from 'dioma';

export const personLimitsFeatureSettingsToken = new Token<
  import('./PersonLimitsFeatureSettings').PersonLimitsFeatureSettings
>('PersonLimitsFeatureSettings');
