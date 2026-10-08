import React from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet
} from 'react-native'
import { evaluateComputedField, getTodayString } from '../engine/formEngine'

export default function DynamicField({
  field,
  value,
  formData,
  onChange,
  error,
  onRepeaterChange,
  isSunlight
}) {
  const isRequired = field.required
  const theme = isSunlight ? lightStyles : darkStyles

  // 1. Computed Field
  if (field.type === 'computed') {
    const computedVal = evaluateComputedField(field, formData)
    return (
      <View style={[styles.computedCard, theme.computedCard]}>
        <Text style={[styles.computedLabel, theme.computedLabel]}>
          {field.label} (Computed Read-Only)
        </Text>
        <Text style={[styles.computedValue, theme.computedValue]}>
          {computedVal} kWp
        </Text>
        {field.helper_text && (
          <Text style={[styles.helperText, theme.helperText]}>
            {field.helper_text}
          </Text>
        )}
      </View>
    )
  }

  // 2. Repeater Field (e.g., ESS Units)
  if (field.type === 'repeater') {
    const count = parseInt(formData[field.count_field], 10) || 1
    const items = Array.isArray(value) ? value : []

    return (
      <View style={styles.repeaterContainer}>
        <View style={styles.repeaterHeader}>
          <Text style={[styles.fieldLabel, theme.fieldLabel]}>{field.label}</Text>
          <View style={[styles.countBadge, theme.countBadge]}>
            <Text style={styles.countBadgeText}>{count} Unit{count > 1 ? 's' : ''}</Text>
          </View>
        </View>

        {Array.from({ length: count }).map((_, idx) => {
          const item = items[idx] || {}
          return (
            <View key={idx} style={[styles.repeaterCard, theme.repeaterCard]}>
              <Text style={[styles.repeaterUnitTitle, theme.repeaterUnitTitle]}>
                {field.item_title_prefix || 'Unit #'}{idx + 1}
              </Text>

              {field.subfields.map(sub => {
                const subError = error?.[`${idx}_${sub.id}`]
                return (
                  <View key={sub.id} style={styles.subfieldGroup}>
                    <Text style={[styles.subfieldLabel, theme.subfieldLabel]}>
                      {sub.label} {sub.required && <Text style={styles.asterisk}>*</Text>}
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        theme.input,
                        subError && styles.inputError
                      ]}
                      placeholder={sub.placeholder || ''}
                      placeholderTextColor={isSunlight ? '#64748b' : '#64748b'}
                      value={item[sub.id] || ''}
                      onChangeText={text => onRepeaterChange(field.id, idx, sub.id, text)}
                      autoCapitalize="none"
                    />
                    {subError && <Text style={styles.errorText}>{subError}</Text>}
                  </View>
                )
              })}
            </View>
          )
        })}
      </View>
    )
  }

  // 3. Radio Group
  if (field.type === 'radio') {
    return (
      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, theme.fieldLabel]}>
          {field.label} {isRequired && <Text style={styles.asterisk}>*</Text>}
        </Text>
        <View style={styles.radioRow}>
          {(field.options || []).map(opt => {
            const optVal = typeof opt === 'object' ? opt.value : opt
            const optLabel = typeof opt === 'object' ? opt.label : opt
            const isSelected = value === optVal

            return (
              <TouchableOpacity
                key={optVal}
                activeOpacity={0.7}
                style={[
                  styles.radioBtn,
                  theme.radioBtn,
                  isSelected && (isSunlight ? lightStyles.radioBtnSelected : darkStyles.radioBtnSelected)
                ]}
                onPress={() => onChange(field.id, optVal)}
              >
                <Text
                  style={[
                    styles.radioBtnText,
                    theme.radioBtnText,
                    isSelected && styles.radioBtnTextSelected
                  ]}
                >
                  {optLabel}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    )
  }

  // 4. Select Dropdown (Segmented Options for Field Ergonomics)
  if (field.type === 'select') {
    const isNumeric = field.options.every(o => typeof o === 'number')

    return (
      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, theme.fieldLabel]}>
          {field.label} {isRequired && <Text style={styles.asterisk}>*</Text>}
        </Text>
        <View style={styles.selectPillsWrapper}>
          {(field.options || []).map(opt => {
            const optVal = typeof opt === 'object' ? opt.value : opt
            const optLabel = typeof opt === 'object' ? opt.label : (field.id === 'panel_capacity' ? `${opt} Wp` : String(opt))
            const isSelected = String(value) === String(optVal)

            return (
              <TouchableOpacity
                key={String(optVal)}
                activeOpacity={0.7}
                style={[
                  styles.selectPill,
                  theme.selectPill,
                  isSelected && (isSunlight ? lightStyles.selectPillSelected : darkStyles.selectPillSelected)
                ]}
                onPress={() => {
                  onChange(field.id, isNumeric ? (Number(optVal) || optVal) : optVal)
                }}
              >
                <Text
                  style={[
                    styles.selectPillText,
                    theme.selectPillText,
                    isSelected && styles.selectPillTextSelected
                  ]}
                >
                  {optLabel}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    )
  }

  // 5. Date Field (with Quick "Today" action for roof field capture)
  if (field.type === 'date') {
    return (
      <View style={styles.fieldGroup}>
        <View style={styles.dateLabelRow}>
          <Text style={[styles.fieldLabel, theme.fieldLabel]}>
            {field.label} {isRequired && <Text style={styles.asterisk}>*</Text>}
          </Text>
          <TouchableOpacity
            style={styles.quickTodayBtn}
            onPress={() => onChange(field.id, getTodayString())}
          >
            <Text style={styles.quickTodayText}>Set Today</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={[styles.input, theme.input, error && styles.inputError]}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={isSunlight ? '#64748b' : '#64748b'}
          value={value ?? ''}
          onChangeText={text => onChange(field.id, text)}
          autoCapitalize="none"
        />
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    )
  }

  // 6. Number / Text Input
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, theme.fieldLabel]}>
        {field.label} {isRequired && <Text style={styles.asterisk}>*</Text>}
      </Text>
      <TextInput
        style={[styles.input, theme.input, error && styles.inputError]}
        placeholder={field.placeholder || ''}
        placeholderTextColor={isSunlight ? '#64748b' : '#64748b'}
        keyboardType={field.type === 'number' ? 'numeric' : 'default'}
        value={value ? String(value) : ''}
        onChangeText={text => onChange(field.id, text)}
        autoCapitalize="none"
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  fieldGroup: {
    marginBottom: 16
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6
  },
  asterisk: {
    color: '#ef4444'
  },
  input: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 15
  },
  inputError: {
    borderColor: '#ef4444'
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
    fontWeight: '600'
  },
  radioRow: {
    flexDirection: 'row',
    gap: 8
  },
  radioBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10
  },
  radioBtnText: {
    fontSize: 14,
    fontWeight: '700'
  },
  radioBtnTextSelected: {
    color: '#38bdf8'
  },
  selectPillsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  selectPill: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  selectPillText: {
    fontSize: 13,
    fontWeight: '700'
  },
  selectPillTextSelected: {
    color: '#38bdf8'
  },
  dateLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  quickTodayBtn: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4
  },
  quickTodayText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38bdf8'
  },
  computedCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16
  },
  computedLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38bdf8',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  computedValue: {
    fontSize: 26,
    fontWeight: '800',
    marginVertical: 4
  },
  helperText: {
    fontSize: 12
  },
  repeaterContainer: {
    marginBottom: 16
  },
  repeaterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff'
  },
  repeaterCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10
  },
  repeaterUnitTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5
  },
  subfieldGroup: {
    marginBottom: 8
  },
  subfieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4
  }
})

