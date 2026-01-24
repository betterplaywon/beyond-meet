import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLanguageStore } from '../../store/languageStore';
import { type Locale } from '../../i18n';
import { spacing } from '../../styles/theme';

const LANGUAGES: { locale: Locale; flag: string }[] = [
  { locale: 'ko', flag: '🇰🇷' },
  { locale: 'en', flag: '🇺🇸' },
  { locale: 'ja', flag: '🇯🇵' },
];

export const LanguageSelector: React.FC = () => {
  const { locale, setLocale } = useLanguageStore();

  return (
    <View style={styles.container}>
      {LANGUAGES.map(({ locale: lang, flag }) => (
        <TouchableOpacity
          key={lang}
          style={[
            styles.flagButton,
            locale === lang && styles.flagButtonActive,
          ]}
          onPress={() => setLocale(lang)}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.flag,
            locale !== lang && styles.flagInactive,
          ]}>
            {flag}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  flagButton: {
    padding: 4,
    borderRadius: 8,
  },
  flagButtonActive: {
    backgroundColor: 'rgba(255, 131, 131, 0.1)',
  },
  flag: {
    fontSize: 20,
  },
  flagInactive: {
    opacity: 0.4,
  },
});
