<template>
  <div ref="host" class="react-mount"></div>
</template>

<script setup lang="ts">
import { useReactMount } from './useReactMount'
import { decodeBase64, decodeJson } from '../../src/vuepress/react-mount'

const props = defineProps<{
  codeB64: string
  samplesB64: string
  stdinB64: string
  entryName: string
}>()

const host = useReactMount(
  () => import('../../src/components/training/pyrunner/SnippetBar.tsx'),
  () => ({
    code: decodeBase64(props.codeB64),
    samples: decodeJson(props.samplesB64) ?? [],
    stdinSamples: decodeJson(props.stdinB64) ?? [],
    entryName: props.entryName || null,
  }),
)
</script>
