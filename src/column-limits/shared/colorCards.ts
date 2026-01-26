import { BoardPagePageObject } from '../../page-objects/BoardPage';
import { removeColumnColors } from '../columnColors';

function getRandomHexColor(): string {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

let originalColorsSaved = false;

// Функция для удаления полосок
function removeCandyStripes(): void {
  document.querySelectorAll('.jira-helper-candy-stripe').forEach(stripe => {
    stripe.remove();
  });
}

// Функция для обновления цвета кружков в полосках
function updateCandyStripesColors(): void {
  document.querySelectorAll('.jira-helper-candy-stripe').forEach(stripe => {
    const card = stripe.parentElement;
    if (card) {
      const cardColor = window.getComputedStyle(card).backgroundColor;
      const circle = stripe.querySelector('.jira-helper-candy-circle');
      if (circle instanceof HTMLElement) {
        circle.style.backgroundColor = cardColor;
      }
    }
  });
}

export function saveOriginalColors(): void {
  if (originalColorsSaved) return;

  const cards = BoardPagePageObject.getAllCloudCards();

  cards.forEach(card => {
    const computedStyle = window.getComputedStyle(card);
    const originalColor = computedStyle.backgroundColor || 'white';

    card.dataset.originalColor = originalColor;

    const cardBody = card.querySelector<HTMLElement>(
      '[data-testid="software-context-menu.ui.context-menu.children-wrapper"] > div'
    );
    if (cardBody) {
      const bodyComputedStyle = window.getComputedStyle(cardBody);
      const bodyOriginalColor = bodyComputedStyle.backgroundColor || 'white';
      cardBody.dataset.originalColor = bodyOriginalColor;
    }

    card.dataset.originalTransition = card.style.transition;
  });

  originalColorsSaved = true;
  console.log('[Jira Helper] Сохранены исходные цвета карточек');
}

/* export function colorAllCards(): void {
  const cards = BoardPagePageObject.getAllCloudCards();

  saveOriginalColors();

  removeColumnColors();
  
  // Удаляем полоски при ручной покраске
  removeCandyStripes();
  
  cards.forEach(card => {
    const randomColor = getRandomHexColor();
    card.style.setProperty('background-color', randomColor, 'important');
    card.style.transition = 'background-color 0.5s ease';
    
    const cardBody = card.querySelector<HTMLElement>(
      '[data-testid="software-context-menu.ui.context-menu.children-wrapper"] > div'
    );
    if (cardBody) {
      cardBody.style.setProperty('background-color', randomColor, 'important');
      cardBody.style.transition = 'background-color 0.5s ease';
    }
  });

  console.log(`[Jira Helper] Перекрашено ${cards.length} карточек.`);
} */

declare global {
  interface Window {
    updateLoaderColor?: (color: string) => void;
  }
}

/* export function animateCardsColorChange(durationSeconds: number = 5): () => void {
  const cards = BoardPagePageObject.getAllCloudCards();
  if (!cards.length) {
    console.log('[Jira Helper] Нет карточек для анимации');
    return () => {};
  }
  
  console.log(`[Jira Helper] Запуск дискотеки для ${cards.length} карточек`);

  saveOriginalColors();

  removeColumnColors();
  
  // Удаляем полоски при запуске дискотеки
  removeCandyStripes();
  
  let secondsLeft = durationSeconds;
  let intervalId: NodeJS.Timeout | null = null;

  const paintAllCards = () => {
    let firstCardColor = '#000000';
    
    cards.forEach((card, index) => {
      const randomColor = getRandomHexColor();

      if (index === 0) {
        firstCardColor = randomColor;
      }
      
      card.style.setProperty('background-color', randomColor, 'important');
      card.style.transition = 'background-color 0.5s ease';
      
      const cardBody = card.querySelector<HTMLElement>(
        '[data-testid="software-context-menu.ui.context-menu.children-wrapper"] > div'
      );
      if (cardBody) {
        cardBody.style.setProperty('background-color', randomColor, 'important');
        cardBody.style.transition = 'background-color 0.5s ease';
      }
    });

    if (window.updateLoaderColor) {
      window.updateLoaderColor(firstCardColor);
    }
  };

  paintAllCards();
  intervalId = setInterval(() => {
    secondsLeft--;
    
    if (secondsLeft <= 0) {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      console.log('[Jira Helper] Дискотека завершена');
    } else {
      paintAllCards();
    }
  }, 1000);

  return () => {
    if (intervalId) {
      clearInterval(intervalId);
      console.log('[Jira Helper] Дискотека остановлена вручную');
    }
  };
} */

export function restoreOriginalColors(): void {
  const cards = BoardPagePageObject.getAllCloudCards();
  let restoredCards = 0;

  cards.forEach(card => {
    if (card.dataset.originalColor) {
      card.style.backgroundColor = card.dataset.originalColor;
      card.style.removeProperty('background-color');
      restoredCards++;
    } else {
      card.style.backgroundColor = '';
      card.style.removeProperty('background-color');
    }

    if (card.dataset.originalTransition) {
      card.style.transition = card.dataset.originalTransition;
    } else {
      card.style.transition = '';
    }

    const cardBody = card.querySelector<HTMLElement>(
      '[data-testid="software-context-menu.ui.context-menu.children-wrapper"] > div'
    );
    if (cardBody) {
      if (cardBody.dataset.originalColor) {
        cardBody.style.backgroundColor = cardBody.dataset.originalColor;
        cardBody.style.removeProperty('background-color');
      } else {
        cardBody.style.backgroundColor = '';
        cardBody.style.removeProperty('background-color');
      }
      cardBody.style.transition = '';
    }
  });

  // Обновляем цвета полосок после восстановления
  updateCandyStripesColors();

  console.log(`[Jira Helper] Восстановлены исходные цвета ${restoredCards} карточек`);
}

export function resetOriginalColors(): void {
  originalColorsSaved = false;
  const cards = BoardPagePageObject.getAllCloudCards();

  cards.forEach(card => {
    delete card.dataset.originalColor;
    delete card.dataset.originalTransition;

    const cardBody = card.querySelector<HTMLElement>(
      '[data-testid="software-context-menu.ui.context-menu.children-wrapper"] > div'
    );
    if (cardBody) {
      delete cardBody.dataset.originalColor;
    }
  });

  console.log('[Jira Helper] Сброшены сохраненные цвета');
}

export function applyColorsWithColumnPriority(): void {
  const columnColorsEnabled = localStorage.getItem('jira-helper-column-colors-enabled') === 'true';

  if (columnColorsEnabled) {
    import('../columnColors').then(({ applyColumnColors }) => {
      applyColumnColors();
    });
  } else {
    restoreOriginalColors();
  }
}
