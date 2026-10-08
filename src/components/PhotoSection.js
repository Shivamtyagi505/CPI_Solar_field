import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet
} from 'react-native'
import { isVisible } from '../engine/formEngine'

export default function PhotoSection({
  schemaSection,
  formData,
  onTogglePhoto,
  outstandingSlots,
  isSunlight
}) {
  const photoGroups = schemaSection.photo_groups || []
  const photos = formData.photos || {}
  const theme = isSunlight ? lightStyles : darkStyles

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTag, theme.sectionTag]}>
          {schemaSection.code ? `Section ${schemaSection.code}` : 'Section'}
        </Text>
        <Text style={[styles.sectionTitle, theme.sectionTitle]}>
          {schemaSection.title}
        </Text>
        <Text style={[styles.sectionDesc, theme.sectionDesc]}>
          {schemaSection.description || 'Tap each slot to mark as captured. Form cannot be completed with outstanding slots.'}
        </Text>
      </View>

      {photoGroups.map(group => {
        if (!isVisible(group, formData)) return null

        const slots = []
        if (group.slots) {
          slots.push(...group.slots)
        }
        if (group.dynamic_slots) {
          const { source_field, prefix = 'P', label_template } = group.dynamic_slots
          const count = parseInt(formData[source_field], 10) || 0
          for (let i = 1; i <= count; i++) {
            const slotLabel = label_template
              ? label_template.replace(/\{i\}/g, i)
              : `${prefix}${i}`
            slots.push({
              id: `photo_${prefix.toLowerCase()}_${i}`,
              label: slotLabel
            })
          }
        }

        const capturedCount = slots.filter(s => !!photos[s.id]?.captured).length
        const isGroupComplete = slots.length > 0 && capturedCount === slots.length

        return (
          <View key={group.group_id} style={styles.groupContainer}>
            <View style={styles.groupHeaderRow}>
              <Text style={[styles.groupTitle, theme.groupTitle]}>
                {group.group_title}
              </Text>
              <View
                style={[
                  styles.groupBadge,
                  isGroupComplete ? styles.groupBadgeComplete : styles.groupBadgePending
                ]}
              >
                <Text style={styles.groupBadgeText}>
                  {capturedCount} of {slots.length} Captured
                </Text>
              </View>
            </View>

            <View style={styles.photoGrid}>
              {slots.map(slot => {
                const photoRecord = photos[slot.id]
                const isCaptured = !!photoRecord?.captured
                const isOutstanding = outstandingSlots.some(s => s.id === slot.id)

                return (
                  <TouchableOpacity
                    key={slot.id}
                    activeOpacity={0.7}
                    style={[
                      styles.photoCard,
                      theme.photoCard,
                      isCaptured && styles.photoCardCaptured,
                      isOutstanding && styles.photoCardMissing
                    ]}
                    onPress={() => onTogglePhoto(slot.id)}
                  >
                    <View
                      style={[
                        styles.iconCircle,
                        isCaptured ? styles.iconCircleCaptured : theme.iconCircle
                      ]}
                    >
                      <Text style={styles.iconText}>
                        {isCaptured ? '✓' : '📷'}
                      </Text>
                    </View>
                    <Text style={[styles.slotLabel, theme.slotLabel]}>
                      {slot.label}
                    </Text>
                    <Text
                      style={[
                        styles.slotStatus,
                        isCaptured ? styles.slotStatusCaptured : theme.slotStatus
                      ]}
                    >
                      {isCaptured ? 'Captured' : 'Tap to Capture'}
                    </Text>
                    {photoRecord?.time && (
                      <Text style={styles.timestampText}>{photoRecord.time}</Text>
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24
  },
  sectionHeader: {
    marginBottom: 16
  },
  sectionTag: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4
  },
  sectionDesc: {
    fontSize: 12
  },
  groupContainer: {
    marginBottom: 20
  },
  groupHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: '700'
  },
  groupBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12
  },
  groupBadgeComplete: {
    backgroundColor: '#10b981'
  },
  groupBadgePending: {
    backgroundColor: '#f59e0b'
  },
  groupBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff'
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  photoCard: {
    width: '48%',
    minHeight: 120,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12
  },
  photoCardCaptured: {
    borderStyle: 'solid',
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.12)'
  },
  photoCardMissing: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)'
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6
  },
  iconCircleCaptured: {
    backgroundColor: '#10b981'
  },
  iconText: {
    fontSize: 18,
    color: '#ffffff'
  },
  slotLabel: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 2
  },
  slotStatus: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  slotStatusCaptured: {
    color: '#10b981'
  },
  timestampText: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 2
  }
})

const darkStyles = StyleSheet.create({
  sectionTag: { color: '#38bdf8' },
  sectionTitle: { color: '#f8fafc' },
  sectionDesc: { color: '#94a3b8' },
  groupTitle: { color: '#f8fafc' },
  photoCard: {
    backgroundColor: '#0f172a',
    borderColor: '#334155'
  },
  iconCircle: { backgroundColor: '#1e293b' },
  slotLabel: { color: '#f8fafc' },
  slotStatus: { color: '#64748b' }
})

const lightStyles = StyleSheet.create({
  sectionTag: { color: '#0284c7' },
  sectionTitle: { color: '#000000' },
  sectionDesc: { color: '#475569' },
  groupTitle: { color: '#000000' },
  photoCard: {
    backgroundColor: '#ffffff',
    borderColor: '#475569'
  },
  iconCircle: { backgroundColor: '#e2e8f0' },
  slotLabel: { color: '#000000' },
  slotStatus: { color: '#475569' }
})
