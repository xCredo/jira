// src/core/VisualizationManager.ts
import { settingsManager } from './SettingsManager';
import { assigneeManager, Assignee } from './AssigneeManager';

export class VisualizationManager {
  private static instance: VisualizationManager;
  private isEnabled = false;
  private observer: MutationObserver | null = null;
  private _paintTimeout: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): VisualizationManager {
    if (!VisualizationManager.instance) {
      VisualizationManager.instance = new VisualizationManager();
    }
    return VisualizationManager.instance;
  }

  // ГЛАВНЫЙ МЕТОД: Применить цвета исполнителей (как applyColumnColors)
  applyAssigneeColors(): void {
    if (!this.isEnabled) return;
    
    const doPaint = () => {
      try {
        const cards = this.getAllCards();
        
        // RETRY МЕХАНИЗМ: если карточек нет → пробуем через 300ms
        if (cards.length === 0) {
          if (this._paintTimeout) clearTimeout(this._paintTimeout);
          this._paintTimeout = setTimeout(doPaint, 300);
          return;
        }
        
        console.log(`[Jira Helper] Применяем цвета исполнителей к ${cards.length} карточкам`);
        
        // Красим каждую карточку
        cards.forEach(card => {
          this.paintCardByAssignee(card);
        });
        
      } catch (error) {
        console.error('[Jira Helper] Ошибка покраски исполнителей:', error);
      }
    };

    // Начинаем с задержкой 100ms (как в columnColors)
    setTimeout(doPaint, 100);
  }

  // Включить визуализацию (просто вызов applyAssigneeColors)
  enable(): void {
    if (this.isEnabled) return;
    
    console.log('[Jira Helper] Включение подсветки исполнителей');
    this.isEnabled = true;
    
    // Сразу применяем
    this.applyAssigneeColors();
    
    // Начинаем наблюдение за изменениями DOM
    this.startObservation();
    
    // Дополнительная проверка через 500ms (как в columnColors)
    setTimeout(() => {
      if (this.isEnabled) {
        this.applyAssigneeColors();
      }
    }, 500);
  }

  // Выключить визуализацию
  disable(): void {
    if (!this.isEnabled) return;
    
    console.log('[Jira Helper] Отключение подсветки исполнителей');
    this.isEnabled = false;
    
    // Очищаем таймаут
    if (this._paintTimeout) {
      clearTimeout(this._paintTimeout);
      this._paintTimeout = null;
    }
    
    // Удаляем визуализацию
    this.removeAllVisualizations();
    
    // Останавливаем наблюдение
    this.stopObservation();
  }

  // Покрасить карточку по исполнителю
  private paintCardByAssignee(card: HTMLElement): void {
    // Сначала очищаем предыдущую визуализацию
    this.removeVisualization(card);
    
    // Получаем исполнителя
    const assignee = assigneeManager.getAssigneeForCard(card);
    if (!assignee) return;
    
    // Получаем настройки
    const settings = settingsManager.getSettings();
    const vizType = settings.assigneeHighlight.visualizationType;
    
    // Применяем визуализацию
    switch (vizType) {
      case 'stripe':
        this.applyStripe(card, assignee);
        break;
      case 'background':
        this.applyBackground(card, assignee);
        break;
      case 'border':
        this.applyBorder(card, assignee);
        break;
    }
  }

    // Полоска слева
    private applyStripe(card: HTMLElement, assignee: Assignee): void {
    const stripe = document.createElement('div');
    stripe.className = 'jira-helper-assignee-stripe';
    stripe.dataset.assigneeId = assignee.id;
    
    Object.assign(stripe.style, {
        position: 'absolute',
        left: '0',
        top: '0',
        width: '6px',
        height: '100%',
        backgroundColor: assignee.color, // ← ЦВЕТ РАМКИ/ПОЛОСКИ (полный)
        zIndex: '100',
        pointerEvents: 'none'
    });
    
    this.attachToCard(card, stripe);
    }

    private applyBackground(card: HTMLElement, assignee: Assignee): void {
        const innerCard = this.getInnerCard(card);
        
        // 1. Берем основной цвет (из assignee.color)
        const mainColor = assignee.color;
        
        // 2. Добавляем прозрачность 20%
        const backgroundColor = this.addAlpha(mainColor, 0.4);
        
        // 3. Применяем
        innerCard.style.backgroundColor = backgroundColor;
        innerCard.dataset.assigneeHighlight = 'true';
    }

    private applyBorder(card: HTMLElement, assignee: Assignee): void {
        const innerCard = this.getInnerCard(card);
        
        // Используем color (полный цвет)
        innerCard.style.border = `2px solid ${assignee.color}`;
        innerCard.style.borderRadius = '4px';
        innerCard.dataset.assigneeHighlight = 'true';
    }

  // Начать наблюдение за DOM (простой MutationObserver)
  private startObservation(): void {
    this.observer = new MutationObserver(() => {
      if (!this.isEnabled) return;
      
      // Дебаунс обновлений
      if (this._paintTimeout) clearTimeout(this._paintTimeout);
      this._paintTimeout = setTimeout(() => {
        this.applyAssigneeColors();
      }, 100);
    });
    
    const board = document.querySelector('[data-testid="software-board.board"]') || document.body;
    this.observer.observe(board, {
      childList: true,
      subtree: true
    });
  }

  private stopObservation(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  // Утилиты
  private getAllCards(): HTMLElement[] {
    return Array.from(document.querySelectorAll<HTMLElement>(
      '[data-testid="platform-board-kit.ui.card.card"]'
    ));
  }

  private getInnerCard(card: HTMLElement): HTMLElement {
    return card.querySelector<HTMLElement>(
      '[data-testid="software-context-menu.ui.context-menu.children-wrapper"] > div'
    ) || card;
  }

  private attachToCard(card: HTMLElement, element: HTMLElement): void {
    const innerCard = this.getInnerCard(card);
    
    if (getComputedStyle(innerCard).position === 'static') {
      innerCard.style.position = 'relative';
    }
    
    innerCard.appendChild(element);
  }

  private addAlpha(color: string, alpha: number): string {
        if (color.startsWith('rgba')) {
            // Если уже rgba, меняем alpha
            return color.replace(/[\d.]+\)$/g, `${alpha})`);
        }
        
        if (color.startsWith('#')) {
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        
        return color;
    }

  private removeVisualization(card: HTMLElement): void {
    // Удаляем полоску
    const stripe = card.querySelector('.jira-helper-assignee-stripe');
    if (stripe) stripe.remove();
    
    // Восстанавливаем фон/рамку
    const innerCard = this.getInnerCard(card);
    
    // Восстанавливаем только если это НЕ цвет колонки
    if (!card.style.backgroundColor.includes('rgba(')) {
      innerCard.style.backgroundColor = '';
      innerCard.style.border = '';
      innerCard.style.borderRadius = '';
    }
    
    delete innerCard.dataset.assigneeHighlight;
  }

  private removeAllVisualizations(): void {
    const cards = this.getAllCards();
    cards.forEach(card => this.removeVisualization(card));
  }

  isEnabledStatus(): boolean {
    return this.isEnabled;
  }

    updateVisualization(): void {
        if (!this.isEnabled) return;
        console.log('[Jira Helper] Обновление визуализации');
        this.applyAssigneeColors();
    }

}

export const visualizationManager = VisualizationManager.getInstance();