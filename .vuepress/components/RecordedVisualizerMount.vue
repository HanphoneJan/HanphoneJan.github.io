<template>
  <div ref="host" class="react-mount" data-vis="recorded"></div>
</template>

<script setup lang="ts">
import { useReactMount } from './useReactMount'
import { decodeJson } from '../../src/vuepress/react-mount'

const props = defineProps<{ traceB64: string }>()

const host = useReactMount(
  () => import('../../src/components/training/visualizer/InlineVisualizer.tsx'),
  () => ({ entry: decodeJson(props.traceB64) }),
)
</script>
