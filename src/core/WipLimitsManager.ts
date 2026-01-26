import { settingsManager } from './SettingsManager';
import { columnManager } from './ColumnManager';
import { assigneeManager } from './AssigneeManager';

export interface WipLimit {
  id: string;
  userId: string;
  userName: string;
  columnIds: string[];
  columnNames: string[];
  limit: number;
}

export class WipLimitsManager {
  private enabled = false;
  private limits: WipLimit[] = [];

  init() {
    this.loadSettings();
    return this;
  }

  private loadSettings() {
    const settings = settingsManager.getSettings();
    this.enabled = settings.personalWipLimits?.enabled || false;
    this.limits = settings.personalWipLimits?.limits || [];
  }

  update() {
    if (!this.enabled || this.limits.length === 0) {
      this.clearWipIndicators();
      return;
    }

    console.log('[WipLimitsManager] Проверяем WIP лимиты...');
    
    this.limits.forEach(limit => {
      const { exceeded, currentCount } = this.checkLimit(limit);
      
      if (exceeded) {
        console.log(`⚠️ ${limit.userName} превысил лимит: ${currentCount}/${limit.limit} в колонках ${limit.columnNames.join(', ')}`);
        this.markAssigneeAsOverloaded(limit.userId, true);
      } else {
        this.markAssigneeAsOverloaded(limit.userId, false);
      }
    });
  }

  private checkLimit(limit: WipLimit): { exceeded: boolean; currentCount: number } {
    try {
      const cards = this.getAllCards();
      const assigneeCards = cards.filter(card => {
        const cardAssigneeId = assigneeManager.getCardAssigneeId(card);
        return cardAssigneeId === limit.userId;
      });

      // Фильтруем по выбранным колонкам
      const cardsInLimitedColumns = assigneeCards.filter(card => {
        const columnId = columnManager.getCardColumnId(card);
        return columnId && limit.columnIds.includes(columnId);
      });

      return {
        exceeded: cardsInLimitedColumns.length > limit.limit,
        currentCount: cardsInLimitedColumns.length
      };

    } catch (error) {
      console.error('[WipLimitsManager] Ошибка проверки:', error);
      return { exceeded: false, currentCount: 0 };
    }
  }

  private getAllCards(): HTMLElement[] {
    const BoardPagePageObject = (window as any).JiraHelper?.BoardPagePageObject;
    if (BoardPagePageObject) {
      return Array.from(BoardPagePageObject.getAllCloudCards() || []);
    }
    return [];
  }

  private markAssigneeAsOverloaded(assigneeId: string, overloaded: boolean) {
    // Просто помечаем карточки специальным атрибутом
    const cards = this.getAllCards();
    
    cards.forEach(card => {
      const cardAssigneeId = assigneeManager.getCardAssigneeId(card);
      if (cardAssigneeId === assigneeId) {
        if (overloaded) {
          card.setAttribute('data-jh-wip-overloaded', 'true');
          // Добавляем специальный класс для CSS
          card.classList.add('jh-wip-overloaded');
        } else {
          card.removeAttribute('data-jh-wip-overloaded');
          card.classList.remove('jh-wip-overloaded');
        }
      }
    });
  }

  private clearWipIndicators() {
    document.querySelectorAll('[data-jh-wip-overloaded]').forEach(card => {
      card.removeAttribute('data-jh-wip-overloaded');
      card.classList.remove('jh-wip-overloaded');
    });
  }

  // Метод для проверки конкретного пользователя
  isAssigneeOverloaded(assigneeId: string): boolean {
    const limit = this.limits.find(l => l.userId === assigneeId);
    if (!limit) return false;
    
    return this.checkLimit(limit).exceeded;
  }
}

export const wipLimitsManager = new WipLimitsManager();