// src/cloud/features/column-limits/register.ts
// Регистрация сервисов Column Limits в DI-контейнере

import { Container } from 'dioma';
import { settingsServiceToken } from '../../shared/di/tokens';
import { columnLimitsFeatureSettingsToken } from './tokens';
import { ColumnLimitsFeatureSettings } from './ColumnLimitsFeatureSettings';
import type { SettingsService } from '../../shared/SettingsService';

/**
 * Регистрирует сервисы Column Limits в переданном контейнере
 */
export function registerInContainer(container: Container): void {
  // ColumnLimitsFeatureSettings
  container.register({
    token: columnLimitsFeatureSettingsToken,
    factory: (c) => new ColumnLimitsFeatureSettings(c.inject(settingsServiceToken)),
  });
}
