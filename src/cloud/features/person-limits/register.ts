// src/cloud/features/person-limits/register.ts
// Регистрация сервисов Person Limits в DI-контейнере

import { Container } from 'dioma';
import { settingsServiceToken } from '../../shared/di/tokens';
import { personLimitsFeatureSettingsToken } from './tokens';
import { PersonLimitsFeatureSettings } from './PersonLimitsFeatureSettings';
import type { SettingsService } from '../../shared/SettingsService';

/**
 * Регистрирует сервисы Person Limits в переданном контейнере
 */
export function registerInContainer(container: Container): void {
  // PersonLimitsFeatureSettings
  container.register({
    token: personLimitsFeatureSettingsToken,
    factory: (c) => new PersonLimitsFeatureSettings(c.inject(settingsServiceToken)),
  });
}
