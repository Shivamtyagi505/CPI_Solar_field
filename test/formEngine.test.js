import {
  getTodayString,
  isVisible,
  evaluateComputedField,
  getRequiredPhotoSlots,
  validateForm
} from '../src/engine/formEngine.js'
import fs from 'fs'

const schema = JSON.parse(fs.readFileSync(new URL('../src/schema.json', import.meta.url), 'utf-8'))

console.log('--- Running Extended Form Engine Verification Tests ---')

let passed = 0
let failed = 0

function assert(condition, testName) {
  if (condition) {
    console.log(`✓ PASS: ${testName}`)
    passed++
  } else {
    console.error(`✗ FAIL: ${testName}`)
    failed++
  }
}

const today = getTodayString()

// Test 1: Today's date is NOT in the future (Must PASS)
const testDataToday = {
  contractor_mobilised_date: today,
  solar_foundation_start_date: today,
  solar_foundation_end_date: today,
  earthing_works: 'No',
  ess_installed: 'No',
  panel_capacity: 575,
  number_of_solar_panels: 10,
  photos: {}
}
const todayErrors = validateForm(schema, testDataToday)
assert(
  !todayErrors.some(e => e.rule === 'not_future'),
  "Today's date is accepted and not marked as future"
)

// Test 2: Future contractor mobilised date triggers validation error
const futureDate = '2099-01-01'
const testDataFuture = {
  ...testDataToday,
  contractor_mobilised_date: futureDate
}
const futureErrors = validateForm(schema, testDataFuture)
assert(
  futureErrors.some(e => e.fieldId === 'contractor_mobilised_date' && e.rule === 'not_future'),
  'Future contractor mobilised date triggers validation error'
)

// Test 3: Solar Foundation start earlier than Contractor Mobilised is rejected
const testDataOrder1 = {
  contractor_mobilised_date: '2026-10-05',
  solar_foundation_start_date: '2026-10-04',
  solar_foundation_end_date: '2026-10-06',
  earthing_works: 'No',
  ess_installed: 'No',
  panel_capacity: 575,
  number_of_solar_panels: 10,
  photos: {}
}
const order1Errors = validateForm(schema, testDataOrder1)
assert(
  order1Errors.some(e => e.fieldId === 'solar_foundation_start_date' && e.rule === 'not_before_field'),
  'Solar Foundation start earlier than Contractor Mobilised triggers validation error'
)

// Test 4: Solar Foundation end earlier than start date is rejected
const testDataOrder2 = {
  contractor_mobilised_date: '2026-10-01',
  solar_foundation_start_date: '2026-10-05',
  solar_foundation_end_date: '2026-10-04',
  earthing_works: 'No',
  ess_installed: 'No',
  panel_capacity: 575,
  number_of_solar_panels: 10,
  photos: {}
}
const order2Errors = validateForm(schema, testDataOrder2)
assert(
  order2Errors.some(e => e.fieldId === 'solar_foundation_end_date' && e.rule === 'not_before_field'),
  'Solar Foundation end earlier than start triggers validation error'
)

// Test 5: Computed Solar PV Capacity: (Panel Capacity * Number of Panels) / 1000
const computedField = schema.sections[1].fields.find(f => f.id === 'solar_pv_capacity')
const computedVal1 = evaluateComputedField(computedField, { panel_capacity: 575, number_of_solar_panels: 10 })
assert(computedVal1 === '5.75', `Computed PV Capacity (575 * 10 / 1000 = 5.75), got: ${computedVal1}`)

const computedVal2 = evaluateComputedField(computedField, { panel_capacity: 600, number_of_solar_panels: 24 })
assert(computedVal2 === '14.40', `Computed PV Capacity (600 * 24 / 1000 = 14.40), got: ${computedVal2}`)

// Test 6: Photo Slots when Earthing Works is 'No'
const slotsNoEarthing = getRequiredPhotoSlots(schema, { earthing_works: 'No' })
assert(slotsNoEarthing.length === 6, `Slots count when Earthing is No should be 6, got: ${slotsNoEarthing.length}`)
assert(!slotsNoEarthing.some(s => s.id.startsWith('photo_ep')), 'No EP slots when Earthing Works is No')

