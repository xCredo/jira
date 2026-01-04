// src/core/SettingsManager.ts
export interface AssigneeHighlightSettings {
  enabled: boolean;
  visualizationType: 'stripe' | 'background' | 'border';
  autoColors: boolean;

  customColors: Record<string, string>;          // Цвет рамки/полоски (полный)
  customBackgroundColors: Record<string, string>; // Цвет фона (с прозрачностью)
  
  highlightUnassigned: boolean;
  unassignedColor: string;                       // Цвет для "Не назначено" (рамка/полоска)
  unassignedBackgroundColor: string;            // Фон для "Не назначено"
}

export interface ColumnColorsSettings {
  enabled: boolean;
}

export interface Settings {
  columnColors: ColumnColorsSettings;
  assigneeHighlight: AssigneeHighlightSettings;
}

export class SettingsManager {
  private static instance: SettingsManager;
  private settings: Settings;

  private constructor() {
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
        ...updates.assigneeHighlight
      }
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

  private loadSettings(): Settings {
    try {
      const saved = localStorage.getItem('jira-helper-settings');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('[Jira Helper] Ошибка загрузки настроек:', error);
    }

    // Настройки по умолчанию
    return {
    columnColors: {
        enabled: false
    },
    assigneeHighlight: {
        enabled: false,
        visualizationType: 'stripe',
        autoColors: true,
        customColors: {},           // Для рамки/полоски
        customBackgroundColors: {}, // Для фона
        highlightUnassigned: true,
        unassignedColor: 'rgba(0, 0, 0, 0.5)',      // Чёрный 50% для рамки
        unassignedBackgroundColor: 'rgba(0, 0, 0, 0.1)' // Чёрный 20% для фона
    }
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