<template>
  <div ref="host" class="react-wide react-projects"></div>
</template>

<script setup lang="ts">
import { useReactMount } from './useReactMount'

const host = useReactMount(
  () => import('../../src/pages/projects/index.tsx'),
  () => ({}),
)
</script>
