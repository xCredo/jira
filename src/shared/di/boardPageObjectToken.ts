// src/shared/di/boardPageObjectToken.ts
// Общий DI токен для BoardPagePageObject

import { Token } from 'dioma';
import type { IBoardPagePageObject } from 'src/page-objects/BoardPage';

export const boardPagePageObjectToken = new Token<IBoardPagePageObject>('boardPagePageObjectToken');