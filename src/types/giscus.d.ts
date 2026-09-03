import type { ThemeConfig as BaseThemeConfig } from '@docusaurus/preset-classic';

declare module '@docusaurus/preset-classic' {
  interface ThemeConfig extends BaseThemeConfig {
    giscus?: {
      repo: string;
      repoId: string;
      category: string;
      categoryId: string;
      blogCategory?: string;
      blogCategoryId?: string;
    };
  }
}
