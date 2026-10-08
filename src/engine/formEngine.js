/**
 * CPI Site Commissioning Form Engine
 * Pure, deterministic schema interpreter for offline mobile field capture.
 *
 * Implements:
 * 1. Declarative field visibility evaluation
 * 2. Dynamic formula computation for derived fields
 * 3. Validation rule engine (future date, cross-field chronological orders, bounds)
 * 4. Dynamic photo slot generation and completeness tracking
 */

export function getTodayString() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Evaluates whether a section or field is currently visible given form data
 */
export function isVisible(item, formData) {
  if (!item || !item.visible_when) return true
  const { field, equals, not_equals } = item.visible_when
  const targetVal = formData[field]

  if (equals !== undefined) {
    return targetVal === equals
  }
  if (not_equals !== undefined) {
    return targetVal !== not_equals
  }
  return true
}

/**
 * Computes derived values from formula declarations (e.g. Solar PV Capacity)
 */
export function evaluateComputedField(field, formData) {
  if (field.type !== 'computed' || !field.formula) {
    return ''
  }

  try {
    if (field.formula === '(panel_capacity * number_of_solar_panels) / 1000') {
      const cap = parseFloat(formData.panel_capacity) || 0
      const count = parseFloat(formData.number_of_solar_panels) || 0
      if (count <= 0) return '0.00'
      const val = (cap * count) / 1000
      return val.toFixed(2)
    }

    // Generic safe formula evaluator for basic arithmetic (+, -, *, /)
    const sanitizedFormula = field.formula.replace(/([a-zA-Z0-9_]+)/g, (match) => {
      if (['Math', 'round', 'floor', 'ceil', 'abs'].includes(match)) return match
      const val = parseFloat(formData[match])
      return isNaN(val) ? '0' : `(${val})`
    })

    // Restricted calculation
    const calc = Function(`'use strict'; return (${sanitizedFormula})`)()
    const num = parseFloat(calc)
    if (isNaN(num)) return '0.00'

    if (field.format && field.format.startsWith('decimals:')) {
      const decimals = parseInt(field.format.split(':')[1], 10) || 2
      return num.toFixed(decimals)
    }
    return String(num)
  } catch (err) {
    console.warn(`Failed to evaluate formula for ${field.id}:`, err)
    return '0.00'
  }
}

/**
 * Extracts all currently required photo slots based on form data and schema
 */
export function getRequiredPhotoSlots(schema, formData) {
  const slots = []
  const photoSection = schema.sections.find(s => s.id === 'photos')
  if (!photoSection || !photoSection.photo_groups) return slots

  for (const group of photoSection.photo_groups) {
    if (!isVisible(group, formData)) continue

    // Static slots
    if (group.slots && Array.isArray(group.slots)) {
      for (const slot of group.slots) {
        slots.push({
          id: slot.id,
          label: slot.label,
          groupTitle: group.group_title,
          groupId: group.group_id
        })
      }
    }

    // Dynamic slots (e.g. Earthing Points EP1..EPn)
    if (group.dynamic_slots) {
      const { source_field, prefix = 'P', label_template } = group.dynamic_slots
      const count = parseInt(formData[source_field], 10) || 0
      for (let i = 1; i <= count; i++) {
        const slotLabel = label_template
          ? label_template.replace(/\{i\}/g, i)
          : `${prefix}${i}`
        slots.push({
          id: `photo_${prefix.toLowerCase()}_${i}`,
          label: slotLabel,
          groupTitle: group.group_title,
          groupId: group.group_id
        })
      }
    }
  }

  return slots
}

/**
 * Validates the entire form against schema rules
 * Returns an array of errors: [{ sectionId, sectionTitle, fieldId, rule, message }]
 */
