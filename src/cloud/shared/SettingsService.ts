// src/cloud/shared/SettingsService.ts
// Сервис настроек для Jira Cloud

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
 * Хранит настройки в localStorage и предоставляет доступ к ним.
 */
export class SettingsService {
  private settings: Settings;

  constructor() {
    this.settings = this.loadSettings();
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
  updateSettings(updates: Partial<Settings>): void {
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

    this.saveSettings();
  }

  /**
   * Включает или выключает цвета колонок
   * @param enabled - Включить цвета колонок
   */
  setColumnColorsEnabled(enabled: boolean): void {
    this.settings.columnColors.enabled = enabled;
    this.saveSettings();
  }

  /**
   * Устанавливает кастомный цвет для исполнителя
   * @param assigneeId - ID исполнителя
   * @param color - Цвет в формате HEX или RGBA
   */
  setAssigneeColor(assigneeId: string, color: string): void {
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
    this.saveSettings();
  }

  /**
   * Устанавливает цвет для WIP-лимита
   * @param limitId - ID лимита
   * @param color - Цвет в формате HEX
   */
  setWipLimitColor(limitId: string, color: string): void {
    if (this.settings.personalWipLimits?.limits) {
      const index = this.settings.personalWipLimits.limits.findIndex(l => l.id === limitId);
      if (index !== -1) {
        this.settings.personalWipLimits.limits[index].color = color;
        this.saveSettings();
      }
    }
  }

  private loadSettings(): Settings {
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
      console.error('[SettingsService] Ошибка загрузки настроек:', error);
    }

    return this.getDefaultSettings();
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

  public saveSettings(): void {
    try {
      localStorage.setItem('jira-helper-settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('[SettingsService] Ошибка сохранения настроек:', error);
    }
  }
}

// Экспорт экземпляра для обратной совместимости (будет удалён после полной миграции)
// Используйте DI-контейнер вместо прямого импорта
export const settingsService = new SettingsService();
