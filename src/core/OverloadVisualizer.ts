import { workloadManager } from './WorkloadManager';
import { assigneeManager } from './AssigneeManager';

export class OverloadVisualizer {
  private static instance: OverloadVisualizer;

  private isEnabled = true;

  private observer: MutationObserver | null = null;

  private readonly OVERLOAD_BORDER_STYLE = '3px solid #000000';

  private readonly OVERLOAD_CLASS = 'jira-helper-overload-border';

  private constructor() {}

  static getInstance(): OverloadVisualizer {
    if (!OverloadVisualizer.instance) {
      OverloadVisualizer.instance = new OverloadVisualizer();
    }
    return OverloadVisualizer.instance;
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (enabled) {
      this.applyOverloadBorders();
      this.startObservation();
    } else {
      this.removeAllOverloadBorders();
      this.stopObservation();
    }
  }

  applyOverloadBorders(): void {
    if (!this.isEnabled) return;

    const overloadedAssignees = workloadManager.getOverloadedAssignees();
    const cards = this.getAllCards();

    cards.forEach(card => {
      const assignee = assigneeManager.getAssigneeForCard(card);
      if (!assignee || assignee.id === 'unassigned') return;

      if (overloadedAssignees.includes(assignee.id)) {
        this.applyBorderToCard(card);
      } else {
        this.removeBorderFromCard(card);
      }
    });
  }

  update(): void {
    this.applyOverloadBorders();
  }

  private applyBorderToCard(card: HTMLElement): void {
    // Удаляем старую рамку
    this.removeBorderFromCard(card);

    // Находим внутренний элемент карточки
    const innerCard = this.getInnerCard(card);
    if (!innerCard) return;

    // Создаём элемент рамки
    const borderElement = document.createElement('div');
    borderElement.className = this.OVERLOAD_CLASS;
    borderElement.dataset.assigneeOverload = 'true';

    // Стили рамки (ПОВЕРХ существующей визуализации)
    Object.assign(borderElement.style, {
      position: 'absolute',
      top: '-3px',
      left: '-3px',
      right: '-3px',
      bottom: '-3px',
      border: this.OVERLOAD_BORDER_STYLE,
      borderRadius: '6px',
      pointerEvents: 'none',
      zIndex: '9999', // Самый высокий z-index
      boxShadow: '0 0 0 3px rgba(0,0,0,0.1)', // Лёгкая тень для выделения
    });

    // Убеждаемся, что родительский элемент имеет relative positioning
    if (getComputedStyle(innerCard).position === 'static') {
      innerCard.style.position = 'relative';
    }

    innerCard.appendChild(borderElement);
  }

  private removeBorderFromCard(card: HTMLElement): void {
    const innerCard = this.getInnerCard(card);
    if (!innerCard) return;

    const borderElement = innerCard.querySelector(`.${this.OVERLOAD_CLASS}`);
    if (borderElement) {
      borderElement.remove();
    }
  }

  private removeAllOverloadBorders(): void {
    document.querySelectorAll(`.${this.OVERLOAD_CLASS}`).forEach(el => el.remove());
  }

  private startObservation(): void {
    if (this.observer) return;

    this.observer = new MutationObserver(() => {
      // Дебаунс обновлений
      setTimeout(() => this.applyOverloadBorders(), 100);
    });

    const board = document.querySelector('[data-testid="software-board.board"]') || document.body;
    this.observer.observe(board, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false,
    });
  }

  private stopObservation(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  // Вспомогательные методы
  private getAllCards(): HTMLElement[] {
    return Array.from(document.querySelectorAll<HTMLElement>('[data-testid="platform-board-kit.ui.card.card"]'));
  }

  private getInnerCard(card: HTMLElement): HTMLElement | null {
    return (
      card.querySelector<HTMLElement>('[data-testid="software-context-menu.ui.context-menu.children-wrapper"] > div') ||
      card
    );
  }
}

export const overloadVisualizer = OverloadVisualizer.getInstance();
