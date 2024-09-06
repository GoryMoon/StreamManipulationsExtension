
Save New Duplicate & Edit Just Text Twitter
<template>
  <div class="progress" :style="style"></div>
</template>

<script setup lang="ts">
import { useLoadingStore } from '@/stores/loading';
import { computed, type StyleValue } from 'vue';

const loadingStore = useLoadingStore()

const style = computed(() => {
    const style: StyleValue = {
        backgroundColor: loadingStore.success ?  '#20bf6b': '#20bf6b',
        opacity: loadingStore.visible ? 1: 0,
        width: loadingStore.percent + '%',
        transition: (loadingStore.visible ? 'width 0.2s, ': '') + ' opacity 0.6s'
    }
    return style
})

</script>

<style scoped>
.progress {
    top: 0;
    left: 0;
    height: 2px;
    opacity: 1;
    z-index: 999999;
}

.progress-bar {
    background-color: #20bf6b;
    height: 100%;
    box-shadow: 0 2px 5px 0 #222;
}

.progress-bar.done {
    background-color: #2d98da;
}

.progress-done-leave-active {
    transition: all 1s ease;
}

.progress-done-leave-to {
    transform: translateY(-5px);
    opacity: 0;
}
</style>