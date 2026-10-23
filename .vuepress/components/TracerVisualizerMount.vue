<template>
  <div ref="host" class="react-mount"></div>
</template>

<script setup lang="ts">
import { useReactMount } from './useReactMount'
import { decodeJson } from '../../src/vuepress/react-mount'

const props = defineProps<{ placementsB64: string }>()

const host = useReactMount(
  () => import('../../src/components/training/visualizer/InlineTracerVisualizer.tsx'),
  () => ({ placements: decodeJson(props.placementsB64) ?? [] }),
)
</script>
