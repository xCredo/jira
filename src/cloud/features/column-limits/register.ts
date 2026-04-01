// src/cloud/features/column-limits/register.ts
// Регистрация сервисов Column Limits в DI-контейнере

import { Container } from 'dioma';
import { settingsServiceToken } from '../../shared/di/tokens';
import { columnLimitsFeatureSettingsToken } from './tokens';
import { ColumnLimitsFeatureSettings } from './ColumnLimitsFeatureSettings';

/**
 * Регистрирует сервисы Column Limits в переданном контейнере
 */
export function registerInContainer(container: Container): void {
  // ColumnLimitsFeatureSettings - используем value вместо factory
  container.register({
    token: columnLimitsFeatureSettingsToken,
    value: new ColumnLimitsFeatureSettings(container.inject(settingsServiceToken)),
  });
}
