<script setup lang="ts">
import { VueDatePicker } from '@vuepic/vue-datepicker'
import { th } from 'date-fns/locale'
import {
  BUDDHA_YEAR_OFFSET,
  dateToBangkokIso,
  formatThaiBuddhistDateTime,
  isoToDate,
} from '~/utils/datetime'

const model = defineModel<string | null>({ default: null })

const internalDate = computed({
  get: () => isoToDate(model.value),
  set: (value: Date | null) => {
    model.value = dateToBangkokIso(value)
  },
})

const pickerFormats = {
  input: (date: Date) => formatThaiBuddhistDateTime(date),
  preview: (date: Date) => formatThaiBuddhistDateTime(date),
  month: 'LLLL',
}

const actionRow = {
  showSelect: true,
  showCancel: true,
  showNow: true,
  selectBtnLabel: 'ตกลง',
  cancelBtnLabel: 'ล้าง',
  nowBtnLabel: 'วันนี้',
}

const thaiDayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

function buddhistYear(year: number) {
  return year + BUDDHA_YEAR_OFFSET
}
</script>

<template>
  <ClientOnly>
    <VueDatePicker
      v-model="internalDate"
      class="app-datepicker dp--theme-light"
      :locale="th"
      :formats="pickerFormats"
      :day-names="thaiDayNames"
      :time-config="{
        enableTimePicker: true,
        is24: true,
        timePickerInline: true,
      }"
      :action-row="actionRow"
      :dark="false"
      :teleport="true"
      placeholder="เลือกวันและเวลา"
      auto-apply
      :ui="{ input: 'app-datepicker-input' }"
    >
      <template #year="{ value }">
        {{ buddhistYear(value) }}
      </template>
      <template #year-overlay-value="{ value }">
        {{ buddhistYear(value) }}
      </template>
    </VueDatePicker>
    <template #fallback>
      <input
        class="app-input"
        :value="model && isoToDate(model) ? formatThaiBuddhistDateTime(isoToDate(model)!) : ''"
        placeholder="เลือกวันและเวลา"
        readonly
      >
    </template>
  </ClientOnly>
</template>
