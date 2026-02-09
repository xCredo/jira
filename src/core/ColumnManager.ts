// src/core/ColumnManager.ts
import { BoardPagePageObject } from '../page-objects/BoardPage';

export interface ColumnInfo {
  id: string;
  name: string;
  index: number;
}

export class ColumnManager {
  getColumns(): ColumnInfo[] {
    try {
      // Способ 1: Парсинг из DOM (точный)
      const columnElements = this.getColumnElements();
      if (columnElements.length > 0) {
        const columns = this.parseColumnsFromElements(columnElements);
        if (columns.length > 0) {
          return columns;
        }
      }

      // Способ 2: Fallback - по карточкам
      return this.detectColumnsFromCards();

    } catch (error) {
      console.error('[ColumnManager] Ошибка получения колонок:', error);
      return [];
    }
  }

  private getColumnElements(): Element[] {
    // Основные селекторы для колонок Jira
    const selectors = [
      '[data-testid="platform-board-kit.ui.column.draggable-column"]',
      '[data-component-selector="platform-board-kit.ui.column.draggable-column"]',
      '[data-testid*="column"]',
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`[ColumnManager] Найдено колонок через "${selector}":`, elements.length);
        return Array.from(elements);
      }
    }

    return [];
  }

  private parseColumnsFromElements(columnElements: Element[]): ColumnInfo[] {
    return columnElements.map((element, index) => {
      // Ищем название колонки
      let columnName = this.extractColumnName(element);
      
      // Если не нашли название, используем fallback
      if (!columnName || columnName.trim() === '') {
        columnName = this.getFallbackColumnName(index, columnElements.length);
      }

      return {
        id: `column-${index}`,
        name: columnName.trim(),
        index: index
      };
    });
  }

  private extractColumnName(columnElement: Element): string {
    // Способ 1: Из атрибута aria-label заголовка
    const headerWithAriaLabel = columnElement.querySelector('h2[aria-label], h3[aria-label]');
    if (headerWithAriaLabel) {
      const ariaLabel = headerWithAriaLabel.getAttribute('aria-label');
      if (ariaLabel && !ariaLabel.match(/^\d+$/)) { // Проверяем что это не просто число
        console.log(`[ColumnManager] Название из aria-label: "${ariaLabel}"`);
        return ariaLabel;
      }
    }

    // Способ 2: Из элемента с data-testid содержащего column-name
    const columnNameElement = columnElement.querySelector(
      '[data-testid*="column-name"], ' +
      '[data-testid*="column-title"], ' +
      '[title]'
    );
    
    if (columnNameElement) {
      // Пробуем получить из title
      const title = columnNameElement.getAttribute('title');
      if (title) {
        console.log(`[ColumnManager] Название из title: "${title}"`);
        return title;
      }
      
      // Или из текста содержимого
      const textContent = columnNameElement.textContent || '';
      if (textContent) {
        // Убираем числа (счётчики карточек)
        const cleanText = textContent.replace(/\s*\d+\s*$/, '').trim();
        if (cleanText) {
          console.log(`[ColumnManager] Название из textContent: "${cleanText}" (было: "${textContent}")`);
          return cleanText;
        }
      }
    }

    // Способ 3: Ищем любой текст в заголовке колонки
    const header = columnElement.querySelector(
      'h2, h3, header, ' +
      '[class*="header"], ' +
      '[class*="title"]'
    );
    
    if (header) {
      const text = header.textContent || '';
      if (text) {
        // Убираем числа и лишние пробелы
        const cleanText = text
          .replace(/\s*\d+\s*$/g, '') // числа в конце
          .replace(/^\d+\s*/, '')     // числа в начале  
          .replace(/\s+/g, ' ')
          .trim();
        
        if (cleanText && cleanText.length < 50) { // Проверяем что это не случайный текст
          console.log(`[ColumnManager] Название из заголовка: "${cleanText}" (было: "${text}")`);
          return cleanText;
        }
      }
    }

    return '';
  }

  private getFallbackColumnName(index: number, totalColumns: number): string {
    // Стандартные имена для типичных колонок
    if (index === 0) return 'TO DO';
    if (index === totalColumns - 1) return 'DONE';
    if (totalColumns === 3) {
      if (index === 1) return 'IN PROGRESS';
    }
    if (totalColumns === 4) {
      if (index === 1) return 'IN PROGRESS';
      if (index === 2) return 'TESTING';
      if (index === 3) return 'DONE';
    }
    if (totalColumns === 5) {
      if (index === 1) return 'IN PROGRESS';
      if (index === 2) return 'TESTING';
      if (index === 3) return 'REVIEW';
      if (index === 4) return 'DONE';
    }
    
    return `Column ${index + 1}`;
  }

  private detectColumnsFromCards(): ColumnInfo[] {
    try {
      const cards = BoardPagePageObject.getAllCloudCards();
      if (cards.length === 0) {
        return [];
      }

      // Та же логика что в columnColors.ts
      const cardsWithPos = Array.from(cards).map(card => ({
        card,
        left: card.getBoundingClientRect().left,
      }));

      cardsWithPos.sort((a, b) => a.left - b.left);

      const columnGroups: any[] = [];
      let currentGroup: any[] = [];
      let prevLeft = cardsWithPos[0].left;

      cardsWithPos.forEach(({ card, left }) => {
        if (Math.abs(left - prevLeft) > 150 && currentGroup.length > 0) {
          columnGroups.push([...currentGroup]);
          currentGroup = [];
        }
        currentGroup.push(card);
        prevLeft = left;
      });

      if (currentGroup.length > 0) {
        columnGroups.push(currentGroup);
      }

      return columnGroups.map((colCards, index) => ({
        id: `column-${index}`,
        name: this.getFallbackColumnName(index, columnGroups.length),
        index: index
      }));

    } catch (error) {
      console.error('[ColumnManager] Ошибка детекции колонок по карточкам:', error);
      return [];
    }
  }

  getCardColumnId(card: HTMLElement): string | null {
    const columns = this.getColumns();
    const cards = BoardPagePageObject.getAllCloudCards();
    
    if (!cards.length) return null;
    
    const cardLeft = card.getBoundingClientRect().left;
    const allCards = Array.from(cards);
    
    // Сортируем карточки по позиции
    const cardsWithPos = allCards.map(c => ({
      c,
      left: c.getBoundingClientRect().left,
    }));
    
    cardsWithPos.sort((a, b) => a.left - b.left);
    
    // Находим к какой группе принадлежит карточка
    let columnIndex = 0;
    let prevLeft = cardsWithPos[0].left;
    
    for (let i = 0; i < cardsWithPos.length; i++) {
      if (Math.abs(cardsWithPos[i].left - prevLeft) > 150) {
        columnIndex++;
      }
      if (cardsWithPos[i].c === card) {
        return `column-${Math.min(columnIndex, columns.length - 1)}`;
      }
      prevLeft = cardsWithPos[i].left;
    }
    
    console.log(`Проверка карточки: columnId=${columnId}, limit.columnIds=${JSON.stringify(limit.columnIds)}`);
    console.log(`Включена ли колонка? ${limit.columnIds.includes(columnId!)}`);

    return null;
  }
}

export const columnManager = new ColumnManager();