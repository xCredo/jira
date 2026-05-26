import type { Container } from 'dioma';
import { boardPagePageObjectToken } from '../../../infrastructure/page-objects/BoardPage';
import {
  getBoardPropertyToken,
  getBoardEditDataToken,
  updateBoardPropertyToken,
  deleteBoardPropertyToken,
} from '../../../infrastructure/di/jiraApiTokens';
import {
  getBoardPropertyCloud,
  getBoardEditDataCloud,
  updateBoardPropertyCloud,
  deleteBoardPropertyCloud,
} from '../jiraApi.cloud';

export function registerServerApiCloudAdapters(container: Container): void {
  const boardPage = container.inject(boardPagePageObjectToken);

  container.register({
    token: getBoardPropertyToken,
    value: <T>(_boardId: string, property: string, _options?: any) =>
      getBoardPropertyCloud<T>(boardPage as any, property),
  });

  container.register({
    token: getBoardEditDataToken,
    value: (_boardId: string, options?: { abortPromise?: Promise<void> }) =>
      getBoardEditDataCloud(boardPage as any, options?.abortPromise),
  });

  container.register({
    token: updateBoardPropertyToken,
    value: (_boardId: string, property: string, value: any, _options?: any) =>
      updateBoardPropertyCloud(boardPage as any, property, value),
  });

  container.register({
    token: deleteBoardPropertyToken,
    value: (_boardId: string, property: string, _options?: any) =>
      deleteBoardPropertyCloud(boardPage as any, property),
  });
}
