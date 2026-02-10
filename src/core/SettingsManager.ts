// src/core/SettingsManager.ts
export interface AssigneeHighlightSettings {
  enabled: boolean;
  visualizationType: 'stripe' | 'background' | 'border';
  autoColors: boolean;

  customColors: Record<string, string>; // Цвет рамки/полоски (полный)
  customBackgroundColors: Record<string, string>; // Цвет фона (с прозрачностью)

  highlightUnassigned: boolean;
  unassignedColor: string; // Цвет для "Не назначено" (рамка/полоска)
  unassignedBackgroundColor: string; // Фон для "Не назначено"
}

export interface ColumnColorsSettings {
  enabled: boolean;
}

// ДОБАВИТЬ: Интерфейс для WIP-лимитов
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

// Интерфейс для WIP-лимитов на группы колонок
export interface ColumnGroupWipLimitSettings {
  enabled: boolean;
  limits: Array<{
    id: string;
    name: string;                    // "В разработке", "На проверке"
    columnIds: string[];            // ID колонок
    columnNames: string[];          // Названия колонок
    limit: number;                  // Лимит задач
    baseColor: string;              // Базовый цвет фона (#E3F2FD)
    warningColor?: string;          // Цвет при превышении (по умолчанию красный)
  }>;
}

export interface Settings {
  columnColors: ColumnColorsSettings;
  assigneeHighlight: AssigneeHighlightSettings;
  assigneeOverload: {
    enabled: boolean;
    threshold: number; // Минимальное количество задач для перегрузки (по умолчанию 2)
    borderColor: string; // Цвет рамки (по умолчанию #000000)
    borderWidth: string; // Толщина рамки (по умолчанию 3px)
  };
  personalWipLimits: WipLimitSettings;
  columnGroupWipLimits: ColumnGroupWipLimitSettings;
}

export class SettingsManager {
  private static instance: SettingsManager;

  private settings: Settings;

  constructor() {
    this.settings = this.loadSettings();
  }

  static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  getSettings(): Settings {
    return { ...this.settings };
  }

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

  // Для обратной совместимости с фичей "Колонки"
  setColumnColorsEnabled(enabled: boolean): void {
    this.settings.columnColors.enabled = enabled;
    this.saveSettings();
  }

  // Для кастомных цветов исполнителей
  setAssigneeColor(assigneeId: string, color: string): void {
    this.settings.assigneeHighlight.customColors[assigneeId] = color;
    this.saveSettings();
  }

  // Метод для обновления цвета WIP-лимита
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
        // Обеспечиваем обратную совместимость
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
          // ДОБАВИТЬ: Настройки WIP-лимитов
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
      console.error('[Jira Helper] Ошибка загрузки настроек:', error);
    }

    // Настройки по умолчанию (ПОЛНЫЙ объект)
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
      console.error('[Jira Helper] Ошибка сохранения настроек:', error);
    }
  }
}

export const settingsManager = SettingsManager.getInstance();

if (typeof window !== 'undefined') {
  (window as any).JiraHelper = (window as any).JiraHelper || {};
  (window as any).JiraHelper.settingsManager = settingsManager;
}