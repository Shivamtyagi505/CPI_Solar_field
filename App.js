import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  StatusBar
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import defaultSchema from './src/schema.json'
import {
  isVisible,
  getRequiredPhotoSlots,
  validateForm,
  getInitialFormData
} from './src/engine/formEngine'
import DynamicField from './src/components/DynamicField'
import PhotoSection from './src/components/PhotoSection'
import ValidationBanner from './src/components/ValidationBanner'
import LiveSchemaModal from './src/components/LiveSchemaModal'

const STORAGE_DATA_KEY = '@cpi_commissioning_form_data_v2'
const STORAGE_SCHEMA_KEY = '@cpi_commissioning_schema_v2'

export default function App() {
  const [activeSchema, setActiveSchema] = useState(defaultSchema)
  const [formData, setFormData] = useState(() => getInitialFormData(defaultSchema))
  const [activeTab, setActiveTab] = useState('construction')
  const [submitted, setSubmitted] = useState(false)
  const [isSunlight, setIsSunlight] = useState(false)
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false)
  const [lastSavedTime, setLastSavedTime] = useState(null)
  const [certifiedSuccess, setCertifiedSuccess] = useState(false)

  const scrollViewRef = useRef(null)

  // 1. Cold start persistence load
  useEffect(() => {
    async function loadOfflineStorage() {
      try {
        const [savedSchema, savedData] = await Promise.all([
          AsyncStorage.getItem(STORAGE_SCHEMA_KEY),
          AsyncStorage.getItem(STORAGE_DATA_KEY)
        ])

        if (savedSchema) {
          try {
            setActiveSchema(JSON.parse(savedSchema))
          } catch (e) {}
        }

        if (savedData) {
          try {
            setFormData(JSON.parse(savedData))
          } catch (e) {}
        }
      } catch (err) {
        console.warn('Failed to load from AsyncStorage:', err)
      }
    }
    loadOfflineStorage()
  }, [])

  // 2. Auto-save on every state change (Survives force-close and reboot)
  useEffect(() => {
    async function persistOfflineData() {
      try {
        await AsyncStorage.setItem(STORAGE_DATA_KEY, JSON.stringify(formData))
        const now = new Date()
        setLastSavedTime(
          now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        )
      } catch (err) {
        console.warn('Failed to persist to AsyncStorage:', err)
      }
    }
    persistOfflineData()
  }, [formData])

  // Maintain repeater sizing if ESS count changes
  useEffect(() => {
    const count = parseInt(formData.no_of_ess_installed, 10) || 1
    const currentUnits = [...(formData.ess_units || [])]
    if (currentUnits.length !== count) {
      if (currentUnits.length < count) {
        for (let i = currentUnits.length; i < count; i++) {
          currentUnits.push({ make: '', serial_no: '' })
        }
      } else {
        currentUnits.length = count
      }
      setFormData(prev => ({ ...prev, ess_units: currentUnits }))
    }
  }, [formData.no_of_ess_installed])

  const handleFieldChange = (fieldId, value) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }))
    setSubmitted(false)
    setCertifiedSuccess(false)
  }

  const handleRepeaterChange = (repeaterId, index, subfieldId, value) => {
    setFormData(prev => {
      const items = [...(prev[repeaterId] || [])]
      if (!items[index]) items[index] = {}
      items[index] = { ...items[index], [subfieldId]: value }
      return { ...prev, [repeaterId]: items }
    })
    setSubmitted(false)
    setCertifiedSuccess(false)
  }

  const handleTogglePhoto = (slotId) => {
    setFormData(prev => {
      const current = prev.photos?.[slotId]
      const now = new Date()
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      return {
        ...prev,
        photos: {
          ...prev.photos,
          [slotId]: current?.captured ? null : { captured: true, time: timeStr, timestamp: now.toISOString() }
        }
      }
    })
    setSubmitted(false)
    setCertifiedSuccess(false)
  }

  // Live Validation
  const validationErrors = useMemo(() => {
    return validateForm(activeSchema, formData)
  }, [activeSchema, formData])

  // Required and outstanding photo slots
  const requiredPhotoSlots = useMemo(() => {
    return getRequiredPhotoSlots(activeSchema, formData)
  }, [activeSchema, formData])

  const outstandingSlots = useMemo(() => {
    return requiredPhotoSlots.filter(s => !formData.photos?.[s.id]?.captured)
  }, [requiredPhotoSlots, formData.photos])

  // Section error counts for badges
  const sectionErrorMap = useMemo(() => {
    const map = {}
    for (const err of validationErrors) {
      map[err.sectionId] = (map[err.sectionId] || 0) + 1
    }
    return map
  }, [validationErrors])

  const getFieldError = (fieldId) => {
    if (!submitted) return null
    return validationErrors.find(e => e.fieldId === fieldId)?.message
  }

  const getRepeaterErrors = (repeaterId) => {
    if (!submitted) return {}
    const res = {}
    for (const err of validationErrors) {
      if (err.fieldId.startsWith(`${repeaterId}_`)) {
        const key = err.fieldId.replace(`${repeaterId}_`, '')
        res[key] = err.message
      }
    }
    return res
  }

  // Save / Submit Attempt
  const handleSaveAttempt = () => {
    setSubmitted(true)
    if (validationErrors.length > 0) {
      setCertifiedSuccess(false)
      const firstErr = validationErrors[0]
      if (firstErr) {
        setActiveTab(firstErr.sectionId)
        scrollViewRef.current?.scrollTo({ y: 0, animated: true })
      }
      Alert.alert(
        'Validation Issues Found',
        `Cannot certify form: ${validationErrors.length} rule(s) or photo requirements broken. Review the flagged fields in red.`,
        [{ text: 'Review Issues' }]
      )
    } else {
      setCertifiedSuccess(true)
      Alert.alert(
        '✓ Commissioning Form Certified',
        'All sections, validation rules, and mandatory photos are verified. The record has been safely sealed in local storage and is ready for sync.',
        [{ text: 'OK' }]
      )
      scrollViewRef.current?.scrollTo({ y: 0, animated: true })
    }
  }

  // Reset Draft
  const handleResetForm = () => {
    Alert.alert(
      'Reset Commissioning Form?',
      'All entered details and photo captures will be cleared from offline storage.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Draft',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem(STORAGE_DATA_KEY)
            setFormData(getInitialFormData(activeSchema))
            setSubmitted(false)
            setCertifiedSuccess(false)
          }
        }
      ]
    )
  }

  // Live Schema Mutation Presets
  const handleApplyPreset = async (presetType) => {
    const updated = JSON.parse(JSON.stringify(activeSchema))

    if (presetType === 'add_panel_650') {
      const util = updated.sections.find(s => s.id === 'utility_installation')
      const panelField = util?.fields.find(f => f.id === 'panel_capacity')
      if (panelField && !panelField.options.includes(650)) {
        panelField.options.push(650)
      }
    } else if (presetType === 'add_rear_photo') {
      const photos = updated.sections.find(s => s.id === 'photos')
      const struct = photos?.photo_groups.find(g => g.group_id === 'structure_photos')
      if (struct && !struct.slots.some(s => s.id === 'photo_struct_rear')) {
        struct.slots.push({ id: 'photo_struct_rear', label: 'Rear / Inverter Mount' })
      }
    } else if (presetType === 'add_earthing_points') {
      const constr = updated.sections.find(s => s.id === 'construction')
      const nosField = constr?.fields.find(f => f.id === 'earthing_nos')
      if (nosField) {
        nosField.options = [1, 2, 3, 4, 5]
      }
    }

    setActiveSchema(updated)
    await AsyncStorage.setItem(STORAGE_SCHEMA_KEY, JSON.stringify(updated))
    Alert.alert('Schema Updated', 'Dynamic form engine updated fields and rules without code re-deployment.')
  }

  const handleResetSchema = async () => {
    setActiveSchema(defaultSchema)
    await AsyncStorage.removeItem(STORAGE_SCHEMA_KEY)
    Alert.alert('Baseline Schema Restored', 'Form schema reset to v1.0.0.')
  }

  const handleJumpToSection = (sectionId) => {
    setActiveTab(sectionId)
    scrollViewRef.current?.scrollTo({ y: 0, animated: true })
  }

  const activeSection = activeSchema.sections.find(s => s.id === activeTab) || activeSchema.sections[0]
  const theme = isSunlight ? lightTheme : darkTheme

  return (
    <SafeAreaView style={[styles.safeArea, theme.safeArea]}>
      <StatusBar barStyle={isSunlight ? 'dark-content' : 'light-content'} />

      {/* App Header */}
      <View style={[styles.header, theme.header]}>
        <View style={styles.headerTop}>
          <View style={styles.brandRow}>
            <Text style={styles.brandBadge}>CPI SOLAR FIELD</Text>
            <View style={styles.offlinePill}>
              <View style={styles.offlineDot} />
              <Text style={styles.offlineText}>Airplane Mode Safe</Text>
            </View>
          </View>

          <View style={styles.headerBtnRow}>
            <TouchableOpacity
              style={[styles.headerBtn, isSunlight && styles.headerBtnActive]}
              onPress={() => setIsSunlight(prev => !prev)}
            >
              <Text style={[styles.headerBtnText, isSunlight && styles.headerBtnTextActive]}>
                {isSunlight ? '☀️ Sun' : '🌙 Dark'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => setIsSchemaModalOpen(true)}
            >
              <Text style={styles.headerBtnText}>⚙ Schema</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.appTitle, theme.appTitle]}>{activeSchema.title}</Text>
        <Text style={[styles.appSubtitle, theme.appSubtitle]}>
          Schema v{activeSchema.version} • Offline Auto-Saved: {lastSavedTime || 'Active'}
        </Text>
      </View>

      {/* Dynamic Tabs (100% Schema-Driven) */}
      <View style={[styles.tabBar, theme.tabBar]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollContent}>
          {activeSchema.sections.map(section => {
            if (!isVisible(section, formData)) return null
            const isActive = activeTab === section.id
            const errorCount = sectionErrorMap[section.id] || 0
            const isPhotoSection = section.id === 'photos'
            const outstandingCount = isPhotoSection ? outstandingSlots.length : 0

            return (
              <TouchableOpacity
                key={section.id}
                activeOpacity={0.7}
                style={[
                  styles.tabItem,
                  theme.tabItem,
                  isActive && (isSunlight ? lightTheme.tabItemActive : darkTheme.tabItemActive)
                ]}
                onPress={() => setActiveTab(section.id)}
              >
                <Text style={styles.tabCode}>{section.code || section.id.charAt(0).toUpperCase()}</Text>
                <Text
                  style={[
                    styles.tabTitle,
                    theme.tabTitle,
                    isActive && styles.tabTitleActive
                  ]}
                >
                  {section.title}
                </Text>

                {submitted && errorCount > 0 && outstandingCount === 0 && (
                  <View style={styles.tabErrorBadge}>
                    <Text style={styles.tabBadgeText}>{errorCount}</Text>
                  </View>
                )}

                {outstandingCount > 0 && (
                  <View style={styles.tabWarningBadge}>
                    <Text style={styles.tabBadgeText}>{outstandingCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      {/* Form Content */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.contentScroll}
        contentContainerStyle={styles.contentContainer}
      >
        {certifiedSuccess && (
          <View style={styles.certifiedBanner}>
            <Text style={styles.certifiedTitle}>✓ Commissioning Form Certified</Text>
            <Text style={styles.certifiedDesc}>
              All civil, electrical, and photo verification requirements satisfied. Saved locally for idempotent sync.
            </Text>
          </View>
        )}

        {activeSection && (
          <View style={[styles.sectionCard, theme.sectionCard]}>
            {activeSection.id === 'photos' ? (
              <PhotoSection
                schemaSection={activeSection}
                formData={formData}
                onTogglePhoto={handleTogglePhoto}
                outstandingSlots={outstandingSlots}
                isSunlight={isSunlight}
              />
            ) : (
              <View>
                <View style={styles.sectionHeading}>
                  <Text style={styles.sectionCodeTag}>
                    {activeSection.code ? `Section ${activeSection.code}` : 'Section'}
                  </Text>
                  <Text style={[styles.sectionHeadingTitle, theme.sectionHeadingTitle]}>
                    {activeSection.title}
                  </Text>
                  {activeSection.description && (
                    <Text style={[styles.sectionHeadingDesc, theme.sectionHeadingDesc]}>
                      {activeSection.description}
                    </Text>
                  )}
                </View>

                {(activeSection.fields || []).map(field => {
                  if (!isVisible(field, formData)) return null
                  return (
                    <DynamicField
                      key={field.id}
                      field={field}
                      value={formData[field.id]}
                      formData={formData}
                      onChange={handleFieldChange}
                      error={
                        field.type === 'repeater'
                          ? getRepeaterErrors(field.id)
                          : getFieldError(field.id)
                      }
                      onRepeaterChange={handleRepeaterChange}
                      isSunlight={isSunlight}
                    />
                  )
                })}
              </View>
            )}
          </View>
        )}

        {submitted && validationErrors.length > 0 && (
          <ValidationBanner
            errors={validationErrors}
            onJumpToSection={handleJumpToSection}
            isSunlight={isSunlight}
          />
        )}
      </ScrollView>

      {/* Sticky Bottom Action Bar */}
      <View style={[styles.bottomBar, theme.bottomBar]}>
        <TouchableOpacity style={[styles.secondaryBtn, theme.secondaryBtn]} onPress={handleResetForm}>
          <Text style={[styles.secondaryBtnText, theme.secondaryBtnText]}>Reset Draft</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.primaryBtn,
            submitted && validationErrors.length > 0 && styles.primaryBtnDanger
          ]}
          onPress={handleSaveAttempt}
        >
          <Text style={styles.primaryBtnText}>
            {validationErrors.length === 0
              ? '✓ Complete & Certify Form'
              : `Validate & Save (${validationErrors.length} Issue${validationErrors.length > 1 ? 's' : ''})`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Live Schema Modal */}
      <LiveSchemaModal
        visible={isSchemaModalOpen}
        onClose={() => setIsSchemaModalOpen(false)}
        currentSchema={activeSchema}
        onApplyPreset={handleApplyPreset}
        onResetSchema={handleResetSchema}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  brandBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4
  },
  offlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)'
  },
  offlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginRight: 4
  },
  offlineText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#34d399'
  },
  headerBtnRow: {
    flexDirection: 'row',
    gap: 6
  },
  headerBtn: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  headerBtnActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7'
  },
  headerBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f8fafc'
  },
  headerBtnTextActive: {
    color: '#ffffff'
  },
  appTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3
  },
  appSubtitle: {
    fontSize: 11,
    marginTop: 2
  },
  tabBar: {
    borderBottomWidth: 1
  },
  tabScrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 6
  },
  tabCode: {
    fontSize: 10,
    fontWeight: '800',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    color: '#38bdf8'
  },
  tabTitle: {
    fontSize: 13,
    fontWeight: '700'
  },
  tabTitleActive: {
    color: '#38bdf8'
  },
  tabErrorBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10
  },
  tabWarningBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10
  },
  tabBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff'
  },
  contentScroll: {
    flex: 1
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40
  },
  sectionCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16
  },
  sectionHeading: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 10,
    marginBottom: 16
  },
  sectionCodeTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38bdf8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2
  },
  sectionHeadingTitle: {
    fontSize: 17,
    fontWeight: '800'
  },
  sectionHeadingDesc: {
    fontSize: 12,
    marginTop: 2
  },
  certifiedBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 8,
    padding: 14,
    marginBottom: 16
  },
  certifiedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#34d399',
    marginBottom: 2
  },
  certifiedDesc: {
    fontSize: 12,
    color: '#cbd5e1'
  },
  bottomBar: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 10
  },
  secondaryBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '700'
  },
  primaryBtn: {
    flex: 2,
    backgroundColor: '#38bdf8',
    minHeight: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14
  },
  primaryBtnDanger: {
    backgroundColor: '#ef4444'
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0b1120'
  }
})

