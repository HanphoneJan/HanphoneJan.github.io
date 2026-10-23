<template>
  <div ref="host" class="react-mount" data-vis="none"></div>
</template>

<script setup lang="ts">
import { useReactMount } from './useReactMount'

const host = useReactMount(
  () => import('../../src/components/training/visualizer/NoVisStepsNote.tsx'),
  () => ({}),
)
</script>
