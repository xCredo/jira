// src/cloud/features/assignee-highlighter/register.ts
// Регистрация сервисов Assignee Highlighter в DI-контейнере

import { Container } from 'dioma';
import { settingsServiceToken } from '../../shared/di/tokens';
import { assigneeHighlighterFeatureSettingsToken } from './tokens';
import { AssigneeHighlighterFeatureSettings } from './AssigneeHighlighterFeatureSettings';
import type { SettingsService } from '../../shared/SettingsService';

/**
 * Регистрирует сервисы Assignee Highlighter в переданном контейнере
 */
export function registerInContainer(container: Container): void {
  // AssigneeHighlighterFeatureSettings
  container.register({
    token: assigneeHighlighterFeatureSettingsToken,
    factory: (c) => new AssigneeHighlighterFeatureSettings(c.inject(settingsServiceToken)),
  });
}
