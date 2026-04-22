// src/shared/di/jiraEnvironmentToken.ts
// DI-токен для определения типа окружения (Server или Cloud)

import { Token } from 'dioma';

export type JiraEnvironment = {
  type: 'server' | 'cloud';
};

export const jiraEnvironmentToken = new Token<JiraEnvironment>('jiraEnvironment');