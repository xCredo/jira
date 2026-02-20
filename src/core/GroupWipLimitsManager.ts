// src/core/GroupWipLimitsManager.ts
import { settingsManager } from './SettingsManager';
import { columnManager } from './ColumnManager';
import { assigneeManager } from './AssigneeManager';
import { avatarIndicatorManager } from './AvatarIndicatorManager';

export interface ColumnGroupWipLimit {
  id: string;
  name: string;                    // "В разработке", "На проверке"
  columnIds: string[];            // ID колонок
  columnNames: string[];          // Названия колонок
  limit: number;                  // Лимит задач
  baseColor: string;              // Базовый цвет фона
  warningColor?: string;          // Цвет при превышении
}

export class GroupWipLimitsManager {
  private enabled = false;
  private limits: ColumnGroupWipLimit[] = [];

  init() {
    this.loadSettings();
    return this;
  }

  private loadSettings() {
    const settings = settingsManager.getSettings();
    this.enabled = settings.columnGroupWipLimits?.enabled || false;
    this.limits = settings.columnGroupWipLimits?.limits || [];
  }

  update() {
    this.loadSettings();
    
    // Очищаем визуализацию удалённых групп
    const visualizer = window.JiraHelper?.ColumnGroupVisualizer;
    if (visualizer && visualizer.processedGroups) {
      const activeGroupIds = new Set(this.limits.map(g => g.id));
      visualizer.processedGroups.forEach((groupId: string) => {
        if (!activeGroupIds.has(groupId)) {
          visualizer.removeGroupVisualization(groupId);
        }
      });
    }
    
    if (!this.enabled || this.limits.length === 0) {
      this.clearGroupIndicators();
      return;
    }

    console.log('[GroupWipLimitsManager] Загружено групп:', this.limits.length);
    
    this.limits.forEach(group => {
      const { 
        exceeded, 
        currentCount,
        cardsInGroup 
      } = this.checkGroupLimit(group);
      
      console.log(`Группа "${group.name}": ${currentCount}/${group.limit}, exceeded=${exceeded}`);
      
      if (exceeded) {
        console.log(`⚠️ Группа "${group.name}" превысила лимит: ${currentCount}/${group.limit}`);
        
        const affectedUsers = this.findUsersInGroupCards(cardsInGroup);
        
        affectedUsers.forEach(userId => {
          avatarIndicatorManager.addIndicator(userId, {
            type: 'group-wip-overload',
            color: group.warningColor || '#FF0000',
            tooltip: `Группа "${group.name}" превысила лимит: ${currentCount}/${group.limit}`,
            position: 'left'
          });
        });

        this.applyGroupVisualization(group, exceeded, currentCount);
        
      } else {
        console.log(`✅ Группа "${group.name}" в рамках лимита: ${currentCount}/${group.limit}`);
        
        avatarIndicatorManager.removeIndicatorsByType('group-wip-overload');
        
        this.applyGroupVisualization(group, false, currentCount);
      }
    });
  }

  private checkGroupLimit(group: ColumnGroupWipLimit): { 
    exceeded: boolean; 
    currentCount: number;
    cardsInGroup: HTMLElement[];
  } {
    try {
      const cards = this.getAllCards();
      const cardsInGroup: HTMLElement[] = [];
      
      cards.forEach(card => {
        const columnId = columnManager.getCardColumnId(card);
        if (columnId && group.columnIds.includes(columnId)) {
          cardsInGroup.push(card);
        }
      });

      return {
        exceeded: cardsInGroup.length > group.limit,
        currentCount: cardsInGroup.length,
        cardsInGroup: cardsInGroup
      };

    } catch (error) {
      console.error('[GroupWipLimitsManager] Ошибка проверки:', error);
      return { 
        exceeded: false, 
        currentCount: 0,
        cardsInGroup: []
      };
    }
  }

  private findUsersInGroupCards(cards: HTMLElement[]): string[] {
    const userIds = new Set<string>();
    
    cards.forEach(card => {
      const cardAssignee = assigneeManager.getAssigneeForCard(card);
      if (cardAssignee?.id) {
        userIds.add(cardAssignee.id);
      }
    });
    
    return Array.from(userIds);
  }

  private applyGroupVisualization(
    group: ColumnGroupWipLimit, 
    exceeded: boolean, 
    currentCount: number
    ) {
    console.log(`[DEBUG] Визуализация группы "${group.name}"`);
    console.log(`[DEBUG] ColumnGroupVisualizer доступен?`, window.JiraHelper?.ColumnGroupVisualizer);
    console.log(`[DEBUG] Все ключи в JiraHelper:`, Object.keys(window.JiraHelper || {}));
    
    // Пробуем вызвать ColumnGroupVisualizer
    const visualizer = window.JiraHelper?.ColumnGroupVisualizer;
    
    if (visualizer && typeof visualizer.updateGroup === 'function') {
        console.log(`[DEBUG] Вызываем visualizer.updateGroup`);
        visualizer.updateGroup(group, exceeded, currentCount);
    } else {
        console.error(`[DEBUG] ColumnGroupVisualizer не доступен или не имеет метода updateGroup`);
        console.error(`[DEBUG] visualizer =`, visualizer);
        console.error(`[DEBUG] typeof updateGroup =`, typeof visualizer?.updateGroup);
    }
    }

  private getAllCards(): HTMLElement[] {
    const BoardPagePageObject = (window as any).JiraHelper?.BoardPagePageObject;
    if (BoardPagePageObject) {
      return Array.from(BoardPagePageObject.getAllCloudCards() || []);
    }
    return [];
  }

  private clearGroupIndicators() {
    // Очищаем все индикаторы групп
    avatarIndicatorManager.removeIndicatorsByType('group-wip-overload');
    
    // TODO: Очистить визуализацию групп
  }

  // Метод для проверки конкретной группы
  isGroupOverloaded(groupId: string): boolean {
    const group = this.limits.find(g => g.id === groupId);
    if (!group) return false;
    
    return this.checkGroupLimit(group).exceeded;
  }
}

export const groupWipLimitsManager = new GroupWipLimitsManager();

// Глобальный экспорт
/* if (!window.JiraHelper) window.JiraHelper = {};
window.JiraHelper.GroupWipLimitsManager = groupWipLimitsManager;
console.log('[Jira Helper] GroupWipLimitsManager экспортирован в window.JiraHelper'); */