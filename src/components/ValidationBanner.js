import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet
} from 'react-native'

export default function ValidationBanner({ errors, onJumpToSection, isSunlight }) {
  if (!errors || errors.length === 0) return null

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        ⚠️ Form Incomplete: {errors.length} Rule{errors.length > 1 ? 's' : ''} Broken
      </Text>
      <Text style={styles.subtitle}>
        Tap any issue below to navigate directly to the field.
      </Text>

      {errors.map((err, idx) => (
        <TouchableOpacity
          key={idx}
          activeOpacity={0.7}
          style={styles.errorRow}
          onPress={() => onJumpToSection && onJumpToSection(err.sectionId, err.fieldId)}
        >
          <View style={styles.errorDot} />
          <View style={styles.errorContent}>
            <Text style={styles.sectionBadge}>{err.sectionTitle}</Text>
            <Text style={styles.errorMessage}>{err.message}</Text>
          </View>
          <Text style={styles.jumpArrow}>Fix →</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: '#ef4444',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginVertical: 14
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: '#f87171',
    marginBottom: 2
  },
  subtitle: {
    fontSize: 11,
    color: '#fca5a5',
    marginBottom: 8
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 6
  },
  errorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
    marginRight: 8
  },
  errorContent: {
    flex: 1
  },
  sectionBadge: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: '#38bdf8'
  },
  errorMessage: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff'
  },
  jumpArrow: {
    fontSize: 12,
    fontWeight: '800',
    color: '#38bdf8',
    marginLeft: 6
  }
})
