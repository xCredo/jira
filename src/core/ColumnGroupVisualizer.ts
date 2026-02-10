// src/core/ColumnGroupVisualizer.ts
import { ColumnGroupWipLimit } from './GroupWipLimitsManager';

export class ColumnGroupVisualizer {
  private processedGroups = new Set<string>();
  
  // Создать или обновить визуализацию группы
  updateGroup(group: ColumnGroupWipLimit, exceeded: boolean, currentCount: number) {
    console.log(`[ColumnGroupVisualizer] Обновление группы "${group.name}"`, { exceeded, currentCount });
    
    // Очистить старую визуализацию этой группы
    this.removeGroupVisualization(group.id);
    
    // Найти все колонки группы по их названиям
    const columnElements = this.findColumnsByNames(group.columnNames);
    
    if (columnElements.length === 0) {
      console.warn(`[ColumnGroupVisualizer] Колонки группы "${group.name}" не найдены`);
      return;
    }
    
    console.log(`[ColumnGroupVisualizer] Найдено колонок: ${columnElements.length}`);
    
    const color = exceeded ? (group.warningColor || '#FF0000') : group.baseColor;
    
    // Окрасить каждую колонку
    columnElements.forEach((column, index) => {
      this.colorizeColumn(column, color, exceeded);
      
      // Добавить заголовок с счётчиком только к первой колонке
      if (index === 0) {
        this.addGroupHeader(column, group, currentCount, color);
      }
      
      // Пометить что колонка обработана этой группой
      column.setAttribute('data-jh-group', group.id);
    });
    
    this.processedGroups.add(group.id);
  }
  
  // Найти колонки по названиям
  private findColumnsByNames(columnNames: string[]): HTMLElement[] {
    const elements: HTMLElement[] = [];
    
    columnNames.forEach(columnName => {
        // Ищем заголовки колонок
        const headers = document.querySelectorAll(
        'h2, h3, [aria-label], [data-testid*="column-name"]'
        );
        
        headers.forEach(header => {
        const text = header.textContent || header.getAttribute('aria-label') || '';
        
        // Проверяем совпадение
        if (text.toLowerCase().includes(columnName.toLowerCase()) ||
            columnName.toLowerCase().includes(text.toLowerCase())) {
            
            // ВАЖНО: Находим КОЛОНКУ, а не заголовок!
            // Колонка имеет класс .__board-test-hook__column
            let column = header.closest('.__board-test-hook__column');
            
            // Если не нашли, ищем родителя с data-testid*="column"
            if (!column) {
            column = header.closest('[data-testid*="column"], [data-component-selector*="column"]');
            }
            
            if (column && !elements.includes(column as HTMLElement)) {
            elements.push(column as HTMLElement);
            console.log(`[ColumnGroupVisualizer] Найдена КОЛОНКА: "${text}"`);
            }
        }
        });
    });
    
    return elements;
    }
  
  // Окрасить колонку
  private colorizeColumn(columnElement: HTMLElement, color: string, exceeded: boolean) {
    // Окрашиваем ВСЮ колонку, а не только заголовок
    columnElement.style.setProperty('--_1jtound', color);
    
    // Добавляем рамку вокруг всей колонки
    if (exceeded) {
        columnElement.style.boxShadow = `0 0 0 3px ${color}`;
        columnElement.style.borderRadius = '8px';
    } else {
        columnElement.style.boxShadow = 'none';
        columnElement.style.borderRadius = '6px';
    }
    
    // Также красим фон если нужно
    columnElement.style.backgroundColor = this.hexToRgba(color, 0.05);
    
    console.log(`[ColumnGroupVisualizer] Колонка окрашена в ${color}`);
    }
  
  // Добавить заголовок группы
  private addGroupHeader(
    columnElement: HTMLElement,
    group: ColumnGroupWipLimit,
    currentCount: number,
    color: string
  ) {
    // Удаляем старый заголовок
    const oldHeader = columnElement.querySelector('.jh-group-header');
    if (oldHeader) oldHeader.remove();
    
    // Находим заголовок колонки
    const columnHeader = columnElement.querySelector(
      'h2, h3, [data-testid*="column-name"], [aria-label]'
    );
    
    if (columnHeader) {
      // Создаём контейнер для заголовка группы
      const groupHeader = document.createElement('div');
      groupHeader.className = 'jh-group-header';
      groupHeader.style.cssText = `
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        margin-bottom: 8px !important;
        padding: 4px 8px !important;
        background: ${this.hexToRgba(color, 0.1)} !important;
        border-radius: 4px !important;
        font-size: 12px !important;
        font-weight: bold !important;
      `;
      
      // Название группы
      const nameSpan = document.createElement('span');
      nameSpan.textContent = group.name;
      nameSpan.style.color = color;
      
      // Счётчик
      const counterSpan = document.createElement('span');
      counterSpan.textContent = `${currentCount}/${group.limit}`;
      counterSpan.style.cssText = `
        background: ${color} !important;
        color: white !important;
        padding: 2px 6px !important;
        border-radius: 3px !important;
        font-size: 11px !important;
        font-weight: bold !important;
      `;
      
      groupHeader.appendChild(nameSpan);
      groupHeader.appendChild(counterSpan);
      
      // Вставляем перед заголовком колонки
      columnHeader.parentElement?.insertBefore(groupHeader, columnHeader);
    }
  }
  
  // Удалить визуализацию группы
  removeGroupVisualization(groupId: string) {
    // Находим все колонки этой группы
    document.querySelectorAll<HTMLElement>(`[data-jh-group="${groupId}"]`).forEach(column => {
      // Очищаем CSS переменную
      column.style.removeProperty('--_1jtound');
      column.style.boxShadow = '';
      column.removeAttribute('data-jh-group');
    });
    
    // Удаляем заголовки
    document.querySelectorAll('.jh-group-header').forEach(header => {
      if (header.textContent?.includes(groupId) || 
          header.closest(`[data-jh-group="${groupId}"]`)) {
        header.remove();
      }
    });
    
    this.processedGroups.delete(groupId);
  }
  
  // Очистить все визуализации
  clearAll() {
    this.processedGroups.forEach(groupId => {
      this.removeGroupVisualization(groupId);
    });
    this.processedGroups.clear();
  }
  
  // Конвертер цвета в rgba
  private hexToRgba(hex: string, alpha: number): string {
    if (hex.startsWith('#')) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return hex;
  }
}

export const columnGroupVisualizer = new ColumnGroupVisualizer();