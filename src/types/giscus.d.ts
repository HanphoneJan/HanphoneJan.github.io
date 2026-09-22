import type { ThemeConfig as BaseThemeConfig } from '@docusaurus/theme-common';

declare module '@docusaurus/theme-common' {
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
