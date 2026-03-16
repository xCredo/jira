// src/cloud/shared/di/tokens.ts
// Токены для DI-контейнера

import { Token } from 'dioma';

// Services
export const settingsServiceToken = new Token<import('../SettingsService').SettingsService>('SettingsService');
export const columnServiceToken = new Token<import('../ColumnService').ColumnService>('ColumnService');
export const assigneeServiceToken = new Token<import('../AssigneeService').AssigneeService>('AssigneeService');
export const avatarIndicatorServiceToken = new Token<import('../AvatarIndicatorService').AvatarIndicatorService>(
  'AvatarIndicatorService'
);
export const boardPagePageObjectToken = new Token<import('../BoardPagePageObject').IBoardPagePageObject>(
  'BoardPagePageObject'
);

// Appliers
export const personLimitsApplierToken = new Token<
  import('../../features/person-limits/PersonLimitsApplier').PersonLimitsApplier
>('PersonLimitsApplier');
export const columnLimitsApplierToken = new Token<
  import('../../features/column-limits/ColumnLimitsApplier').ColumnLimitsApplier
>('ColumnLimitsApplier');
export const columnGroupLimitPanelToken = new Token<
  import('../../features/column-limits/ColumnGroupLimitPanel').ColumnGroupLimitPanel
>('ColumnGroupLimitPanel');
export const assigneeHighlighterApplierToken = new Token<
  import('../../features/assignee-highlighter/AssigneeHighlighterApplier').AssigneeHighlighterApplier
>('AssigneeHighlighterApplier');
export const dynamicUpdaterToken = new Token<import('../DynamicUpdater').DynamicUpdater>('DynamicUpdater');
