/* interface DiscoSettings {
  durationSeconds: number;
}

const DEFAULT_SETTINGS: DiscoSettings = {
  durationSeconds: 5
};

const STORAGE_KEY = 'jira-helper-disco-settings';

export function getDiscoSettings(): DiscoSettings {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }
  return DEFAULT_SETTINGS;
}

export function saveDiscoSettings(settings: Partial<DiscoSettings>): void {
  const current = getDiscoSettings();
  const newSettings = { ...current, ...settings };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
} */
