import { createAction } from 'src/shared/action';
import { useLocalSettingsStore } from '../stores/localSettingsStore';
import { LocalSettings } from '../types/local-settings';
import { STORAGE_KEY } from './loadLocalSettings';

export const updateLocalSettings = createAction({
  name: 'updateLocalSettings',
  async handler(settings: Partial<LocalSettings>) {
    console.log('[updateLocalSettings] called with:', settings);
    const { updateSettings } = useLocalSettingsStore.getState();
    const prev = useLocalSettingsStore.getState().settings;
    console.log('[updateLocalSettings] prev:', prev);
    updateSettings(settings);
    const next = useLocalSettingsStore.getState().settings;
    console.log('[updateLocalSettings] next:', next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(useLocalSettingsStore.getState().settings));
      console.log('[updateLocalSettings] saved to localStorage ok');
    } catch (e: any) {
      console.error('[updateLocalSettings] localStorage error:', e);
    }
  },
});
