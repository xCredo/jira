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

// Импортируем регистрации фич
import { registerInContainer as registerPersonLimits } from '../../features/person-limits/register';
import { registerInContainer as registerColumnLimits } from '../../features/column-limits/register';
import { registerInContainer as registerAssigneeHighlighter } from '../../features/assignee-highlighter/register';
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

  // SettingsService - зависит от BoardPagePageObject (для получения boardId)
  cloudContainer.register({
    token: settingsServiceToken,
    factory: c => new SettingsService(c.inject(boardPagePageObjectToken)),
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

  // PersonLimitsApplier - 5 зависимостей + DynamicUpdater
  cloudContainer.register({
    token: personLimitsApplierToken,
    factory: c => {
      const updater = c.inject(dynamicUpdaterToken);
      const applier = new PersonLimitsApplier(
        c.inject(settingsServiceToken),
        c.inject(columnServiceToken),
        c.inject(assigneeServiceToken),
        c.inject(avatarIndicatorServiceToken),
        c.inject(boardPagePageObjectToken)
      );
      // Подписываемся на обновления DynamicUpdater
      updater.onUpdate(() => applier.update());
      return applier;
    },
  });

  // ColumnLimitsApplier - 6 зависимостей + DynamicUpdater
  cloudContainer.register({
    token: columnLimitsApplierToken,
    factory: c => {
      const updater = c.inject(dynamicUpdaterToken);
      const applier = new ColumnLimitsApplier(
        c.inject(settingsServiceToken),
        c.inject(columnServiceToken),
        c.inject(assigneeServiceToken),
        c.inject(avatarIndicatorServiceToken),
        c.inject(columnGroupLimitPanelToken),
        c.inject(boardPagePageObjectToken)
      );
      // Подписываемся на обновления DynamicUpdater
      updater.onUpdate(() => applier.update());
      return applier;
    },
  });

  // AssigneeHighlighterApplier - 2 зависимости + DynamicUpdater
  cloudContainer.register({
    token: assigneeHighlighterApplierToken,
    factory: c => {
      const updater = c.inject(dynamicUpdaterToken);
      const applier = new AssigneeHighlighterApplier(c.inject(settingsServiceToken), c.inject(assigneeServiceToken));
      // Подписываемся на обновления DynamicUpdater
      updater.onUpdate(() => applier.updateVisualization());
      return applier;
    },
  });

  // DynamicUpdater - без зависимостей (singleton)
  cloudContainer.register({
    token: dynamicUpdaterToken,
    factory: () => new DynamicUpdater(),
  });

  // Регистрация фич
  registerPersonLimits(cloudContainer);
  registerColumnLimits(cloudContainer);
  registerAssigneeHighlighter(cloudContainer);

  console.log('[DI] Cloud services registered');

}

/**
 * Получает сервис по токену
 */
export function resolveService<T>(token: any): T {
  return cloudContainer.inject(token);
}
