// src/cloud/shared/di/container.ts
// DI-контейнер для cloud-версии расширения

import { Container } from 'dioma';
import {
  settingsServiceToken,
  columnServiceToken,
  assigneeServiceToken,
  avatarIndicatorServiceToken,
  boardPagePageObjectToken,
  personLimitsApplierToken,
  columnLimitsApplierToken,
  columnGroupLimitPanelToken,
  assigneeHighlighterApplierToken,
  dynamicUpdaterToken,
} from './tokens';

// Импортируем классы
import { SettingsService } from '../SettingsService';
import { ColumnService } from '../ColumnService';
import { AssigneeService } from '../AssigneeService';
import { AvatarIndicatorService } from '../AvatarIndicatorService';
import { BoardPagePageObject } from '../BoardPagePageObject';
import { PersonLimitsApplier } from '../../features/person-limits/PersonLimitsApplier';
import { ColumnLimitsApplier } from '../../features/column-limits/ColumnLimitsApplier';
import { ColumnGroupLimitPanel } from '../../features/column-limits/ColumnGroupLimitPanel';
import { AssigneeHighlighterApplier } from '../../features/assignee-highlighter/AssigneeHighlighterApplier';
import { DynamicUpdater } from '../DynamicUpdater';

// Создаём глобальный контейнер
export const cloudContainer = new Container();

/**
 * Регистрирует все сервисы и applier-ы в DI-контейнере
 */
export function registerCloudServices(): void {
  // BoardPagePageObject - статический объект
  cloudContainer.register({
    token: boardPagePageObjectToken,
    value: BoardPagePageObject,
  });

  // SettingsService - без зависимостей
  cloudContainer.register({
    token: settingsServiceToken,
    factory: () => new SettingsService(),
  });

  // ColumnService - зависит от BoardPagePageObject
  cloudContainer.register({
    token: columnServiceToken,
    factory: c => new ColumnService(c.inject(boardPagePageObjectToken)),
  });

  // AssigneeService - зависит от SettingsService
  cloudContainer.register({
    token: assigneeServiceToken,
    factory: c => new AssigneeService(c.inject(settingsServiceToken)),
  });

  // AvatarIndicatorService - зависит от AssigneeService
  cloudContainer.register({
    token: avatarIndicatorServiceToken,
    factory: c => new AvatarIndicatorService(c.inject(assigneeServiceToken)),
  });

  // ColumnGroupLimitPanel - без зависимостей
  cloudContainer.register({
    token: columnGroupLimitPanelToken,
    factory: () => new ColumnGroupLimitPanel(),
  });

  // PersonLimitsApplier - 5 зависимостей
  cloudContainer.register({
    token: personLimitsApplierToken,
    factory: c =>
      new PersonLimitsApplier(
        c.inject(settingsServiceToken),
        c.inject(columnServiceToken),
        c.inject(assigneeServiceToken),
        c.inject(avatarIndicatorServiceToken),
        c.inject(boardPagePageObjectToken)
      ),
  });

  // ColumnLimitsApplier - 6 зависимостей
  cloudContainer.register({
    token: columnLimitsApplierToken,
    factory: c =>
      new ColumnLimitsApplier(
        c.inject(settingsServiceToken),
        c.inject(columnServiceToken),
        c.inject(assigneeServiceToken),
        c.inject(avatarIndicatorServiceToken),
        c.inject(columnGroupLimitPanelToken),
        c.inject(boardPagePageObjectToken)
      ),
  });

  // AssigneeHighlighterApplier - 2 зависимости
  cloudContainer.register({
    token: assigneeHighlighterApplierToken,
    factory: c => new AssigneeHighlighterApplier(c.inject(settingsServiceToken), c.inject(assigneeServiceToken)),
  });

  // DynamicUpdater - 2 зависимости
  cloudContainer.register({
    token: dynamicUpdaterToken,
    factory: c => new DynamicUpdater(c.inject(personLimitsApplierToken), c.inject(columnLimitsApplierToken)),
  });

  console.log('[DI] Cloud services registered');
}

/**
 * Получает сервис по токену
 */
export function resolveService<T>(token: any): T {
  return cloudContainer.inject(token);
}
