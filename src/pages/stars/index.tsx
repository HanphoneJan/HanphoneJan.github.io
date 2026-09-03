import React, { useState, useMemo, useEffect } from 'react';
import Layout from '@theme/Layout';
import styles from './styles.module.css';

// 类型定义
interface Repository {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  description: string;
  url: string;
  stars: number;
  language: string | null;
  topics: string[];
  updatedAt: string;
}

interface TagConfig {
  version: number;
  lastUpdated: string;
  tags: Record<string, string[]>;
  pinned: number[];
}

interface StarsData {
  lastUpdated: string;
  count: number;
  repositories: Repository[];
}

type ViewMode = 'list' | 'card';

type SortMode = 'default' | 'stars-desc' | 'stars-asc' | 'name' | 'updated';

// ===== 图标组件 =====
const IconStar = ({ className }: { className?: string }) => (
  <svg className={className || styles.icon} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
);

const IconSearch = () => (
  <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.3-4.3"/>
  </svg>
);

const IconTag = () => (
  <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/>
    <circle cx="7" cy="7" r="1"/>
  </svg>
);

const IconFolder = () => (
  <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
  </svg>
);

const IconBook = () => (
  <svg className={styles.iconSmall} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
  </svg>
);

const IconExternal = () => (
  <svg className={styles.iconSmall} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15,3 21,3 21,9"/>
    <line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);

const IconPin = () => (
  <svg className={styles.iconSmall} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="17" x2="12" y2="22"/>
    <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>
  </svg>
);