// Test 7: Photo Slots when Earthing Works is 'Yes' and Earthing Nos is 3
const slotsEarthing3 = getRequiredPhotoSlots(schema, { earthing_works: 'Yes', earthing_nos: 3 })
assert(slotsEarthing3.length === 9, `Slots count when Earthing is Yes and nos=3 should be 9, got: ${slotsEarthing3.length}`)
assert(
  slotsEarthing3.filter(s => s.id.startsWith('photo_ep')).length === 3,
  'Exactly 3 EP slots (EP1, EP2, EP3) present'
)

// Test 8: Repeater ESS Units validation
const essIncompleteData = {
  contractor_mobilised_date: '2026-10-01',
  solar_foundation_start_date: '2026-10-02',
  solar_foundation_end_date: '2026-10-03',
  earthing_works: 'No',
  ess_installed: 'Yes',
  no_of_ess_installed: 2,
  ess_units: [
    { make: 'Huawei', serial_no: 'SN-001' },
    { make: '', serial_no: '' } // Unit #2 is missing!
  ],
  panel_capacity: 575,
  number_of_solar_panels: 10,
  photos: {
    photo_excavation: { captured: true },
    photo_steel_binding: { captured: true },
    photo_raft_column: { captured: true },
    photo_bolts_pedestal: { captured: true },
    photo_struct_front: { captured: true },
    photo_struct_side: { captured: true }
  }
}
const essErrors = validateForm(schema, essIncompleteData)
assert(
  essErrors.some(e => e.fieldId === 'ess_units_1_make'),
  'Incomplete ESS Unit #2 make triggers validation error'
)
assert(
  essErrors.some(e => e.fieldId === 'ess_units_1_serial_no'),
  'Incomplete ESS Unit #2 serial_no triggers validation error'
)

// Test 9: Photo slot completeness requirement
const incompletePhotosData = {
  contractor_mobilised_date: '2026-10-01',
  solar_foundation_start_date: '2026-10-02',
  solar_foundation_end_date: '2026-10-03',
  earthing_works: 'No',
  ess_installed: 'No',
  panel_capacity: 575,
  number_of_solar_panels: 12,
  photos: {
    photo_excavation: { captured: true },
    photo_steel_binding: { captured: true },
    photo_raft_column: { captured: true },
    photo_bolts_pedestal: { captured: true },
    photo_struct_front: { captured: true }
    // photo_struct_side is missing!
  }
}
const missingPhotoErrors = validateForm(schema, incompletePhotosData)
assert(
  missingPhotoErrors.some(e => e.fieldId === 'photo_struct_side' && e.rule === 'photo_required'),
  'Missing photo slot triggers completion block'
)

// Test 10: Fully satisfied form has 0 errors
incompletePhotosData.photos.photo_struct_side = { captured: true }
const zeroErrors = validateForm(schema, incompletePhotosData)
assert(zeroErrors.length === 0, `Fully valid form has 0 errors, got: ${zeroErrors.length}`)

// Test 11: Remote Schema Mutation Test (Simulating live interview change request)
// Suppose interviewer asks to add a 4th earthing option: 4
const mutatedSchema = JSON.parse(JSON.stringify(schema))
const earthingNosField = mutatedSchema.sections[0].fields.find(f => f.id === 'earthing_nos')
earthingNosField.options.push(4)

const slotsWith4Earthing = getRequiredPhotoSlots(mutatedSchema, { earthing_works: 'Yes', earthing_nos: 4 })
assert(
  slotsWith4Earthing.length === 10,
  `Schema mutation dynamically produced 10 photo slots (6 foundation/structure + 4 earthing EP1..EP4), got: ${slotsWith4Earthing.length}`
)
assert(
  slotsWith4Earthing.some(s => s.id === 'photo_ep_4'),
  'Dynamic slot photo_ep_4 generated without code modification'
)

console.log(`\nResults: ${passed} passed, ${failed} failed.`)
if (failed > 0) process.exit(1)
