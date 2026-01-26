export interface AssigneeWorkload {
  assigneeId: string;
  assigneeName: string;
  tasksInProgress: number;
  totalTasks: number;
}

export class WorkloadManager {
  private static instance: WorkloadManager;

  private progressColumnNames = ['IN PROGRESS', 'IN PROGRESS', 'В РАБОТЕ', 'DOING'];

  private constructor() {}

  static getInstance(): WorkloadManager {
    if (!WorkloadManager.instance) {
      WorkloadManager.instance = new WorkloadManager();
    }
    return WorkloadManager.instance;
  }

  calculateWorkload(): Map<string, AssigneeWorkload> {
    const workloadMap = new Map<string, AssigneeWorkload>();
    const cards = this.getAllCards();

    cards.forEach(card => {
      const assignee = this.getAssigneeFromCard(card);
      if (!assignee || assignee.id === 'unassigned') return;

      const column = this.getCardColumn(card);
      if (!this.isProgressColumn(column)) return;

      const current = workloadMap.get(assignee.id) || {
        assigneeId: assignee.id,
        assigneeName: assignee.name,
        tasksInProgress: 0,
        totalTasks: 0,
      };

      current.tasksInProgress += 1;
      workloadMap.set(assignee.id, current);
    });

    return workloadMap;
  }

  isAssigneeOverloaded(assigneeId: string): boolean {
    const workload = this.calculateWorkload().get(assigneeId);
    return workload ? workload.tasksInProgress >= 2 : false;
  }

  getOverloadedAssignees(): string[] {
    const overloaded: string[] = [];
    const workload = this.calculateWorkload();

    workload.forEach((value, key) => {
      if (value.tasksInProgress >= 2) {
        overloaded.push(key);
      }
    });

    return overloaded;
  }

  // Вспомогательные методы
  private getAllCards(): HTMLElement[] {
    return Array.from(document.querySelectorAll<HTMLElement>('[data-testid="platform-board-kit.ui.card.card"]'));
  }

  private getAssigneeFromCard(card: HTMLElement): { id: string; name: string } | null {
    // Используем существующую логику из AssigneeManager
    const assigneeManager = (window as any).JiraHelper?.AssigneeManager;
    if (assigneeManager) {
      const assignee = assigneeManager.getAssigneeForCard(card);
      return assignee ? { id: assignee.id, name: assignee.name } : null;
    }
    // Fallback: простой парсинг
    const hiddenElements = card.querySelectorAll('[hidden], [aria-hidden="true"]');
    for (const element of hiddenElements) {
      const text = element.textContent?.trim();
      if (text?.startsWith('Исполнитель:')) {
        const name = text.replace('Исполнитель:', '').trim();
        return { id: `name:${name}`, name };
      }
    }
    return null;
  }

  private getCardColumn(card: HTMLElement): string | null {
    const columnElement = card.closest('[data-testid*="column"], [data-column-id]');
    if (!columnElement) return null;
    const header = columnElement.querySelector('[data-testid*="header"]');
    return header?.textContent?.trim().toUpperCase() || null;
  }

  private isProgressColumn(columnName: string | null): boolean {
    if (!columnName) return false;
    return this.progressColumnNames.some(name => columnName.includes(name.toUpperCase()));
  }
}

export const workloadManager = WorkloadManager.getInstance();
