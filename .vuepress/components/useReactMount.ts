import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

/**
 * 「懒加载一个 React 组件，并在挂载后把它接到这个 DOM 节点上」。
 *
 * 放在组合式函数里，其余壳子组件各自只需要三行。
 * 动态 import 保证 React 组件（以及它们的代码块、播放器、题库逻辑）
 * 落成独立 chunk —— 普通笔记页一个字节都不用下载。
 */
export function useReactMount(
  loader: () => Promise<{ default: unknown }>,
  props: () => Record<string, unknown>,
): Ref<HTMLElement | null> {
  const host = ref<HTMLElement | null>(null)
  let dispose: (() => void) | undefined

  onMounted(async () => {
    const [{ mountReact }, mod] = await Promise.all([
      import('../../src/vuepress/react-mount'),
      loader(),
    ])
    if (!host.value) return
    dispose = mountReact(
      host.value,
      mod.default as Parameters<typeof mountReact>[1],
      props(),
    )
  })

  onBeforeUnmount(() => dispose?.())

  return host
}
