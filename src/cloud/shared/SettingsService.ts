// src/cloud/shared/REMAKE_SettingsService.ts
// Сервис настроек для Jira Cloud с поддержкой Jira Board Properties

import type { IBoardPagePageObject } from './BoardPagePageObject.tsx';
import { SettingsStorage, SETTINGS_KEYS } from './SettingsStorage';

/**
 * Настройки подсветки исполнителей
 */
export interface AssigneeHighlightSettings {
  /** Включена ли подсветка */
  enabled: boolean;
  /** Тип визуализации: полоса, фон или граница */
  visualizationType: 'stripe' | 'background' | 'border';
  /** Использовать автоматические цвета */
  autoColors: boolean;
  /** Кастомные цвета для исполнителей по ID */
  customColors: Record<string, string>;
  /** Кастомные фоновые цвета для исполнителей по ID */
  customBackgroundColors: Record<string, string>;
  /** Подсвечивать неназначенные задачи */
  highlightUnassigned: boolean;
  /** Цвет для неназначенных задач */
  unassignedColor: string;
  /** Фоновый цвет для неназначенных задач */
  unassignedBackgroundColor: string;
}

/**
 * Настройки цветов колонок
 */
export interface ColumnColorsSettings {
  enabled: boolean;
}

/**
 * Настройки персональных WIP-лимитов
 */
export interface WipLimitSettings {
  enabled: boolean;
  limits: Array<{
    id: string;
    userId: string;
    userName: string;
    columnIds: string[];
    columnNames: string[];
    limit: number;
    color: string;
  }>;
}

/**
 * Настройки групповых WIP-лимитов колонок
 */
export interface ColumnGroupWipLimitSettings {
  enabled: boolean;
  limits: Array<{
    id: string;
    name: string;
    columnIds: string[];
    columnNames: string[];
    limit: number;
    baseColor: string;
    warningColor?: string;
  }>;
}

/**
 * Полные настройки расширения
 */
export interface Settings {
  columnColors: ColumnColorsSettings;
  assigneeHighlight: AssigneeHighlightSettings;
  assigneeOverload: {
    enabled: boolean;
    threshold: number;
    borderColor: string;
    borderWidth: string;
  };
  personalWipLimits: WipLimitSettings;
  columnGroupWipLimits: ColumnGroupWipLimitSettings;
}

/**
 * Сервис для управления настройками расширения.
 * Хранит настройки в Jira Board Properties с fallback в localStorage.
 */
export class SettingsService {
  private settings: Settings;

  private readonly jiraStorage: SettingsStorage | null;

  private useJiraApi = false;

  constructor(boardPage: IBoardPagePageObject) {
    this.settings = this.getDefaultSettings();
    this.jiraStorage = new SettingsStorage(boardPage);

    // Проверяем доступность Jira API
    this.init();
  }

  private async init(): Promise<void> {
    // Пробуем загрузить из Jira API
    this.useJiraApi = (await this.jiraStorage?.isAvailable()) ?? false;

    if (this.useJiraApi) {
      console.log('[SettingsService] Используем Jira Board Properties API');
      await this.loadFromJira();
    } else {
      console.log('[SettingsService] Jira API недоступен, используем localStorage');
      this.settings = this.loadFromLocalStorage();
    }
  }

  /**
   * Возвращает текущие настройки
   * @returns Копия объекта настроек
   */
  getSettings(): Settings {
    return { ...this.settings };
  }

  /**
   * Обновляет настройки
   * @param updates - Частичное обновление настроек
   */
  async updateSettings(updates: Partial<Settings>): Promise<void> {
    this.settings = {
      ...this.settings,
      ...updates,
      assigneeHighlight: {
        ...this.settings.assigneeHighlight,
        ...updates.assigneeHighlight,
      },
      personalWipLimits: {
        ...this.settings.personalWipLimits,
        ...updates.personalWipLimits,
      },
      columnGroupWipLimits: {
        ...this.settings.columnGroupWipLimits,
        ...updates.columnGroupWipLimits,
      },
    };

    await this.saveSettings();
  }

  /**
   * Включает или выключает цвета колонок
   * @param enabled - Включить цвета колонок
   */
  async setColumnColorsEnabled(enabled: boolean): Promise<void> {
    this.settings.columnColors.enabled = enabled;
    await this.saveSettings();
  }

  /**
   * Устанавливает кастомный цвет для исполнителя
   * @param assigneeId - ID исполнителя
   * @param color - Цвет в формате HEX или RGBA
   */
  async setAssigneeColor(assigneeId: string, color: string): Promise<void> {
    if (!this.settings.assigneeHighlight) {
      this.settings.assigneeHighlight = {
        enabled: false,
        visualizationType: 'stripe',
        autoColors: true,
        customColors: {},
        customBackgroundColors: {},
        highlightUnassigned: true,
        unassignedColor: 'rgba(0, 0, 0, 0.5)',
        unassignedBackgroundColor: 'rgba(0, 0, 0, 0.1)',
      };
    }
    this.settings.assigneeHighlight.customColors[assigneeId] = color;
    await this.saveSettings();
  }

  /**
   * Устанавливает цвет для WIP-лимита
   * @param limitId - ID лимита
   * @param color - Цвет в формате HEX
   */
  async setWipLimitColor(limitId: string, color: string): Promise<void> {
    if (this.settings.personalWipLimits?.limits) {
      const index = this.settings.personalWipLimits.limits.findIndex(l => l.id === limitId);
      if (index !== -1) {
        this.settings.personalWipLimits.limits[index].color = color;
        await this.saveSettings();
      }
    }
  }

