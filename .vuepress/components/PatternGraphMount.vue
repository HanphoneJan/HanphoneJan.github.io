<template>
  <div ref="host" class="react-mount"></div>
</template>

<script setup lang="ts">
import { useReactMount } from './useReactMount'

const props = defineProps<{ docId: string }>()

const host = useReactMount(
  () => import('../../src/components/training/pattern-graph/index.tsx'),
  () => ({ docId: props.docId }),
)
</script>
