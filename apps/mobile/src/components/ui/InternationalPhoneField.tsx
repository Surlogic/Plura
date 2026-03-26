import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  buildInternationalPhoneNumber,
  DEFAULT_PHONE_COUNTRY_CODE,
  getPhoneCountryOption,
  PHONE_COUNTRY_OPTIONS,
  sanitizePhoneLocalNumber,
  splitInternationalPhoneNumber,
} from '../../lib/internationalPhone';
import { theme } from '../../theme';

type InternationalPhoneFieldProps = {
  value: string;
  onChange: (nextValue: string) => void;
  label: string;
  placeholder?: string;
  helperText?: string;
};

export default function InternationalPhoneField({
  value,
  onChange,
  label,
  placeholder,
  helperText,
}: InternationalPhoneFieldProps) {
  const [countryCode, setCountryCode] = useState(DEFAULT_PHONE_COUNTRY_CODE);
  const [nationalNumber, setNationalNumber] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    const parsed = splitInternationalPhoneNumber(value, countryCode);
    if (value.trim()) {
      setCountryCode(parsed.countryCode);
    }
    setNationalNumber(parsed.nationalNumber);
  }, [countryCode, value]);

  const selectedCountry = getPhoneCountryOption(countryCode);

  const handleCountrySelect = (nextCountryCode: string) => {
    setCountryCode(nextCountryCode);
    setIsModalVisible(false);
    onChange(buildInternationalPhoneNumber(nextCountryCode, nationalNumber));
  };

  const handleNumberChange = (nextValue: string) => {
    const nextNationalNumber = sanitizePhoneLocalNumber(nextValue);
    setNationalNumber(nextNationalNumber);
    onChange(buildInternationalPhoneNumber(countryCode, nextNationalNumber));
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setIsModalVisible(true)}
          style={styles.countryButton}
        >
          <Text style={styles.countryButtonText}>
            {`${selectedCountry.flag} +${selectedCountry.dialCode}`}
          </Text>
          <Ionicons name="chevron-down" size={16} color={theme.colors.secondary} />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder={placeholder || selectedCountry.exampleNational}
          placeholderTextColor={theme.colors.inkFaint}
          keyboardType="phone-pad"
          inputMode="tel"
          value={nationalNumber}
          onChangeText={handleNumberChange}
        />
      </View>
      {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}

      <Modal visible={isModalVisible} transparent animationType="fade" onRequestClose={() => setIsModalVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setIsModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecciona un pais</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={20} color={theme.colors.secondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {PHONE_COUNTRY_OPTIONS.map((country) => (
                <TouchableOpacity
                  key={country.code}
                  style={styles.option}
                  onPress={() => handleCountrySelect(country.code)}
                >
                  <View>
                    <Text style={styles.optionTitle}>{`${country.flag} ${country.name}`}</Text>
                    <Text style={styles.optionSubtitle}>{`+${country.dialCode} · ${country.exampleNational}`}</Text>
                  </View>
                  {country.code === countryCode ? (
                    <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />
                  ) : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 16,
  },
  label: {
    marginBottom: 4,
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.secondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },
  countryButton: {
    minWidth: 116,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(16,32,51,0.1)',
    backgroundColor: theme.colors.backgroundSoft,
    paddingHorizontal: 14,
  },
  countryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.secondary,
  },
  input: {
    height: 48,
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(16,32,51,0.1)',
    backgroundColor: theme.colors.backgroundSoft,
    paddingHorizontal: 16,
    fontSize: 14,
    color: theme.colors.secondary,
  },
  helper: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.inkFaint,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(12,23,36,0.38)',
    padding: 24,
  },
  modalCard: {
    maxHeight: '72%',
    borderRadius: 24,
    backgroundColor: theme.colors.surfaceStrong,
    padding: 18,
  },
  modalHeader: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.secondary,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(16,32,51,0.08)',
    paddingVertical: 12,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.secondary,
  },
  optionSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: theme.colors.inkFaint,
  },
});
