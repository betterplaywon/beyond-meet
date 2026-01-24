import { create } from 'zustand';
import { changeLanguage, getCurrentLanguage, type Locale } from '../i18n';

interface LanguageState {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  locale: getCurrentLanguage(),
  setLocale: async (locale: Locale) => {
    await changeLanguage(locale);
    set({ locale });
  },
}));
