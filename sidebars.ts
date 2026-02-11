import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    {
      type: 'category',
      label: '快速开始',
      collapsed: false,
      link: {
        type: 'generated-index',
        title: '快速开始',
        description: '5分钟内了解如何使用本项目',
      },
      items: ['intro', 'getting-started'],
    },
    {
      type: 'category',
      label: '核心功能',
      items: ['feature1', 'feature2'],
    },
    {
      type: 'category',
      label: '开发指南',
      items: ['guide1', 'guide2'],
    },
  ],
};

export default sidebars;
