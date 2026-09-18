import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ReminderState {
  sentReminders: string[]; // customer IDs
  markAsSent: (customerId: string) => void;
  clearReminders: () => void;
}

export const useReminderStore = create<ReminderState>()(
  persist(
    (set) => ({
      sentReminders: [],
      markAsSent: (id) =>
        set((state) => ({
          sentReminders: state.sentReminders.includes(id)
            ? state.sentReminders
            : [...state.sentReminders, id],
        })),
      clearReminders: () => set({ sentReminders: [] }),
    }),
    {
      name: 'creditambar-reminders',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
