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
  /**
   * primary：完整代码块，整条运行条摆出来；
   * inline：其余块，只在代码块右上角留一个 ▶ 图标。
   */
  emphasis?: 'primary' | 'inline'
  judgeId?: string
}>()

const host = useReactMount(
  () => import('../../src/components/training/pyrunner/SnippetBar.tsx'),
  () => ({
    code: decodeBase64(props.codeB64),
    samples: decodeJson(props.samplesB64) ?? [],
    stdinSamples: decodeJson(props.stdinB64) ?? [],
    entryName: props.entryName || null,
    emphasis: props.emphasis === 'inline' ? 'inline' : 'primary',
    judgeId: props.judgeId || null,
  }),
)
</script>