export function validateForm(schema, formData) {
  const errors = []
  const today = getTodayString()

  for (const section of schema.sections) {
    if (!isVisible(section, formData)) continue

    // 1. Validate fields inside standard sections
    if (section.fields && Array.isArray(section.fields)) {
      for (const field of section.fields) {
        if (!isVisible(field, formData)) continue

        const val = formData[field.id]

        // Required check
        if (field.required) {
          const isEmpty = val === undefined || val === null || String(val).trim() === ''
          if (isEmpty) {
            errors.push({
              sectionId: section.id,
              sectionTitle: `${section.code} — ${section.title}`,
              fieldId: field.id,
              rule: 'required',
              message: `${field.label} is required.`
            })
            continue // Skip further checks if empty
          }
        }

        // Numeric positive checks
        if (field.type === 'number') {
          const num = parseFloat(val)
          if (field.min !== undefined && num < field.min) {
            errors.push({
              sectionId: section.id,
              sectionTitle: `${section.code} — ${section.title}`,
              fieldId: field.id,
              rule: 'min',
              message: `${field.label} must be at least ${field.min}.`
            })
          }
          if (field.max !== undefined && num > field.max) {
            errors.push({
              sectionId: section.id,
              sectionTitle: `${section.code} — ${section.title}`,
              fieldId: field.id,
              rule: 'max',
              message: `${field.label} cannot exceed ${field.max}.`
            })
          }
        }

        // Custom validation rules
        if (field.validation && Array.isArray(field.validation) && val) {
          for (const ruleObj of field.validation) {
            if (ruleObj.rule === 'not_future') {
              // Date must not be in the future
              if (String(val) > today) {
                errors.push({
                  sectionId: section.id,
                  sectionTitle: `${section.code} — ${section.title}`,
                  fieldId: field.id,
                  rule: 'not_future',
                  message: ruleObj.message || `${field.label} cannot be in the future.`
                })
              }
            } else if (ruleObj.rule === 'not_before_field') {
              const targetVal = formData[ruleObj.field]
              if (targetVal && String(val) < String(targetVal)) {
                errors.push({
                  sectionId: section.id,
                  sectionTitle: `${section.code} — ${section.title}`,
                  fieldId: field.id,
                  rule: 'not_before_field',
                  message: ruleObj.message || `${field.label} cannot be earlier than ${ruleObj.field}.`
                })
              }
            } else if (ruleObj.rule === 'not_after_field') {
              const targetVal = formData[ruleObj.field]
              if (targetVal && String(val) > String(targetVal)) {
                errors.push({
                  sectionId: section.id,
                  sectionTitle: `${section.code} — ${section.title}`,
                  fieldId: field.id,
                  rule: 'not_after_field',
                  message: ruleObj.message || `${field.label} cannot be later than ${ruleObj.field}.`
                })
              }
            }
          }
        }

        // Repeater subfields validation
        if (field.type === 'repeater' && field.subfields) {
          const items = Array.isArray(val) ? val : []
          const requiredCount = parseInt(formData[field.count_field], 10) || items.length

          for (let idx = 0; idx < requiredCount; idx++) {
            const item = items[idx] || {}
            for (const sub of field.subfields) {
              if (sub.required && (!item[sub.id] || String(item[sub.id]).trim() === '')) {
                errors.push({
                  sectionId: section.id,
                  sectionTitle: `${section.code} — ${section.title}`,
                  fieldId: `${field.id}_${idx}_${sub.id}`,
                  rule: 'repeater_required',
                  message: `${field.item_title_prefix || 'Item '}${idx + 1}: ${sub.label} is required.`
                })
              }
            }
          }
        }
      }
    }

    // 2. Validate photos section
    if (section.id === 'photos') {
      const requiredSlots = getRequiredPhotoSlots(schema, formData)
      const photos = formData.photos || {}

      for (const slot of requiredSlots) {
        if (!photos[slot.id] || !photos[slot.id].captured) {
          errors.push({
            sectionId: section.id,
            sectionTitle: `${section.code} — ${section.title}`,
            fieldId: slot.id,
            rule: 'photo_required',
            message: `Photo missing: [${slot.groupTitle}] — ${slot.label}`
          })
        }
      }
    }
  }

  return errors
}

/**
 * Initializes clean default formData based on schema specification
 */
export function getInitialFormData(schema) {
  const initial = {
    photos: {}
  }

  for (const section of schema.sections) {
    if (section.fields) {
      for (const field of section.fields) {
        if (field.default !== undefined) {
          initial[field.id] = field.default
        } else if (field.type === 'radio' && field.options && field.options.length > 0) {
          initial[field.id] = field.options[0].value || field.options[0]
        } else if (field.type === 'select' && field.options && field.options.length > 0) {
          initial[field.id] = field.options[0]
        } else if (field.type === 'repeater') {
          initial[field.id] = [{}]
        } else {
          initial[field.id] = ''
        }
      }
    }
  }

  // Pre-seed ESS units structure
  if (initial.no_of_ess_installed) {
    const count = parseInt(initial.no_of_ess_installed, 10) || 1
    initial.ess_units = Array.from({ length: count }, () => ({ make: '', serial_no: '' }))
  }

  return initial
}
