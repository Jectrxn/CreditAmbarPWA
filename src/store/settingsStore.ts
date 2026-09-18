import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface AppSettings {
  whatsappGreeting: string;
  paymentAccountInfo: string;
}

interface SettingsState {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: {
        whatsappGreeting: 'Hola {nombre}, te recordamos de {tienda}',
        paymentAccountInfo: 'Puedes pagar vía Yape/Plin al 999 999 999 o BCP: 191-xxxx.',
      },
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
    }),
    {
      name: 'creditambar-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
