// src/cloud/features/column-limits/ColumnLimitsApplier.ts
// Applier для групповых WIP-лимитов колонок в Jira Cloud

import { settingsService } from '../../shared/SettingsService';
import { columnService } from '../../shared/ColumnService';
import { assigneeService } from '../../shared/AssigneeService';
import { avatarIndicatorService } from '../../shared/AvatarIndicatorService';
import { ColumnGroupLimitPanel, columnGroupLimitPanel } from './ColumnGroupLimitPanel';

export interface ColumnGroupWipLimit {
  id: string;
  name: string;
  columnIds: string[];
  columnNames: string[];
  limit: number;
  baseColor: string;
  warningColor?: string;
}

export class ColumnLimitsApplier {
  private enabled = false;
  private limits: ColumnGroupWipLimit[] = [];

  init() {
    this.loadSettings();
    return this;
  }

  private loadSettings() {
    const settings = settingsService.getSettings();
    this.enabled = settings.columnGroupWipLimits?.enabled || false;
    this.limits = settings.columnGroupWipLimits?.limits || [];
  }

  update() {
    this.loadSettings();
    
    const processedGroups = columnGroupLimitPanel.getProcessedGroups();
    const activeGroupIds = new Set(this.limits.map(g => g.id));
    processedGroups.forEach((groupId: string) => {
      if (!activeGroupIds.has(groupId)) {
        columnGroupLimitPanel.removeGroupVisualization(groupId);
      }
    });
    
    if (!this.enabled || this.limits.length === 0) {
      this.clearGroupIndicators();
      return;
    }

    console.log('[ColumnLimitsApplier] Загружено групп:', this.limits.length);
    
    this.limits.forEach(group => {
      const { 
        exceeded, 
        currentCount,
        cardsInGroup 
      } = this.checkGroupLimit(group);
      
      console.log(`Группа "${group.name}": ${currentCount}/${group.limit}, exceeded=${exceeded}`);
      
      if (exceeded) {
        console.log(`⚠️ Группа "${group.name}" превысила лимит: ${currentCount}/${group.limit}`);
        
        this.applyGroupVisualization(group, exceeded, currentCount);
        
      } else {
        console.log(`✅ Группа "${group.name}" в рамках лимита: ${currentCount}/${group.limit}`);
        
        avatarIndicatorService.removeIndicatorsByType('group-wip-overload');
        
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
      
      console.log(`[DEBUG] Группа "${group.name}" ищет колонки:`, group.columnIds);
      
      cards.forEach(card => {
        const columnId = columnService.getCardColumnId(card);
        
        if (columnId) {
          const matches = group.columnIds.includes(columnId);
          
          if (matches) {
            cardsInGroup.push(card);
          }
        }
      });

      return {
        exceeded: cardsInGroup.length > group.limit,
        currentCount: cardsInGroup.length,
        cardsInGroup: cardsInGroup
      };

    } catch (error) {
      console.error('[ColumnLimitsApplier] Ошибка проверки:', error);
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
      const cardAssignee = assigneeService.getAssigneeForCard(card);
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
    
    columnGroupLimitPanel.updateGroup(group, exceeded, currentCount);
  }

  private getAllCards(): HTMLElement[] {
    const BoardPagePageObject = (window as any).JiraHelper?.BoardPagePageObject;
    if (BoardPagePageObject) {
      return Array.from(BoardPagePageObject.getAllCloudCards() || []);
    }
    return [];
  }

  private clearGroupIndicators() {
    avatarIndicatorService.removeIndicatorsByType('group-wip-overload');
  }

  isGroupOverloaded(groupId: string): boolean {
    const group = this.limits.find(g => g.id === groupId);
    if (!group) return false;
    
    return this.checkGroupLimit(group).exceeded;
  }
}

export const columnLimitsApplier = new ColumnLimitsApplier();

// Глобальный экспорт
if (!window.JiraHelper) window.JiraHelper = {};
window.JiraHelper.GroupWipLimitsManager = columnLimitsApplier;
window.JiraHelper.ColumnLimitsApplier = columnLimitsApplier;
