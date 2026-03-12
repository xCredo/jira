// src/cloud/features/person-limits/PersonLimitsApplier.ts
// Applier для персональных WIP-лимитов в Jira Cloud

import { settingsService } from '../../shared/SettingsService';
import { columnService } from '../../shared/ColumnService';
import { assigneeService, Assignee } from '../../shared/AssigneeService';
import { avatarIndicatorService } from '../../shared/AvatarIndicatorService';

export interface WipLimit {
  id: string;
  userId: string;
  userName: string;
  columnIds: string[];
  columnNames: string[];
  limit: number;
  color?: string;
}

export class PersonLimitsApplier {
  private enabled = false;
  private limits: WipLimit[] = [];

  init() {
    this.loadSettings();
    return this;
  }

  private loadSettings() {
    const settings = settingsService.getSettings();
    this.enabled = settings.personalWipLimits?.enabled || false;
    this.limits = settings.personalWipLimits?.limits || [];
  }

  update() {
    this.loadSettings();
    if (!this.enabled || this.limits.length === 0) {
      this.clearWipIndicators();
      return;
    }

    console.log('[PersonLimitsApplier] Загружено лимитов:', this.limits.length);
    
    this.limits.forEach(limit => {
      const { 
        exceeded, 
        currentCount, 
        cardsInLimitedColumns, 
        allUserCards 
      } = this.checkLimit(limit);
      
      if (exceeded) {
        console.log(`⚠️ ${limit.userName} превысил лимит: ${currentCount}/${limit.limit}`);
        
        avatarIndicatorService.addIndicator(limit.userId, {
          type: 'wip-overload',
          color: limit.color || '#FF0000',
          tooltip: `${limit.userName} превысил WIP-лимит: ${currentCount}/${limit.limit}`
        });

        cardsInLimitedColumns.forEach(card => {
          this.markCardAsOverloaded(card, true, limit.color);
        });
        
        allUserCards.forEach(card => {
          if (!cardsInLimitedColumns.includes(card)) {
            this.markCardAsOverloaded(card, false);
          }
        });
        
      } else {
        console.log(`✅ ${limit.userName} в рамках лимита: ${currentCount}/${limit.limit}`);
        
        avatarIndicatorService.removeIndicator(limit.userId, 'wip-overload');

        allUserCards.forEach(card => {
          this.markCardAsOverloaded(card, false);
        });
      }
    });
  }

  private checkLimit(limit: WipLimit): { 
    exceeded: boolean; 
    currentCount: number; 
    cardsInLimitedColumns: HTMLElement[];
    allUserCards: HTMLElement[] 
  } {
    try {
      const cards = this.getAllCards();
      const userCards: HTMLElement[] = [];
      const cardsInLimitedColumns: HTMLElement[] = [];
      let cardsInLimitedColumnsCount = 0;
      
      cards.forEach(card => {
        const cardAssignee = assigneeService.getAssigneeForCard(card);
        if (cardAssignee?.id === limit.userId) {
          userCards.push(card);
          const columnId = columnService.getCardColumnId(card);
          if (columnId && limit.columnIds.includes(columnId)) {
            cardsInLimitedColumnsCount++;
            cardsInLimitedColumns.push(card);
          }
        }
      });

      return {
        exceeded: cardsInLimitedColumnsCount > limit.limit,
        currentCount: cardsInLimitedColumnsCount,
        cardsInLimitedColumns: cardsInLimitedColumns,
        allUserCards: userCards
      };

    } catch (error) {
      console.error('[PersonLimitsApplier] Ошибка проверки:', error);
      return { 
        exceeded: false, 
        currentCount: 0, 
        cardsInLimitedColumns: [], 
        allUserCards: [] 
      };
    }
  }

  private getAllCards(): HTMLElement[] {
    const BoardPagePageObject = (window as any).JiraHelper?.BoardPagePageObject;
    if (BoardPagePageObject) {
      return Array.from(BoardPagePageObject.getAllCloudCards() || []);
    }
    return [];
  }

  private markCardAsOverloaded(card: HTMLElement, overloaded: boolean, color?: string) {
    if (overloaded && color) {
      card.setAttribute('data-jh-wip-overloaded', 'true');
      card.setAttribute('data-jh-wip-color', color);
      card.classList.add('jh-wip-overloaded', 'jh-wip-overloaded-active');
      
      const rgb = this.hexToRgb(color);
      card.style.setProperty('--wip-custom-color', color, 'important');
      card.style.setProperty('--wip-r', rgb.r.toString(), 'important');
      card.style.setProperty('--wip-g', rgb.g.toString(), 'important');
      card.style.setProperty('--wip-b', rgb.b.toString(), 'important');
      
      this.applyWipHighlight(card, color);
    } else {
      card.removeAttribute('data-jh-wip-overloaded');
      card.removeAttribute('data-jh-wip-color');
      card.classList.remove('jh-wip-overloaded', 'jh-wip-overloaded-active');
      
      card.style.removeProperty('--wip-custom-color');
      card.style.removeProperty('--wip-r');
      card.style.removeProperty('--wip-g');
      card.style.removeProperty('--wip-b');
      
      this.removeWipHighlight(card);
    }
  }

