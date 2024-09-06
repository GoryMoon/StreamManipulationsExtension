<template>
    <span :class="['bits', bitColor]">
        <img :src="bitImage" :alt="bits + 'bits'" width="40" height="40" /> {{ bits }} bits
    </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import gray from '@/assets/1.gif'
import purple from '@/assets/100.gif'
import green from '@/assets/1000.gif'
import blue from '@/assets/5000.gif'
import red from '@/assets/10000.gif'

const props = defineProps<{
    bits: number
}>()

const bitImage = computed(() =>
    props.bits < 100
        ? gray
        : props.bits < 1000
          ? purple
          : props.bits < 5000
            ? green
            : props.bits < 10000
              ? blue
              : red,
)

const bitColor = computed(() =>
    props.bits < 100
        ? 'bits-10'
        : props.bits < 1000
          ? 'bits-100'
          : props.bits < 5000
            ? 'bits-1000'
            : props.bits < 10000
              ? 'bits-5000'
              : 'bits-10000',
)
</script>

<style lang="css" scoped>
.bits {
    font-size: 25px;
}

.bits-10 {
    color: #979797;
}

.bits-100 {
    color: #9c3ee8;
}

.bits-1000 {
    color: #1db2a5;
}

.bits-5000 {
    color: #0099fe;
}

.bits-10000 {
    color: #f43021;
}
</style>
