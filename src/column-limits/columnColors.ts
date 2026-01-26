// src/column-limits/columnColors.ts
import { BoardPagePageObject } from '../page-objects/BoardPage';
import { candyStripeManager } from './candyStripe';

interface ColumnColors {
  todo: string;
  inProgress: string;
  done: string;
}

const DEFAULT_COLORS: ColumnColors = {
  todo: 'rgba(0, 0, 255, 0.3)',
  inProgress: 'rgba(255, 255, 0, 0.3)',
  done: 'rgba(0, 255, 0, 0.3)',
};

declare global {
  interface Window {
    _jhDebugApply?: number;
    _jhColumnColorsEnabled?: boolean;
  }
}

function paintCard(card: HTMLElement, color: string): void {
  card.style.backgroundColor = color;
  card.style.setProperty('background-color', color, 'important');

  const innerCard = card.querySelector<HTMLElement>(
    '[data-testid="software-context-menu.ui.context-menu.children-wrapper"] > div'
  );
  if (innerCard) {
    innerCard.style.backgroundColor = color;
    innerCard.style.setProperty('background-color', color, 'important');
  }

  // Добавляем полоску к карточке
  candyStripeManager.addStripeToCard(card, color);
}

export function applyColumnColors(colors: Partial<ColumnColors> = {}): void {
  window._jhDebugApply = (window._jhDebugApply || 0) + 1;
  console.log(`[Jira Helper] applyColumnColors вызван #${window._jhDebugApply}`);

  window._jhColumnColorsEnabled = true;
  const finalColors = { ...DEFAULT_COLORS, ...colors };

  const doPaint = () => {
    try {
      const cards = BoardPagePageObject.getAllCloudCards();
      console.log('[Jira Helper] Карточек для покраски:', cards.length);

      if (cards.length === 0) {
        console.log('[Jira Helper] Карточек нет, пробуем через 300ms');
        setTimeout(doPaint, 300);
        return;
      }

      const cardsArray = Array.from(cards);
      const cardsWithPos = cardsArray.map(card => ({
        card,
        left: card.getBoundingClientRect().left,
      }));

      cardsWithPos.sort((a, b) => a.left - b.left);

      const columns: HTMLElement[][] = [];
      let currentColumn: HTMLElement[] = [];
      let prevLeft = cardsWithPos[0].left;

      cardsWithPos.forEach(({ card, left }) => {
        if (Math.abs(left - prevLeft) > 150 && currentColumn.length > 0) {
          columns.push([...currentColumn]);
          currentColumn = [];
        }
        currentColumn.push(card);
        prevLeft = left;
      });

      if (currentColumn.length > 0) {
        columns.push(currentColumn);
      }

      console.log('[Jira Helper] Определено колонок:', columns.length);

      // ВКЛЮЧАЕМ ПОЛОСКИ
      candyStripeManager.enable();

      columns.forEach((columnCards, index) => {
        let color: string;

        if (index === 0) color = finalColors.todo;
        else if (index === columns.length - 1) color = finalColors.done;
        else color = finalColors.inProgress;

        console.log(`[Jira Helper] Колонка ${index}: ${columnCards.length} карточек`);
        columnCards.forEach(card => paintCard(card, color));
      });

      console.log('[Jira Helper] Покраска завершена успешно');
    } catch (error) {
      console.error('[Jira Helper] Ошибка покраски:', error);
    }
  };

  setTimeout(doPaint, 100);
}

export function removeColumnColors(): void {
  window._jhColumnColorsEnabled = false;

  // ВЫКЛЮЧАЕМ ПОЛОСКИ
  candyStripeManager.disable();

  const cards = BoardPagePageObject.getAllCloudCards();
  let clearedCards = 0;

  cards.forEach(card => {
    card.style.backgroundColor = '';
    card.style.removeProperty('background-color');

    const cardBody = card.querySelector<HTMLElement>(
      '[data-testid="software-context-menu.ui.context-menu.children-wrapper"] > div'
    );
    if (cardBody) {
      cardBody.style.backgroundColor = '';
      cardBody.style.removeProperty('background-color');
    }

    clearedCards++;
  });

  console.log(`[Jira Helper] Очищены цвета у ${clearedCards} карточек`);
}

export function toggleColumnColors(enabled: boolean, colors?: Partial<ColumnColors>): void {
  if (enabled) {
    applyColumnColors(colors);
  } else {
    removeColumnColors();
  }
}

export function checkColumnColorsApplied(): boolean {
  const cards = BoardPagePageObject.getAllCloudCards();
  if (cards.length === 0) return false;

  let coloredCards = 0;

  cards.forEach(card => {
    const bgColor = window.getComputedStyle(card).backgroundColor;
    const isColored = !(
      bgColor === 'rgba(0, 0, 0, 0)' ||
      bgColor === 'transparent' ||
      bgColor === 'rgb(255, 255, 255)'
    );
    if (isColored) coloredCards++;
  });

  const applied = coloredCards > cards.length / 2;

  console.log('[Jira Helper] Проверка покраски:', {
    totalCards: cards.length,
    coloredCards,
    applied,
  });

  return applied;
}
