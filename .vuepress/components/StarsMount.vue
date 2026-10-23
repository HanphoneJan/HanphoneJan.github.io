<template>
  <div ref="host" class="react-wide react-stars"></div>
</template>

<script setup lang="ts">
import { useReactMount } from './useReactMount'

const host = useReactMount(
  () => import('../../src/pages/stars/index.tsx'),
  () => ({}),
)
</script>