const IconCalendar = () => (
  <svg className={styles.iconTiny} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
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

const IconSparkles = () => (
  <svg className={styles.iconDecorative} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    <path d="M5 3v4"/>
    <path d="M19 17v4"/>
    <path d="M3 5h4"/>
    <path d="M17 19h4"/>
  </svg>
);

const IconGitFork = () => (
  <svg className={styles.iconTiny} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="18" r="3"/>
    <circle cx="6" cy="6" r="3"/>
    <circle cx="18" cy="6" r="3"/>
    <path d="M6 9v3a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V9"/>
    <path d="M12 15V9"/>
  </svg>
);

// 格式化数字
function formatNumber(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
}

// 格式化日期
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays}天前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}月前`;
  return `${Math.floor(diffDays / 365)}年前`;
}

// 格式化完整日期
function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

// 语言颜色映射
const languageColors: Record<string, string> = {
  JavaScript: '#f1e05a',
  TypeScript: '#2b7489',
  Python: '#3572A5',
  Java: '#b07219',
  Go: '#00ADD8',
  Rust: '#dea584',
  'C++': '#f34b7d',
  C: '#555555',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Vue: '#41b883',
  Shell: '#89e051',
  Swift: '#ffac45',
  Kotlin: '#A97BFF',
  Ruby: '#701516',
  PHP: '#4F5D95',
};

// 语言图标
const LanguageIcon = ({ language }: { language: string | null }) => {
  if (!language) return null;
  const colors: Record<string, string> = {
    JavaScript: '#f1e05a',
    TypeScript: '#3178c6',
    Python: '#3776ab',
    Java: '#b07219',
    Go: '#00ADD8',
    Rust: '#dea584',
    'C++': '#f34b7d',
    C: '#555555',
    HTML: '#e34c26',
    CSS: '#563d7c',
    Vue: '#41b883',
    Shell: '#89e051',
  };
  return (
    <span
      className={styles.languageIcon}
      style={{ backgroundColor: colors[language] || '#888' }}
      title={language}
    />
  );
};

// 列表视图行组件
interface RepoListItemProps {
  repo: Repository;
  tags: string[];
  isPinned: boolean;
  key?: number;
}

function RepoListItem({ repo, tags, isPinned }: RepoListItemProps) {
  const readmeUrl = `${repo.url}/blob/main/README.md`;

  return (
    <article className={`${styles.listItem} ${isPinned ? styles.pinned : ''}`}>
      <div className={styles.listItemContent}>
        <div className={styles.listItemHeader}>
          <div className={styles.listItemTitle}>
            {isPinned && (
              <span className={styles.pinBadge} title="置顶">
                <IconPin />
              </span>
            )}
            <a
              href={repo.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.listItemName}
            >
              {repo.owner}/<span className={styles.nameHighlight}>{repo.name}</span>
              <IconExternal />
            </a>
          </div>
          <div className={styles.listItemMeta}>
            {repo.language && (
              <span className={styles.metaItem}>
                <LanguageIcon language={repo.language} />
                {repo.language}
              </span>
            )}
            <span className={`${styles.metaItem} ${styles.stars}`}>
              <IconStar className={styles.starIcon} />
              {formatNumber(repo.stars)}
            </span>
            <span className={styles.metaItem}>
              <IconCalendar />
              {formatDate(repo.updatedAt)}
            </span>
          </div>
        </div>

        <p className={styles.listItemDesc}>{repo.description || '暂无描述'}</p>

        {tags.length > 0 && (
          <div className={styles.listItemTags}>
            {tags.map(tag => (
              <span key={tag} className={styles.tag}>{tag}</span>
            ))}
          </div>
        )}
      </div>

      <a
        href={readmeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.listItemReadme}
        title="查看 README"
      >
        <IconBook />
        <span>文档</span>
      </a>
    </article>
  );
}

// 卡片视图组件
interface RepoCardProps {
  repo: Repository;
  tags: string[];
  isPinned: boolean;
  key?: number;
}

function RepoCard({ repo, tags, isPinned }: RepoCardProps) {
  const readmeUrl = `${repo.url}/blob/main/README.md`;

  return (
    <article className={`${styles.card} ${isPinned ? styles.pinned : ''}`}>
      {isPinned && (
        <div className={styles.cardPinIndicator} title="置顶仓库">
          <IconPin />
        </div>
      )}

      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>
          <a href={repo.url} target="_blank" rel="noopener noreferrer" className={styles.cardName}>
            <span className={styles.owner}>{repo.owner}</span>
            <span className={styles.separator}>/</span>
            <span className={styles.name}>{repo.name}</span>
            <IconExternal />
          </a>
        </div>
      </div>

      <p className={styles.cardDesc}>{repo.description || '暂无描述'}</p>

      <div className={styles.cardMeta}>
        {repo.language && (
          <span className={styles.metaItem}>
            <LanguageIcon language={repo.language} />
            {repo.language}
          </span>
        )}
        <span className={`${styles.metaItem} ${styles.stars}`}>
          <IconStar className={styles.starIcon} />
          {formatNumber(repo.stars)}
        </span>
        <span className={styles.metaItem}>
          <IconCalendar />
          {formatDate(repo.updatedAt)}
        </span>
      </div>

      {tags.length > 0 && (
        <div className={styles.cardTags}>
          {tags.slice(0, 4).map(tag => (
            <span key={tag} className={styles.tag}>{tag}</span>
          ))}
          {tags.length > 4 && (
            <span className={styles.tagMore}>+{tags.length - 4}</span>
          )}
        </div>
      )}

      <a
        href={readmeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.cardReadme}
      >
        <IconBook />
        <span>查看文档</span>
      </a>
    </article>
  );
}

export default function StarsPage(): React.ReactElement {
  // 加载数据
  const starsData: StarsData = useMemo(() => {
    try {
      return require('@site/data/github-stars.json');
    } catch {
      return { lastUpdated: '', count: 0, repositories: [] };
    }
  }, []);

  const tagConfig: TagConfig = useMemo(() => {
    try {
      return require('@site/data/star-tags.json');
    } catch {
      return { version: 1, lastUpdated: '', tags: {}, pinned: [] };
    }
  }, []);

  // 视图模式（从 localStorage 读取）
  const [viewMode, setViewMode] = useState<ViewMode>('card');

  useEffect(() => {
    const saved = localStorage.getItem('stars-view-mode') as ViewMode;
    if (saved && (saved === 'list' || saved === 'card')) {
      setViewMode(saved);
    }
  }, []);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('stars-view-mode', mode);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>('default');

  // 提取所有标签
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    Object.values(tagConfig.tags).forEach((tags: string[]) => {
      tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [tagConfig]);

  // 筛选仓库
  const filteredRepos = useMemo(() => {
    let result = starsData.repositories.filter(repo => {
      // 搜索过滤
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const tags = tagConfig.tags[repo.id] || [];
        const matchSearch =
          repo.name.toLowerCase().includes(query) ||
          repo.description.toLowerCase().includes(query) ||
          tags.some((tag: string) => tag.toLowerCase().includes(query));
        if (!matchSearch) return false;
      }

      // 标签过滤
      if (selectedTags.length > 0) {
        const repoTags = tagConfig.tags[repo.id] || [];
        const hasSelectedTag = selectedTags.some(tag => repoTags.includes(tag));
        if (!hasSelectedTag) return false;
      }

      return true;
    });

    // 应用排序
    switch (sortMode) {
      case 'stars-desc':
        result = [...result].sort((a, b) => b.stars - a.stars);
        break;
      case 'stars-asc':
        result = [...result].sort((a, b) => a.stars - b.stars);
        break;
      case 'name':
        result = [...result].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'updated':
        result = [...result].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
      default:
        // 默认保持原始顺序
        break;
    }

    return result;
  }, [starsData, tagConfig, searchQuery, selectedTags, sortMode]);

  // 分离置顶和普通仓库
  const pinnedRepos = filteredRepos.filter(repo => tagConfig.pinned.includes(repo.id));
  const normalRepos = filteredRepos.filter(repo => !tagConfig.pinned.includes(repo.id));

  // 切换标签选择
  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  // 清除筛选
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
  };

  return (
    <Layout
      title="GitHub Stars"
      description="我的 GitHub Stars 收藏夹"
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
            <IconSparkles />
          </div>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>
              GitHub Stars
            </h1>
            <div className={styles.headerMeta}>
              <p className={styles.subtitle}>
                精心收藏的开源项目
              </p>
              {starsData.lastUpdated && (
                <span className={styles.headerStats}>
                  更新于 {formatFullDate(starsData.lastUpdated)}
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
                placeholder="搜索仓库名称、描述、标签..."
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
                <option value="updated">最近更新</option>
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

        {/* 标签筛选 */}
        <div className={styles.filterSection}>
          <div className={styles.filterHeader}>
            <IconTag />
            <span>标签筛选</span>
          </div>
          <div className={styles.filterTags}>
            <button
              onClick={() => setSelectedTags([])}
              className={`${styles.filterTag} ${selectedTags.length === 0 ? styles.active : ''}`}
            >
              全部
            </button>
            {allTags.map((tag: string) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`${styles.filterTag} ${selectedTags.includes(tag) ? styles.active : ''}`}
              >
                {tag}
              </button>
            ))}
          </div>
          {(selectedTags.length > 0 || searchQuery) && (
            <button onClick={clearFilters} className={styles.clearFilters}>
              清除筛选
            </button>
          )}
        </div>

        {/* 置顶仓库 */}
        {pinnedRepos.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}><IconPin /></span>
              置顶仓库
              <span className={styles.count}>{pinnedRepos.length}</span>
            </h2>
            <div className={viewMode === 'list' ? styles.listContainer : styles.cardContainer}>
              {pinnedRepos.map(repo => (
                viewMode === 'list' ? (
                  <RepoListItem
                    key={repo.id}
                    repo={repo}
                    tags={tagConfig.tags[repo.id] || []}
                    isPinned={true}
                  />
                ) : (
                  <RepoCard
                    key={repo.id}
                    repo={repo}
                    tags={tagConfig.tags[repo.id] || []}
                    isPinned={true}
                  />
                )
              ))}
            </div>
          </section>
        )}

        {/* 普通仓库 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}><IconFolder /></span>
            全部仓库
            <span className={styles.count}>{normalRepos.length}</span>
          </h2>
          {normalRepos.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}><IconFolder /></div>
              <p>没有找到匹配的仓库</p>
              {(selectedTags.length > 0 || searchQuery) && (
                <button onClick={clearFilters} className={styles.clearBtn}>
                  清除筛选条件
                </button>
              )}
            </div>
          ) : (
            <div className={viewMode === 'list' ? styles.listContainer : styles.cardContainer}>
              {normalRepos.map(repo => (
                viewMode === 'list' ? (
                  <RepoListItem
                    key={repo.id}
                    repo={repo}
                    tags={tagConfig.tags[repo.id] || []}
                    isPinned={false}
                  />
                ) : (
                  <RepoCard
                    key={repo.id}
                    repo={repo}
                    tags={tagConfig.tags[repo.id] || []}
                    isPinned={false}
                  />
                )
              ))}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