  private applyWipHighlight(card: HTMLElement, color: string) {
    if (!color) {
      color = '#808080';
    }
    
    const innerCard = this.getInnerCard(card);
    
    this.clearAssigneeHighlight(card);
    
    card.classList.add('jh-wip-overloaded-active');
    
    innerCard.style.setProperty('border-left', `10px solid ${color}`, 'important');
    innerCard.style.setProperty('padding-left', '10px', 'important');
    
    const bgColor = this.hexToRgba(color, 0.4);
    innerCard.style.setProperty('background-color', bgColor, 'important');
    innerCard.style.setProperty('background', bgColor, 'important');
    
    innerCard.style.setProperty('border', `5px solid ${color}`, 'important');
    innerCard.style.setProperty('border-radius', '6px', 'important');
    innerCard.style.setProperty('box-shadow', 
      `0 0 0 3px ${this.hexToRgba(color, 0.3)}, 0 0 15px ${this.hexToRgba(color, 0.2)}`, 
      'important');
    
    this.addWarningIcon(innerCard, color);
  }

  private addWarningIcon(element: HTMLElement, color: string) {
    const oldIcon = element.querySelector('.jh-wip-warning-icon');
    if (oldIcon) oldIcon.remove();
    
    const icon = document.createElement('div');
    icon.className = 'jh-wip-warning-icon';
    icon.innerHTML = '⚠️';
    icon.style.cssText = `
      position: absolute !important;
      top: 8px !important;
      right: 8px !important;
      font-size: 16px !important;
      z-index: 10000 !important;
      pointer-events: none !important;
      opacity: 0.9 !important;
    `;
    
    element.appendChild(icon);
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    if (hex.startsWith('#')) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return { r, g, b };
    }
    return { r: 128, g: 128, b: 128 };
  }

  private hexToRgba(hex: string, alpha: number): string {
    if (hex.startsWith('rgba')) {
      return hex.replace(/[\d.]+\)$/g, `${alpha})`);
    }
    
    if (hex.startsWith('#')) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    
    return `rgba(128, 128, 128, ${alpha})`;
  }

  private removeWipHighlight(card: HTMLElement) {
    const innerCard = this.getInnerCard(card);
    
    const warningIcon = innerCard.querySelector('.jh-wip-warning-icon');
    if (warningIcon) warningIcon.remove();
    
    innerCard.style.borderLeft = '';
    innerCard.style.paddingLeft = '';
    innerCard.style.backgroundColor = '';
    innerCard.style.background = '';
    innerCard.style.border = '';
    innerCard.style.borderRadius = '';
    innerCard.style.boxShadow = '';
  }

  private clearAssigneeHighlight(card: HTMLElement) {
    const innerCard = this.getInnerCard(card);
    
    const stripe = innerCard.querySelector('.jira-helper-assignee-stripe');
    if (stripe) stripe.remove();
    
    if (innerCard.hasAttribute('data-assignee-highlight')) {
      innerCard.style.backgroundColor = '';
      innerCard.style.border = '';
      innerCard.style.borderRadius = '';
    }
  }

  private getInnerCard(card: HTMLElement): HTMLElement {
    return card.querySelector<HTMLElement>(
      '[data-testid="software-context-menu.ui.context-menu.children-wrapper"] > div'
    ) || card;
  }

  private clearWipIndicators() {
    document.querySelectorAll('[data-jh-wip-overloaded]').forEach(card => {
      card.removeAttribute('data-jh-wip-overloaded');
      card.removeAttribute('data-jh-wip-color');
      card.classList.remove('jh-wip-overloaded');
      this.removeWipHighlight(card as HTMLElement);
    });
  }

  isAssigneeOverloaded(assigneeId: string): boolean {
    const limit = this.limits.find(l => l.userId === assigneeId);
    if (!limit) return false;
    
    return this.checkLimit(limit).exceeded;
  }
}

export const personLimitsApplier = new PersonLimitsApplier();

// Глобальный экспорт
if (!window.JiraHelper) window.JiraHelper = {};
window.JiraHelper.wipLimitsManager = personLimitsApplier;
window.JiraHelper.PersonLimitsApplier = personLimitsApplier;
