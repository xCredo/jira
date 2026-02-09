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
  color?: string; // ← ДОБАВИТЬ ЦВЕТ
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
    this.loadSettings()
    if (!this.enabled || this.limits.length === 0) {
      console.log('!this.enabled || this.limits.length === 0')
      console.log(!this.enabled);
      console.log(this.limits.length);
      this.clearWipIndicators();
      return;
    }

    console.log('[WipLimitsManager] Загружено лимитов:', this.limits.length);
    console.log('[WipLimitsManager] Проверяем WIP лимиты...');
    
    this.limits.forEach(limit => {
      console.log(`  - ${limit.userName}: цвет=${limit.color}, лимит=${limit.limit}`);
      const { 
        exceeded, 
        currentCount, 
        cardsInLimitedColumns, 
        allUserCards 
      } = this.checkLimit(limit);
      
      console.log(`    Карточек пользователя: ${allUserCards.length}, в выбранных колонках: ${currentCount}`);
      
      if (exceeded) {
        console.log(`⚠️ ${limit.userName} превысил лимит: ${currentCount}/${limit.limit} в колонках ${limit.columnNames.join(', ')}`);
        
        // Красим ТОЛЬКО карточки в выбранных колонках
        cardsInLimitedColumns.forEach(card => {
          this.markCardAsOverloaded(card, true, limit.color);
        });
        
        // Очищаем остальные карточки пользователя (если они были окрашены ранее)
        allUserCards.forEach(card => {
          if (!cardsInLimitedColumns.includes(card)) {
            this.markCardAsOverloaded(card, false);
          }
        });
        
      } else {
        // Снимаем окраску со ВСЕХ карточек пользователя
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
        const cardAssignee = assigneeManager.getAssigneeForCard(card);
        if (cardAssignee?.id === limit.userId) {
          userCards.push(card);
          
          // Проверяем колонку
          const columnId = columnManager.getCardColumnId(card);
          if (columnId && limit.columnIds.includes(columnId)) {
            cardsInLimitedColumnsCount++;
            cardsInLimitedColumns.push(card); //
          }
        }
      });

      return {
        exceeded: cardsInLimitedColumnsCount > limit.limit,
        currentCount: cardsInLimitedColumnsCount,
        cardsInLimitedColumns: cardsInLimitedColumns, //
        allUserCards: userCards
      };

    } catch (error) {
      console.error('[WipLimitsManager] Ошибка проверки:', error);
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

  /* private markAssigneeAsOverloaded(assigneeId: string, overloaded: boolean, color?: string) {
    const cards = this.getAllCards();
    
    cards.forEach(card => {
      const cardAssignee = assigneeManager.getAssigneeForCard(card);
      if (cardAssignee?.id === assigneeId) {
        if (overloaded && color) {
          card.setAttribute('data-jh-wip-overloaded', 'true');
          card.setAttribute('data-jh-wip-color', color);
          card.classList.add('jh-wip-overloaded', 'jh-wip-overloaded-active');
          
          // Устанавливаем CSS переменные
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
          
          // Удаляем CSS переменные
          card.style.removeProperty('--wip-custom-color');
          card.style.removeProperty('--wip-r');
          card.style.removeProperty('--wip-g');
          card.style.removeProperty('--wip-b');
          
          this.removeWipHighlight(card);
        }
      }
    });
  } */

  private markCardAsOverloaded(card: HTMLElement, overloaded: boolean, color?: string) {
    if (overloaded && color) {
      card.setAttribute('data-jh-wip-overloaded', 'true');
      card.setAttribute('data-jh-wip-color', color);
      card.classList.add('jh-wip-overloaded', 'jh-wip-overloaded-active');
      
      // Устанавливаем CSS переменные
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
      
      // Удаляем CSS переменные
      card.style.removeProperty('--wip-custom-color');
      card.style.removeProperty('--wip-r');
      card.style.removeProperty('--wip-g');
      card.style.removeProperty('--wip-b');
      
      this.removeWipHighlight(card);
    }
  }

  private applyWipHighlight(card: HTMLElement, color: string) {
    if (!color) {
      console.warn('[WipLimitsManager] Цвет не указан, использую серый');
      color = '#808080';
    }
    
    console.log(`[WipLimitsManager] Применяю цвет ${color} к карточке`, card);
    
    const innerCard = this.getInnerCard(card);
    
    // ОЧИСТКА - удаляем ВСЕ существующие стили
    this.clearAssigneeHighlight(card);
    
    // ПРИМЕНЯЕМ СТИЛИ ЧЕРЕЗ CSS-КЛАСС, а не только inline
    card.classList.add('jh-wip-overloaded-active');
    
    // 1. УСИЛЕННАЯ ПОЛОСКА СЛЕВА
    innerCard.style.setProperty('border-left', `10px solid ${color}`, 'important');
    innerCard.style.setProperty('padding-left', '10px', 'important');
    
    // 2. ИНТЕНСИВНЫЙ ЦВЕТ ФОНА
    const bgColor = this.hexToRgba(color, 0.4); // 40% прозрачности
    innerCard.style.setProperty('background-color', bgColor, 'important');
    innerCard.style.setProperty('background', bgColor, 'important');
    
    // 3. ДВОЙНАЯ ЦВЕТНАЯ РАМКА
    innerCard.style.setProperty('border', `5px solid ${color}`, 'important');
    innerCard.style.setProperty('border-radius', '6px', 'important');
    innerCard.style.setProperty('box-shadow', 
      `0 0 0 3px ${this.hexToRgba(color, 0.3)}, 0 0 15px ${this.hexToRgba(color, 0.2)}`, 
      'important');
    
    // 4. ЗНАЧОК ПРЕДУПРЕЖДЕНИЯ
    this.addWarningIcon(innerCard, color);
  }

  private addWarningIcon(element: HTMLElement, color: string) {
    // Удаляем старый значок
    const oldIcon = element.querySelector('.jh-wip-warning-icon');
    if (oldIcon) oldIcon.remove();
    
    // Создаём новый
    const icon = document.createElement('div');
    icon.className = 'jh-wip-warning-icon';
    icon.innerHTML = '⚠️';
    icon.style.cssText = `
      position: absolute !important;
      top: 5px !important;
      right: 5px !important;
      font-size: 14px !important;
      background: white !important;
      border-radius: 50% !important;
      width: 22px !important;
      height: 22px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      border: 2px solid ${color} !important;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3) !important;
      z-index: 10000 !important;
      pointer-events: none !important;
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
    return { r: 128, g: 128, b: 128 }; // Серый по умолчанию
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
    
    return `rgba(128, 128, 128, ${alpha})`; // Серый по умолчанию
  }

  private removeWipHighlight(card: HTMLElement) {
    const innerCard = this.getInnerCard(card);
    
    // Удаляем значок предупреждения
    const warningIcon = innerCard.querySelector('.jh-wip-warning-icon');
    if (warningIcon) warningIcon.remove();
    
    // Очищаем стили
    innerCard.style.borderLeft = '';
    innerCard.style.paddingLeft = '';
    innerCard.style.backgroundColor = '';
    innerCard.style.background = '';
    innerCard.style.border = '';
    innerCard.style.borderRadius = '';
    innerCard.style.boxShadow = '';
  }

  private clearAssigneeHighlight(card: HTMLElement) {
    // Очищаем существующую подсветку исполнителя
    const innerCard = this.getInnerCard(card);
    
    // Удаляем полоску исполнителя
    const stripe = innerCard.querySelector('.jira-helper-assignee-stripe');
    if (stripe) stripe.remove();
    
    // Сбрасываем фон/рамку (если они были от исполнителя)
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

  private addAlpha(color: string, alpha: number): string {
    // Конвертация цвета в rgba с прозрачностью
    if (color.startsWith('rgba')) {
      return color.replace(/[\d.]+\)$/g, `${alpha})`);
    }
    
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    
    // По умолчанию серый с прозрачностью
    return `rgba(128, 128, 128, ${alpha})`;
  }

  private clearWipIndicators() {
    document.querySelectorAll('[data-jh-wip-overloaded]').forEach(card => {
      card.removeAttribute('data-jh-wip-overloaded');
      card.removeAttribute('data-jh-wip-color');
      card.classList.remove('jh-wip-overloaded');
      this.removeWipHighlight(card);
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

if (!window.JiraHelper) window.JiraHelper = {}
window.JiraHelper.WipLimitsManager = wipLimitsManager;