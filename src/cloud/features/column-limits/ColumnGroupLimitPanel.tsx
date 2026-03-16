// src/cloud/features/column-limits/ColumnGroupLimitPanel.tsx
// Панель визуализации групповых лимитов колонок

import { ColumnGroupWipLimit } from './ColumnLimitsApplier';

export class ColumnGroupLimitPanel {
  private processedGroups = new Set<string>();

  updateGroup(group: ColumnGroupWipLimit, exceeded: boolean, currentCount: number) {
    console.log(`[ColumnGroupLimitPanel] Обновление группы "${group.name}"`, { exceeded, currentCount });

    this.removeGroupVisualization(group.id);

    const columnElements = this.findColumnsByNames(group.columnNames);

    if (columnElements.length === 0) {
      console.warn(`[ColumnGroupLimitPanel] Колонки группы "${group.name}" не найдены`);
      return;
    }

    console.log(`[ColumnGroupLimitPanel] Найдено колонок: ${columnElements.length}`);

    const color = exceeded ? group.warningColor || '#FF0000' : group.baseColor;

    columnElements.forEach((column, index) => {
      column.setAttribute('data-jh-group', group.id);
      this.colorizeColumn(column, color, exceeded);

      if (index === 0) {
        this.addGroupHeader(column, group, currentCount, color);
      }
    });

    this.processedGroups.add(group.id);
  }

  private findColumnsByNames(columnNames: string[]): HTMLElement[] {
    const elements: HTMLElement[] = [];

    columnNames.forEach(columnName => {
      const headers = document.querySelectorAll('h2, h3, [aria-label], [data-testid*="column-name"]');

      headers.forEach(header => {
        const text = header.textContent || header.getAttribute('aria-label') || '';

        if (
          text.toLowerCase().includes(columnName.toLowerCase()) ||
          columnName.toLowerCase().includes(text.toLowerCase())
        ) {
          let column = header.closest('.__board-test-hook__column');

          if (!column) {
            column = header.closest('[data-testid*="column"], [data-component-selector*="column"]');
          }

          if (column && !elements.includes(column as HTMLElement)) {
            elements.push(column as HTMLElement);
            console.log(`[ColumnGroupLimitPanel] Найдена КОЛОНКА: "${text}"`);
          }
        }
      });
    });

    return elements;
  }

  private colorizeColumn(columnElement: HTMLElement, color: string, exceeded: boolean) {
    columnElement.style.setProperty('--_1jtound', color);

    if (exceeded) {
      columnElement.style.boxShadow = `0 0 0 3px ${color}`;
      columnElement.style.borderRadius = '8px';
    } else {
      columnElement.style.boxShadow = 'none';
      columnElement.style.borderRadius = '6px';
    }

    columnElement.style.backgroundColor = this.hexToRgba(color, 0.05);

    console.log(`[ColumnGroupLimitPanel] Колонка окрашена в ${color}`);
  }

  private addGroupHeader(columnElement: HTMLElement, group: ColumnGroupWipLimit, currentCount: number, color: string) {
    const oldHeader = document.querySelector(`.jh-group-header[data-group-id="${group.id}"]`);
    if (oldHeader) oldHeader.remove();

    const boardContainer = columnElement.closest('._16jlkb7n._1o9zkb7n._i0dl1wug._wij21bp4');
    if (!boardContainer) return;

    let headerContainer = boardContainer.querySelector<HTMLElement>('.jh-group-header-container');
    if (!headerContainer) {
      headerContainer = document.createElement('div');
      headerContainer.className = 'jh-group-header-container';
      headerContainer.style.cssText = `
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        height: 55px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: flex-start !important;
        gap: 0 !important;
        padding: 0 !important;
        z-index: 1000 !important;
        pointer-events: none !important;
      `;

      (boardContainer as HTMLElement).style.position = 'relative';
      (boardContainer as HTMLElement).style.paddingTop = '55px';
      boardContainer.insertBefore(headerContainer, boardContainer.firstChild);
    }

    const allColumns = document.querySelectorAll<HTMLElement>(
      '.__board-test-hook__column, [data-testid*="column"], [data-component-selector*="column"]'
    );
    if (allColumns.length === 0) return;

    if (headerContainer.children.length === 0) {
      for (let i = 0; i < allColumns.length; i++) {
        const cell = document.createElement('div');
        cell.className = 'jh-group-cell';
        cell.style.cssText = `
          flex: 1 1 0 !important;
          height: 100% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: flex-start !important;
          padding: 0 8px !important;
          pointer-events: none !important;
        `;
        headerContainer.appendChild(cell);
      }
    }

    const allGroupColumns = document.querySelectorAll<HTMLElement>(`[data-jh-group="${group.id}"]`);
    if (allGroupColumns.length === 0) return;

    const firstColumn = allGroupColumns[0];
    let columnIndex = -1;

    for (let i = 0; i < allColumns.length; i++) {
      if (allColumns[i] === firstColumn) {
        columnIndex = i;
        break;
      }
    }

    if (columnIndex === -1) return;

    const groupHeader = document.createElement('div');
    groupHeader.className = 'jh-group-header';
    groupHeader.setAttribute('data-group-id', group.id);
    groupHeader.style.cssText = `
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 8px !important;
      width: 100% !important;
      height: 32px !important;
      padding: 0 8px !important;
      background: ${this.hexToRgba(color, 0.15)} !important;
      border: 1px solid ${color} !important;
      border-radius: 4px !important;
      font-size: 12px !important;
      font-weight: 600 !important;
      box-sizing: border-box !important;
      pointer-events: auto !important;
      color: ${color} !important;
    `;

    const nameSpan = document.createElement('span');
    nameSpan.textContent = group.name;
    nameSpan.style.cssText = `
      color: ${color} !important;
      max-width: 120px;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
      font-size: 12px !important;
    `;
    nameSpan.title = group.name;

    const counterSpan = document.createElement('span');
    counterSpan.textContent = `${currentCount}/${group.limit}`;
    counterSpan.style.cssText = `
      background: ${color} !important;
      color: white !important;
      padding: 2px 6px !important;
      border-radius: 10px !important;
      font-size: 11px !important;
      font-weight: bold !important;
      flex-shrink: 0 !important;
      line-height: 1 !important;
    `;

    groupHeader.appendChild(nameSpan);
    groupHeader.appendChild(counterSpan);

    const targetCell = headerContainer.children[columnIndex] as HTMLElement;
    if (targetCell) {
      targetCell.innerHTML = '';
      targetCell.appendChild(groupHeader);
    }
  }

  removeGroupVisualization(groupId: string) {
    document.querySelectorAll<HTMLElement>(`[data-jh-group="${groupId}"]`).forEach(column => {
      column.style.removeProperty('--_1jtound');
      column.style.boxShadow = '';
      column.removeAttribute('data-jh-group');
    });

    document.querySelectorAll('.jh-group-header').forEach(header => {
      if (header.textContent?.includes(groupId) || header.closest(`[data-jh-group="${groupId}"]`)) {
        header.remove();
      }
    });

    this.processedGroups.delete(groupId);
  }

  clearAll() {
    this.processedGroups.forEach(groupId => {
      this.removeGroupVisualization(groupId);
    });
    this.processedGroups.clear();
  }

  private hexToRgba(hex: string, alpha: number): string {
    if (hex.startsWith('#')) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return hex;
  }

  public getProcessedGroups(): Set<string> {
    return this.processedGroups;
  }
}
