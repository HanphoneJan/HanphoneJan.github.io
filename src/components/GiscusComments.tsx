import React from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import Giscus from '@giscus/react';
import { useColorMode } from '@docusaurus/theme-common';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

interface GiscusCommentsProps {
    category?: string;
    categoryId?: string;
}

export default function GiscusComments({ category, categoryId }: GiscusCommentsProps): JSX.Element | null {
    const { siteConfig } = useDocusaurusContext();
    const { colorMode } = useColorMode();
    const giscusConfig = (siteConfig.themeConfig as any).giscus;

    if (!giscusConfig?.repo || !giscusConfig?.repoId || !giscusConfig?.categoryId) {
        return null; // 未配置则不渲染
    }

    const theme = colorMode === 'dark' ? 'dark_dimmed' : 'light';

    // 使用传入的分类配置，或回退到默认配置
    const finalCategory = category ?? giscusConfig.category;
    const finalCategoryId = categoryId ?? giscusConfig.categoryId;

    return (
        <BrowserOnly fallback={<div>加载评论中...</div>}>
            {() => (
                <div key={window.location.pathname}>
                    <Giscus
                        repo={giscusConfig.repo}
                        repoId={giscusConfig.repoId}
                        category={finalCategory}
                        categoryId={finalCategoryId}
                        mapping="pathname"
                        strict="0"
                        reactionsEnabled="1"
                        emitMetadata="0"
                        inputPosition="top"
                        theme={theme}
                        lang="zh-CN"
                        loading="eager"
                    />
                </div>
            )}
        </BrowserOnly>
    );
}
