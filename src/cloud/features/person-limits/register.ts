// src/cloud/features/person-limits/register.ts
// Регистрация сервисов Person Limits в DI-контейнере

import { Container } from 'dioma';
import { settingsServiceToken } from '../../shared/di/tokens';
import { personLimitsFeatureSettingsToken } from './tokens';
import { PersonLimitsFeatureSettings } from './PersonLimitsFeatureSettings';

/**
 * Регистрирует сервисы Person Limits в переданном контейнере
 */
export function registerInContainer(container: Container): void {
  // PersonLimitsFeatureSettings - используем value вместо factory
  container.register({
    token: personLimitsFeatureSettingsToken,
    value: new PersonLimitsFeatureSettings(container.inject(settingsServiceToken)),
  });
}
