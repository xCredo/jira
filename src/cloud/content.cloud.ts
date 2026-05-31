// src/cloud/content.cloud.ts
// Cloud entry point for Jira Cloud (atlassian.net)

import 'antd/dist/reset.css';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { globalContainer } from 'dioma';
import { Routes, registerRoutingServiceInDI, routingServiceToken } from '../infrastructure/routing';
import { registerExtensionApiServiceInDI } from '../infrastructure/extension-api/ExtensionApiService';
import { registerLogger } from '../infrastructure/logging/Logger';
import { localeProviderToken, JiraLocaleProvider } from '../shared/locale';
import {
  cloudContainer,
  registerCloudServices,
  settingsServiceToken,
  personLimitsApplierToken,
  columnLimitsApplierToken,
  assigneeHighlighterApplierToken,
  dynamicUpdaterToken,
} from './shared/di';
import { boardSettingsBoardPageToken } from '../features/board-settings/BoardPage';
import { localSettingsBoardPageToken } from '../features/local-settings/BoardPage';
import { BoardSettingsBoardPage } from '../features/board-settings/BoardPage';
import { LocalSettingsBoardPage } from '../features/local-settings/BoardPage';
import { boardPagePageObjectToken } from '../infrastructure/page-objects/BoardPage';
import runModifications from '../infrastructure/page-modification/runModifications';
import { SettingsButton } from './ui';
import { registerSettings } from '../features/board-settings/actions/registerSettings';
import { loadLocalSettings } from '../features/local-settings/actions/loadLocalSettings';
import { LocalSettingsTab } from '../features/local-settings/components/LocalSettingsTab';
import { columnLimitsModule } from '../features/column-limits-module/module';
import ColumnLimitsBoardPage, { columnLimitsBoardPageToken } from '../features/column-limits-module/BoardPage';
import { registerBoardPropertyServiceInDI } from '../infrastructure/jira/boardPropertyService';
import { registerServerApiCloudAdapters } from './shared/di/serverApiAdapters.cloud';

function initCloudDiContainer() {
  registerLogger(globalContainer);
  registerExtensionApiServiceInDI(globalContainer);
  registerRoutingServiceInDI(globalContainer);
  globalContainer.register({
    token: localeProviderToken,
    value: new JiraLocaleProvider(),
  });
}

function mountSettingsButton(): boolean {
  const controlsBar = document.querySelector('[data-testid="software-board.header.controls-bar"]');

  if (controlsBar && !controlsBar.querySelector('[data-jh-settings-button]')) {
    const container = document.createElement('div');
    container.setAttribute('data-jh-settings-button', '');
    container.style.display = 'inline-block';
    container.style.marginLeft = '8px';
    container.style.position = 'relative';
    controlsBar.appendChild(container);

    const root = createRoot(container);
    root.render(React.createElement(SettingsButton));

    console.log('[Jira Helper Cloud] Кнопка настроек смонтирована');
    return true;
  }

  return false;
}

function waitForMount(): void {
  if (mountSettingsButton()) {
    return;
  }

  const observer = new MutationObserver(() => {
    if (mountSettingsButton()) {
      observer.disconnect();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  setTimeout(() => {
    observer.disconnect();
  }, 10000);
}

// Инициализация всех модулей (async)
export async function initializeCloudExtension(): Promise<void> {
  console.log('[Jira Helper Cloud] Инициализация расширения для Jira Cloud');

  initCloudDiContainer();
  registerCloudServices();
  waitForMount();

  const routingService = globalContainer.inject(routingServiceToken);

  const personLimitsApplier = cloudContainer.inject(personLimitsApplierToken);
  const columnLimitsApplier = cloudContainer.inject(columnLimitsApplierToken);
  const assigneeHighlighterApplier = cloudContainer.inject(assigneeHighlighterApplierToken);
  const dynamicUpdater = cloudContainer.inject(dynamicUpdaterToken);
  const settingsService = cloudContainer.inject(settingsServiceToken);

  personLimitsApplier.init();
  columnLimitsApplier.init();

  await settingsService.waitForInit();

  personLimitsApplier.update();
  columnLimitsApplier.update();

  dynamicUpdater.start();
  console.log('[Jira Helper Cloud] DynamicUpdater запущен');

  const settings = settingsService.getSettings();

  if (settings.assigneeHighlight?.enabled) {
    assigneeHighlighterApplier.enable();
    console.log('[Jira Helper Cloud] Подсветка исполнителей включена');
  }

  const boardPageObject = cloudContainer.inject(boardPagePageObjectToken);

  // Register Cloud BoardPagePageObject in globalContainer so PageModifications can use it
  globalContainer.register({ token: boardPagePageObjectToken, value: boardPageObject });

  registerServerApiCloudAdapters(globalContainer, settingsService);
  registerBoardPropertyServiceInDI(globalContainer);
  columnLimitsModule.ensure(globalContainer);

  const columnLimitsBoardPage = new ColumnLimitsBoardPage(globalContainer);

  const boardSettingsBoardPage = new BoardSettingsBoardPage(globalContainer);
  const localSettingsBoardPage = new LocalSettingsBoardPage(globalContainer);

  const modificationsMap = {
    [Routes.BOARD]: [boardSettingsBoardPage, localSettingsBoardPage, columnLimitsBoardPage],
    [Routes.ALL]: [],
  };

  runModifications(modificationsMap, routingService);

  console.log('[Jira Helper Cloud] Загрузка local settings...');
  loadLocalSettings();
  console.log('[Jira Helper Cloud] Регистрация LocalSettingsTab в модалке...');
  registerSettings({ title: 'Local Settings', component: LocalSettingsTab });
  console.log('[Jira Helper Cloud] Инициализация завершена');
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initializeCloudExtension();
    });
  } else {
    initializeCloudExtension();
  }
}

export { cloudContainer };

export {
  settingsServiceToken,
  personLimitsApplierToken,
  columnLimitsApplierToken,
  assigneeHighlighterApplierToken,
  dynamicUpdaterToken,
} from './shared/di';

export type { Settings, AssigneeHighlightSettings, WipLimitSettings, ColumnGroupWipLimitSettings } from './shared';
