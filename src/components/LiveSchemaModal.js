import React from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet
} from 'react-native'

export default function LiveSchemaModal({
  visible,
  onClose,
  currentSchema,
  onApplyPreset,
  onResetSchema
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Remote Schema Architecture</Text>
              <Text style={styles.subtitle}>Zero-rebuild live schema simulation</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body}>
            <Text style={styles.explainer}>
              In production, this JSON schema is fetched during periodic sync and cached in AsyncStorage.
              Sections, fields, validation constraints, and photo checklists adapt dynamically without submitting an App Store or Play Store binary update.
            </Text>

            <Text style={styles.sectionHeader}>Test Live Changes During Interview:</Text>

            <TouchableOpacity
              style={styles.presetBtn}
              onPress={() => {
                onApplyPreset('add_panel_650')
                onClose()
              }}
            >
              <Text style={styles.presetBtnText}>⚡ Add 650 Wp to Panel Capacity</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.presetBtn}
              onPress={() => {
                onApplyPreset('add_rear_photo')
                onClose()
              }}
            >
              <Text style={styles.presetBtnText}>📷 Add 'Rear / Inverter' Photo Slot</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.presetBtn}
              onPress={() => {
                onApplyPreset('add_earthing_points')
                onClose()
              }}
            >
              <Text style={styles.presetBtnText}>⚡ Allow up to 5 Earthing Points (EP1..EP5)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.presetBtn, styles.resetBtn]}
              onPress={() => {
                onResetSchema()
                onClose()
              }}
            >
              <Text style={styles.resetBtnText}>↺ Reset to Baseline Schema (v1.0.0)</Text>
            </TouchableOpacity>

            <Text style={[styles.sectionHeader, { marginTop: 16 }]}>Active Schema Summary:</Text>
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>
                Version: {currentSchema.version}{'\n'}
                Sections: {currentSchema.sections.map(s => s.code || s.id).join(', ')}{'\n'}
                Total Fields: {currentSchema.sections.reduce((acc, s) => acc + (s.fields?.length || 0), 0)}{'\n'}
                Photo Groups: {currentSchema.sections.find(s => s.id === 'photos')?.photo_groups?.length || 0}
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
              <Text style={styles.doneBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end'
  },
  modalCard: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 2,
    borderTopColor: '#38bdf8',
    maxHeight: '80%',
    padding: 16
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingBottom: 12,
    marginBottom: 12
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc'
  },
  subtitle: {
    fontSize: 11,
    color: '#94a3b8'
  },
  closeBtn: {
    padding: 6
  },
  closeText: {
    fontSize: 18,
    color: '#94a3b8',
    fontWeight: '700'
  },
  body: {
    marginBottom: 12
  },
  explainer: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 18,
    marginBottom: 14
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#38bdf8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8
  },
  presetBtn: {
    backgroundColor: '#0f172a',
    borderColor: '#38bdf8',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8
  },
  presetBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38bdf8'
  },
  resetBtn: {
    borderColor: '#64748b'
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8'
  },
  codeBox: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155'
  },
  codeText: {
    fontFamily: 'Courier',
    fontSize: 11,
    color: '#38bdf8'
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 12
  },
  doneBtn: {
    backgroundColor: '#38bdf8',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center'
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a'
  }
})
