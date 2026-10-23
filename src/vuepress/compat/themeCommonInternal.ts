/** `@docusaurus/theme-common/internal` 的替身（SnippetBar 不经过这个接缝） */
export function useCodeBlockContext(): {
  metadata: { code: string; language: string; className?: string; title?: string }
} {
  return { metadata: { code: '', language: '' } }
}

export function useDocsVersion(): { version: string } {
  return { version: 'current' }
}
