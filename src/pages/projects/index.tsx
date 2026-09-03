import React, { useState, useMemo, useEffect } from 'react';
import Layout from '@theme/Layout';
import styles from './styles.module.css';

// 类型定义
interface Project {
  name: string;
  url: string;
  source: string;
  stars?: number;
  description?: string;
}

type SortMode = 'default' | 'stars-desc' | 'stars-asc' | 'name';

interface ProjectsData {
  lastUpdated: string;
  count: number;
  projects: Project[];
}

type ViewMode = 'list' | 'card';

// ===== 图标组件 =====
const IconFolder = () => (
  <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
  </svg>
);

const IconSearch = () => (
  <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.3-4.3"/>
  </svg>
);

const IconExternal = () => (
  <svg className={styles.iconSmall} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15,3 21,3 21,9"/>
    <line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);

const IconGitHub = () => (
  <svg className={styles.iconSmall} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
    <path d="M9 18c-4.51 2-5-2-7-2"/>
  </svg>
);

const IconCode = () => (
  <svg className={styles.iconSmall} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6"/>
    <polyline points="8 6 2 12 8 18"/>
  </svg>
);

const IconListView = () => (
  <svg className={styles.viewIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/>
    <line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/>
    <line x1="3" y1="12" x2="3.01" y2="12"/>
    <line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);

const IconCardView = () => (
  <svg className={styles.viewIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="7" height="7" x="3" y="3" rx="1"/>
    <rect width="7" height="7" x="14" y="3" rx="1"/>
    <rect width="7" height="7" x="14" y="14" rx="1"/>
    <rect width="7" height="7" x="3" y="14" rx="1"/>
  </svg>
);

const IconSort = () => (
  <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 16 4 4 4-4"/>
    <path d="M7 20V4"/>
    <path d="m21 8-4-4-4 4"/>
    <path d="M17 4v16"/>
  </svg>
);

const IconStar = ({ className }: { className?: string }) => (
  <svg className={className || styles.iconTiny} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
);

const IconRocket = () => (
  <svg className={styles.iconDecorative} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
  </svg>
);

const IconPackage = () => (
  <svg className={styles.iconTiny} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m7.5 4.27 9 5.15"/>
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
    <path d="m3.3 7 8.7 5 8.7-5"/>
    <path d="M12 22V12"/>
  </svg>
);

// 格式化日期
function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

// 格式化数字
function formatNumber(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
}

// 从项目名称推断描述
function getProjectDescription(name: string): string {
  const descriptions: Record<string, string> = {
    'admin-file': '文件管理后台系统',
    'AutoBuy': '自动化购买工具',
    'c-code': 'C语言代码仓库',
    'calculator': '计算器应用',
    'code-training': '编程训练平台',
    'crawler': '网络爬虫工具',
    'd2l-code': '动手学深度学习代码',
    'deep-learning-code': '深度学习代码实践',
    'edge-ai-smart-waste-sorting': '边缘AI智能垃圾分类',
    'generate-poems': '诗歌生成器',
    'generate-resume': '简历生成工具',
    'hanphone-blog-server': '个人博客后端服务',
    'hanphone-blog-web': '个人博客前端页面',
    'hanphone-chat': '聊天应用',
    'hanphone-game': '小游戏项目',
    'hanphone-old-blog': '旧版个人博客',
    'hanphone-play': '个人娱乐项目集',
    'hanphone-tool': '实用工具集合',
    'HanphoneJan.github.io': 'GitHub Pages 个人网站',
    'image-retrieval': '图像检索系统',
    'material': '资料文件仓库',
    'notes': '笔记文档',
    'OpenWrtTrafficMonitor': 'OpenWrt 流量监控',
    'photo-wall': '照片墙展示',
    'photo-wall-server': '照片墙后端服务',
    'public-pictures': '公共图片资源',
    'robot-cloud-system': '机器人云控制系统',
    'transformer-practice': 'Transformer 实践',
    'Usagi-DesktopPet': '桌面宠物应用',
    'VoiceTeach': '语音教学工具',
  };
  return descriptions[name] || '个人项目';
}

// 列表视图行组件
interface ProjectListItemProps {
  project: Project;
  index: number;
  key?: string;
}

function ProjectListItem({ project, index }: ProjectListItemProps) {
  const githubUrl = `https://github.com/hanphonejan/${project.name}`;

  return (
    <article className={styles.listItem} style={{ animationDelay: `${index * 0.03}s` }}>
      <div className={styles.listItemContent}>
        <div className={styles.listItemHeader}>
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.listItemName}
          >
            <span className={styles.nameHighlight}>{project.name}</span>
            <IconExternal />
          </a>
          <div className={styles.listItemMeta}>
            {project.stars !== undefined && (
              <span className={`${styles.metaItem} ${styles.stars}`}>
                <IconStar className={styles.starIcon} />
                {formatNumber(project.stars)}
              </span>
            )}
          </div>
        </div>
        <p className={styles.listItemDesc}>
          {project.description || getProjectDescription(project.name)}
        </p>
      </div>

      <a
        href={githubUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.listItemLink}
        title="查看源码"
      >
        <IconCode />
        <span>源码</span>
      </a>
    </article>
  );
}

// 获取项目首字母颜色
const getProjectColor = (name: string): string => {
  const colors = [
    '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
    '#06b6d4', '#f97316', '#ef4444', '#6366f1', '#84cc16'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// 卡片视图组件
interface ProjectCardProps {
  project: Project;
  index: number;
  key?: string;
}

function ProjectCard({ project, index }: ProjectCardProps) {
  const githubUrl = `https://github.com/hanphonejan/${project.name}`;
  const accentColor = getProjectColor(project.name);
  const initial = project.name.charAt(0).toUpperCase();

  return (
    <article
      className={styles.card}
      style={{
        animationDelay: `${index * 0.05}s`,
        '--card-accent': accentColor
      } as React.CSSProperties}
    >
      <div className={styles.cardAccent} style={{ backgroundColor: accentColor }} />

      <div className={styles.cardHeader}>
        <div className={styles.cardAvatar} style={{ backgroundColor: `${accentColor}20`, color: accentColor }}>
          {initial}
        </div>
        <div className={styles.cardTitle}>
          <a href={project.url} target="_blank" rel="noopener noreferrer" className={styles.cardName}>
            {project.name}
            <IconExternal />
          </a>
        </div>
      </div>

      <p className={styles.cardDesc}>
        {project.description || getProjectDescription(project.name)}
      </p>

      <div className={styles.cardMeta}>
        <span className={styles.metaItem}>
          <IconPackage />
          {project.source}
        </span>
        {project.stars !== undefined && (
          <span className={`${styles.metaItem} ${styles.stars}`}>
            <IconStar className={styles.starIcon} />
            {formatNumber(project.stars)}
          </span>
        )}
      </div>

      <a
        href={githubUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.cardSource}
      >
        <IconCode />
        <span>查看源码</span>
      </a>
    </article>
  );
}

export default function ProjectsPage(): React.ReactElement {
  // 加载数据
  const projectsData: ProjectsData = useMemo(() => {
    try {
      return require('@site/data/projects.json');
    } catch {
      return { lastUpdated: '', count: 0, projects: [] };
    }
  }, []);

  // 视图模式（从 localStorage 读取）
  const [viewMode, setViewMode] = useState<ViewMode>('card');

  useEffect(() => {
    const saved = localStorage.getItem('projects-view-mode') as ViewMode;
    if (saved && (saved === 'list' || saved === 'card')) {
      setViewMode(saved);
    }
  }, []);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('projects-view-mode', mode);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('default');

  // 筛选和排序项目
  const filteredProjects = useMemo(() => {
    let result = projectsData.projects.filter(project => {
      if (!searchQuery) return true;

      const query = searchQuery.toLowerCase();
      const description = getProjectDescription(project.name);

      return (
        project.name.toLowerCase().includes(query) ||
        description.toLowerCase().includes(query)
      );
    });

    // 应用排序
    switch (sortMode) {
      case 'stars-desc':
        result = [...result].sort((a, b) => (b.stars || 0) - (a.stars || 0));
        break;
      case 'stars-asc':
        result = [...result].sort((a, b) => (a.stars || 0) - (b.stars || 0));
        break;
      case 'name':
        result = [...result].sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        // 默认保持原始顺序
        break;
    }

    return result;
  }, [projectsData, searchQuery, sortMode]);

  // 清除筛选
  const clearFilters = () => {
    setSearchQuery('');
  };

  return (
    <Layout
      title="项目"
      description="我的 GitHub Projects 项目展示"
    >
      {/* 页面背景装饰 */}
      <div className={styles.pageBackground}>
        <div className={styles.gradientOrb1} />
        <div className={styles.gradientOrb2} />
        <div className={styles.gridPattern} />
      </div>

      <div className={styles.container}>
        {/* 页面头部 */}
        <header className={styles.header}>
          <div className={styles.headerDecorative}>
            <IconRocket />
          </div>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>
              我的项目
            </h1>
            <div className={styles.headerMeta}>
              <p className={styles.subtitle}>
                开源作品与技术实践
              </p>
              {projectsData.lastUpdated && (
                <span className={styles.headerStats}>
                  更新于 {formatFullDate(projectsData.lastUpdated)}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* 工具栏：搜索 + 排序 + 视图切换 */}
        <div className={styles.toolbar}>
          {/* 搜索栏 */}
          <div className={styles.searchWrapper}>
            <div className={styles.searchBox}>
              <IconSearch />
              <input
                type="text"
                placeholder="搜索项目名称、描述..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
              {searchQuery && (
                <button
                  className={styles.clearSearch}
                  onClick={() => setSearchQuery('')}
                  title="清除搜索"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* 控制区：排序 + 视图切换 */}
          <div className={styles.controls}>
            <div className={styles.sortSection}>
              <IconSort />
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className={styles.sortSelect}
              >
                <option value="default">默认排序</option>
                <option value="stars-desc">Stars 最多</option>
                <option value="stars-asc">Stars 最少</option>
                <option value="name">按名称</option>
              </select>
            </div>

            <div className={styles.viewToggle}>
              <button
                onClick={() => handleViewModeChange('list')}
                className={`${styles.viewBtn} ${viewMode === 'list' ? styles.active : ''}`}
                title="列表视图"
              >
                <IconListView />
              </button>
              <button
                onClick={() => handleViewModeChange('card')}
                className={`${styles.viewBtn} ${viewMode === 'card' ? styles.active : ''}`}
                title="卡片视图"
              >
                <IconCardView />
              </button>
            </div>
          </div>
        </div>

        {/* 项目列表 */}
        <section className={styles.section}>
          {filteredProjects.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}><IconFolder /></div>
              <p>没有找到匹配的项目</p>
              {searchQuery && (
                <button onClick={clearFilters} className={styles.clearBtn}>
                  清除搜索条件
                </button>
              )}
            </div>
          ) : (
            <div className={viewMode === 'list' ? styles.listContainer : styles.cardContainer}>
              {viewMode === 'list'
                ? filteredProjects.map((project, index) => (
                    <ProjectListItem key={project.name} project={project} index={index} />
                  ))
                : filteredProjects.map((project, index) => (
                    <ProjectCard key={project.name} project={project} index={index} />
                  ))
              }
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
