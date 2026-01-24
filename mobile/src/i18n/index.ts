import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';

import ko from './locales/ko.json';
import en from './locales/en.json';
import ja from './locales/ja.json';

export type Locale = 'ko' | 'en' | 'ja';

const LANGUAGE_KEY = 'user-language';
const SUPPORTED_LANGUAGES: Locale[] = ['ko', 'en', 'ja'];

const getDeviceLanguage = (): Locale => {
  let deviceLang = 'ko';
  if (Platform.OS === 'ios') {
    deviceLang =
      NativeModules.SettingsManager?.settings?.AppleLocale?.substring(0, 2) ||
      NativeModules.SettingsManager?.settings?.AppleLanguages?.[0]?.substring(0, 2) ||
      'ko';
  } else {
    deviceLang = NativeModules.I18nManager?.localeIdentifier?.substring(0, 2) || 'ko';
  }
  if (SUPPORTED_LANGUAGES.includes(deviceLang as Locale)) {
    return deviceLang as Locale;
  }
  return 'ko';
};

// AsyncStorage 기반 language detector 플러그인
const languageDetector = {
  type: 'languageDetector' as const,
  async: true,
  detect: (callback: (lng: string) => void) => {
    AsyncStorage.getItem(LANGUAGE_KEY).then((savedLang) => {
      if (savedLang && SUPPORTED_LANGUAGES.includes(savedLang as Locale)) {
        callback(savedLang);
      } else {
        const deviceLang = getDeviceLanguage();
        AsyncStorage.setItem(LANGUAGE_KEY, deviceLang);
        callback(deviceLang);
      }
    });
  },
  init: () => {},
  cacheUserLanguage: (lng: string) => {
    AsyncStorage.setItem(LANGUAGE_KEY, lng);
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ko: { translation: ko },
      en: { translation: en },
      ja: { translation: ja },
    },
    fallbackLng: 'ko',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export const changeLanguage = async (lang: Locale): Promise<void> => {
  await i18n.changeLanguage(lang);
  await AsyncStorage.setItem(LANGUAGE_KEY, lang);
};

export const getCurrentLanguage = (): Locale => {
  return (i18n.language || 'ko') as Locale;
};

export default i18n;
