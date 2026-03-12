// src/cloud/shared/index.ts
// Экспорт всех общих сервисов

export { BoardPagePageObject, boardPagePageObjectToken, registerBoardPagePageObjectInDI } from './BoardPagePageObject';
export { ColumnService, columnService, type ColumnInfo } from './ColumnService';
export { AssigneeService, assigneeService, type Assignee } from './AssigneeService';
export { SettingsService, settingsService, type Settings, type AssigneeHighlightSettings, type WipLimitSettings, type ColumnGroupWipLimitSettings } from './SettingsService';
export { AvatarIndicatorService, avatarIndicatorService, type AvatarIndicator } from './AvatarIndicatorService';
export { DynamicUpdater, dynamicUpdater } from './DynamicUpdater';