  /**
   * Сохраняет настройки
   */
  async saveSettings(): Promise<void> {
    // Сохраняем в localStorage всегда (fallback)
    this.saveToLocalStorage();

    // Пробуем сохранить в Jira API
    if (this.useJiraApi && this.jiraStorage) {
      try {
        await this.jiraStorage.set(SETTINGS_KEYS.PERSON_LIMITS, {
          enabled: this.settings.personalWipLimits.enabled,
          limits: this.settings.personalWipLimits.limits,
        });

        await this.jiraStorage.set(SETTINGS_KEYS.COLUMN_LIMITS, {
          enabled: this.settings.columnGroupWipLimits.enabled,
          limits: this.settings.columnGroupWipLimits.limits,
        });

        await this.jiraStorage.set(SETTINGS_KEYS.ASSIGNEE_HIGHLIGHTER, {
          enabled: this.settings.assigneeHighlight.enabled,
          visualizationType: this.settings.assigneeHighlight.visualizationType,
          autoColors: this.settings.assigneeHighlight.autoColors,
          customColors: this.settings.assigneeHighlight.customColors,
          customBackgroundColors: this.settings.assigneeHighlight.customBackgroundColors,
          highlightUnassigned: this.settings.assigneeHighlight.highlightUnassigned,
          unassignedColor: this.settings.assigneeHighlight.unassignedColor,
          unassignedBackgroundColor: this.settings.assigneeHighlight.unassignedBackgroundColor,
        });

        console.log('[SettingsService] Настройки сохранены в Jira Board Properties');
      } catch (error) {
        console.error('[SettingsService] Ошибка сохранения в Jira API:', error);
      }
    }
  }

  /**
   * Загружает настройки из Jira Board Properties
   */
  private async loadFromJira(): Promise<void> {
    if (!this.jiraStorage) return;

    try {
      // Загружаем персональные лимиты
      const personLimits = await this.jiraStorage.get<WipLimitSettings>(SETTINGS_KEYS.PERSON_LIMITS);
      if (personLimits) {
        this.settings.personalWipLimits = personLimits;
      }

      // Загружаем групповые лимиты
      const columnLimits = await this.jiraStorage.get<ColumnGroupWipLimitSettings>(SETTINGS_KEYS.COLUMN_LIMITS);
      if (columnLimits) {
        this.settings.columnGroupWipLimits = columnLimits;
      }

      // Загружаем настройки подсветки
      const assigneeHighlight = await this.jiraStorage.get<AssigneeHighlightSettings>(SETTINGS_KEYS.ASSIGNEE_HIGHLIGHTER);
      if (assigneeHighlight) {
        this.settings.assigneeHighlight = assigneeHighlight;
      }

      console.log('[SettingsService] Настройки загружены из Jira Board Properties');
    } catch (error) {
      console.error('[SettingsService] Ошибка загрузки из Jira API:', error);
      // Fallback на localStorage
      this.settings = this.loadFromLocalStorage();
    }
  }

  /**
   * Загружает настройки из localStorage
   */
  private loadFromLocalStorage(): Settings {
    try {
      const saved = localStorage.getItem('jira-helper-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          columnColors: parsed.columnColors || { enabled: false },
          assigneeHighlight: {
            enabled: parsed.assigneeHighlight?.enabled || false,
            visualizationType: parsed.assigneeHighlight?.visualizationType || 'stripe',
            autoColors: parsed.assigneeHighlight?.autoColors !== false,
            customColors: parsed.assigneeHighlight?.customColors || {},
            customBackgroundColors: parsed.assigneeHighlight?.customBackgroundColors || {},
            highlightUnassigned: parsed.assigneeHighlight?.highlightUnassigned !== false,
            unassignedColor: parsed.assigneeHighlight?.unassignedColor || 'rgba(0, 0, 0, 0.5)',
            unassignedBackgroundColor: parsed.assigneeHighlight?.unassignedBackgroundColor || 'rgba(0, 0, 0, 0.1)',
          },
          assigneeOverload: parsed.assigneeOverload || {
            enabled: true,
            threshold: 2,
            borderColor: '#000000',
            borderWidth: '3px',
          },
          personalWipLimits: parsed.personalWipLimits || {
            enabled: false,
            limits: [],
          },
          columnGroupWipLimits: parsed.columnGroupWipLimits || {
            enabled: false,
            limits: [],
          },
        };
      }
    } catch (error) {
      console.error('[SettingsService] Ошибка загрузки из localStorage:', error);
    }

    return this.getDefaultSettings();
  }

  /**
   * Сохраняет настройки в localStorage
   */
  private saveToLocalStorage(): void {
    try {
      localStorage.setItem('jira-helper-settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('[SettingsService] Ошибка сохранения в localStorage:', error);
    }
  }

  private getDefaultSettings(): Settings {
    return {
      columnColors: {
        enabled: false,
      },
      assigneeHighlight: {
        enabled: false,
        visualizationType: 'stripe',
        autoColors: true,
        customColors: {},
        customBackgroundColors: {},
        highlightUnassigned: true,
        unassignedColor: 'rgba(0, 0, 0, 0.5)',
        unassignedBackgroundColor: 'rgba(0, 0, 0, 0.1)',
      },
      assigneeOverload: {
        enabled: true,
        threshold: 2,
        borderColor: '#000000',
        borderWidth: '3px',
      },
      personalWipLimits: {
        enabled: false,
        limits: [],
      },
      columnGroupWipLimits: {
        enabled: false,
        limits: [],
      },
    };
  }
}