const darkTheme = StyleSheet.create({
  safeArea: { backgroundColor: '#0b1120' },
  header: { backgroundColor: '#0b1120', borderBottomColor: '#334155' },
  appTitle: { color: '#f8fafc' },
  appSubtitle: { color: '#94a3b8' },
  tabBar: { backgroundColor: '#1e293b', borderBottomColor: '#334155' },
  tabItem: { backgroundColor: '#0f172a' },
  tabItemActive: { borderColor: '#38bdf8', backgroundColor: '#0b1120' },
  tabTitle: { color: '#94a3b8' },
  sectionCard: { backgroundColor: '#1e293b', borderColor: '#334155' },
  sectionHeadingTitle: { color: '#f8fafc' },
  sectionHeadingDesc: { color: '#94a3b8' },
  bottomBar: { backgroundColor: '#0b1120', borderTopColor: '#334155' },
  secondaryBtn: { backgroundColor: '#1e293b', borderColor: '#334155' },
  secondaryBtnText: { color: '#f8fafc' }
})

const lightTheme = StyleSheet.create({
  safeArea: { backgroundColor: '#ffffff' },
  header: { backgroundColor: '#ffffff', borderBottomColor: '#94a3b8' },
  appTitle: { color: '#000000' },
  appSubtitle: { color: '#475569' },
  tabBar: { backgroundColor: '#f1f5f9', borderBottomColor: '#94a3b8' },
  tabItem: { backgroundColor: '#ffffff' },
  tabItemActive: { borderColor: '#0284c7', backgroundColor: '#e0f2fe' },
  tabTitle: { color: '#334155' },
  sectionCard: { backgroundColor: '#f8fafc', borderColor: '#64748b' },
  sectionHeadingTitle: { color: '#000000' },
  sectionHeadingDesc: { color: '#475569' },
  bottomBar: { backgroundColor: '#ffffff', borderTopColor: '#94a3b8' },
  secondaryBtn: { backgroundColor: '#f1f5f9', borderColor: '#64748b' },
  secondaryBtnText: { color: '#000000' }
})