const darkStyles = StyleSheet.create({
  fieldLabel: { color: '#f8fafc' },
  subfieldLabel: { color: '#cbd5e1' },
  input: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
    color: '#f8fafc'
  },
  radioBtn: {
    backgroundColor: '#0f172a',
    borderColor: '#334155'
  },
  radioBtnSelected: {
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.15)'
  },
  radioBtnText: { color: '#94a3b8' },
  selectPill: {
    backgroundColor: '#0f172a',
    borderColor: '#334155'
  },
  selectPillSelected: {
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.15)'
  },
  selectPillText: { color: '#94a3b8' },
  computedCard: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderColor: 'rgba(56, 189, 248, 0.3)'
  },
  computedValue: { color: '#38bdf8' },
  helperText: { color: '#94a3b8' },
  countBadge: { backgroundColor: '#334155' },
  repeaterCard: {
    backgroundColor: '#0f172a',
    borderColor: '#334155'
  },
  repeaterUnitTitle: { color: '#38bdf8' }
})

const lightStyles = StyleSheet.create({
  fieldLabel: { color: '#000000' },
  subfieldLabel: { color: '#1e293b' },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#475569',
    color: '#000000'
  },
  radioBtn: {
    backgroundColor: '#ffffff',
    borderColor: '#475569'
  },
  radioBtnSelected: {
    borderColor: '#0284c7',
    backgroundColor: '#e0f2fe'
  },
  radioBtnText: { color: '#334155' },
  selectPill: {
    backgroundColor: '#ffffff',
    borderColor: '#475569'
  },
  selectPillSelected: {
    borderColor: '#0284c7',
    backgroundColor: '#e0f2fe'
  },
  selectPillText: { color: '#334155' },
  computedCard: {
    backgroundColor: '#f0f9ff',
    borderColor: '#0284c7'
  },
  computedValue: { color: '#0284c7' },
  helperText: { color: '#475569' },
  countBadge: { backgroundColor: '#0284c7' },
  repeaterCard: {
    backgroundColor: '#f8fafc',
    borderColor: '#64748b'
  },
  repeaterUnitTitle: { color: '#0284c7' }
})
