#!/usr/bin/env node
/**
 * 批量为 GitHub Stars 仓库生成标签
 * 基于编程语言、topics 和描述关键词自动分类
 */

const fs = require('fs');
const path = require('path');

const STARS_FILE = path.join(__dirname, '..', 'data', 'github-stars.json');
const TAGS_FILE = path.join(__dirname, '..', 'data', 'star-tags.json');

// 标签规则定义
const TAG_RULES = [
  // 前端相关
  {
    tags: ['前端框架'],
    keywords: ['react', 'vue', 'angular', 'svelte', 'solidjs', 'preact', 'frontend framework'],
    languages: ['JavaScript', 'TypeScript'],
  },
  {
    tags: ['前端工具'],
    keywords: ['bundler', 'webpack', 'vite', 'rollup', 'esbuild', 'parcel', 'build tool', 'css', 'sass', 'less', 'postcss', 'tailwind'],
    languages: ['JavaScript', 'TypeScript'],
  },
  {
    tags: ['UI组件库'],
    keywords: ['component', 'ui library', 'design system', 'antd', 'material-ui', 'chakra', 'shadcn'],
    languages: ['JavaScript', 'TypeScript'],
  },

  // 后端相关
  {
    tags: ['后端框架'],
    keywords: ['django', 'flask', 'fastapi', 'spring', 'express', 'koa', 'nestjs', 'gin', 'beego', 'echo', 'backend framework', 'web framework'],
  },
  {
    tags: ['API工具'],
    keywords: ['api', 'graphql', 'rest', 'swagger', 'openapi', 'postman'],
  },

  // AI/ML
  {
    tags: ['AI/ML'],
    keywords: ['machine learning', 'deep learning', 'neural network', 'pytorch', 'tensorflow', 'sklearn', 'scikit-learn', 'ml', 'ai ', 'artificial intelligence', '计算机视觉', '自然语言处理', 'nlp', 'cv'],
    languages: ['Python'],
  },
  {
    tags: ['LLM'],
    keywords: ['llm', 'large language model', 'gpt', 'claude', 'openai', 'langchain', 'llama', 'transformer', 'bert', 'embedding', 'rag', 'fine-tune', '微调'],
    languages: ['Python', 'TypeScript', 'JavaScript'],
  },
  {
    tags: ['AI工具'],
    keywords: ['copilot', 'cursor', 'windsurf', 'ai coding', 'code assistant', 'claude code', 'codex', 'ai agent'],
  },

  // DevOps
  {
    tags: ['DevOps'],
    keywords: ['docker', 'kubernetes', 'k8s', 'terraform', 'ansible', 'jenkins', 'github actions', 'ci/cd', 'deployment', 'infrastructure'],
  },
  {
    tags: ['监控运维'],
    keywords: ['monitoring', 'prometheus', 'grafana', 'observability', 'logging', 'tracing'],
  },

  // 数据库
  {
    tags: ['数据库'],
    keywords: ['database', 'sql', 'nosql', 'redis', 'mongodb', 'postgres', 'mysql', 'sqlite', 'clickhouse', 'elasticsearch', 'vector database', '向量数据库'],
  },
  {
    tags: ['ORM'],
    keywords: ['orm', 'prisma', 'typeorm', 'sqlalchemy', 'gorm', 'hibernate'],
  },

  // 编程语言相关
  {
    tags: ['Rust工具'],
    keywords: ['rust', 'cargo', 'tokio', 'actix', 'axum'],
    languages: ['Rust'],
  },
  {
    tags: ['Go工具'],
    keywords: ['golang', 'go module', 'gin', 'echo'],
    languages: ['Go'],
  },
  {
    tags: ['Python工具'],
    keywords: ['python', 'pip', 'poetry', 'pydantic'],
    languages: ['Python'],
  },

  // 工具类
  {
    tags: ['CLI工具'],
    keywords: ['cli', 'command line', 'terminal', 'shell', 'bash', 'zsh', 'fzf', 'ripgrep', 'fd', 'exa', 'bat'],
  },
  {
    tags: ['编辑器'],
    keywords: ['editor', 'vim', 'neovim', 'vscode', 'emacs', 'sublime'],
  },
  {
    tags: ['Git工具'],
    keywords: ['git', 'version control', 'github', 'gitlab'],
  },
  {
    tags: ['文档工具'],
    keywords: ['documentation', 'wiki', 'markdown', 'notes', 'knowledge', 'obsidian', 'notion'],
  },

  // 学习资源
  {
    tags: ['学习资源'],
    keywords: ['tutorial', 'awesome', 'learning', 'course', 'book', 'cheatsheet', 'roadmap', 'interview', 'algorithm', 'leetcode'],
  },
  {
    tags: ['开源书籍'],
    keywords: ['book', 'pdf', 'ebook', '开源书籍'],
  },

  // 系统/嵌入式
  {
    tags: ['操作系统'],
    keywords: ['os', 'operating system', 'linux', 'kernel', 'rtos'],
  },
  {
    tags: ['嵌入式'],
    keywords: ['embedded', 'stm32', 'arduino', 'esp32', 'raspberry pi', 'iot'],
  },

  // 安全
  {
    tags: ['安全工具'],
    keywords: ['security', 'pentest', 'vulnerability', 'ctf', 'hack', 'reverse'],
  },

  // 其他
  {
    tags: ['算法'],
    keywords: ['algorithm', 'data structure', 'sorting', 'searching'],
  },
  {
    tags: ['测试工具'],
    keywords: ['testing', 'test framework', 'jest', 'pytest', 'cypress', 'playwright'],
  },
  {
    tags: ['静态分析'],
    keywords: ['lint', 'formatter', 'prettier', 'eslint', 'static analysis', 'code quality'],
  },
];

// 优先级排序（高优先级标签优先）
const TAG_PRIORITY = [
  'LLM', 'AI/ML', 'AI工具',
  '前端框架', 'UI组件库', '前端工具',
  '后端框架', 'API工具',
  '数据库', 'ORM',
  'DevOps', '监控运维',
  'Rust工具', 'Go工具', 'Python工具',
  'CLI工具', '编辑器', 'Git工具',
  '学习资源', '开源书籍',
  '文档工具', '安全工具', '算法',
  '操作系统', '嵌入式',
  '测试工具', '静态分析',
];

// 读取 JSON
function readJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.error(`Error reading ${filePath}:`, e.message);
    return null;
  }
}

// 写入 JSON
function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

// 根据规则为仓库打标签
function generateTags(repo) {
  const tags = new Set();
  const text = `${repo.name} ${repo.description || ''} ${repo.topics?.join(' ') || ''}`.toLowerCase();
  const language = repo.language || '';

  for (const rule of TAG_RULES) {
    let matched = false;

    // 检查关键词匹配
    if (rule.keywords) {
      for (const keyword of rule.keywords) {
        if (text.includes(keyword.toLowerCase())) {
          matched = true;
          break;
        }
      }
    }

    // 检查语言匹配（如果有指定）
    if (matched && rule.languages) {
      if (!rule.languages.includes(language)) {
        matched = false;
      }
    }

    if (matched) {
      rule.tags.forEach(tag => tags.add(tag));
    }
  }

  // 按优先级排序
  const sortedTags = Array.from(tags).sort((a, b) => {
    const indexA = TAG_PRIORITY.indexOf(a);
    const indexB = TAG_PRIORITY.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  // 限制最多3个标签
  return sortedTags.slice(0, 3);
}

// 主函数
async function main() {
  console.log('🏷️ 批量生成 Stars 标签\n');

  // 读取数据
  const starsData = readJson(STARS_FILE);
  const tagsConfig = readJson(TAGS_FILE) || { version: 1, lastUpdated: '', tags: {}, pinned: [] };

  if (!starsData || !starsData.repositories) {
    console.error('❌ 无法读取 github-stars.json');
    process.exit(1);
  }

  const repos = starsData.repositories;
  console.log(`📦 共 ${repos.length} 个仓库\n`);

  let taggedCount = 0;
  let updatedCount = 0;

  // 为每个仓库生成标签
  for (const repo of repos) {
    const existingTags = tagsConfig.tags[repo.id] || [];
    const newTags = generateTags(repo);

    // 合并现有标签和新标签，去重
    const mergedTags = [...new Set([...existingTags, ...newTags])];

    if (newTags.length > 0) {
      if (existingTags.length === 0) {
        taggedCount++;
        console.log(`✨ [新增] ${repo.owner}/${repo.name}: ${newTags.join(', ')}`);
      } else if (newTags.length > 0) {
        updatedCount++;
        const addedTags = newTags.filter(t => !existingTags.includes(t));
        if (addedTags.length > 0) {
          console.log(`📝 [更新] ${repo.owner}/${repo.name}: +${addedTags.join(', ')}`);
        }
      }

      tagsConfig.tags[repo.id] = mergedTags;
    } else if (existingTags.length === 0) {
      // 没有匹配到任何标签，给一个默认标签
      const defaultTags = repo.language ? [repo.language] : ['其他'];
      tagsConfig.tags[repo.id] = defaultTags;
      taggedCount++;
      console.log(`🏷️  [默认] ${repo.owner}/${repo.name}: ${defaultTags.join(', ')}`);
    }
  }

  // 保存结果
  tagsConfig.lastUpdated = new Date().toISOString();
  writeJson(TAGS_FILE, tagsConfig);

  console.log(`\n✅ 完成！`);
  console.log(`   新标签: ${taggedCount} 个仓库`);
  console.log(`   更新: ${updatedCount} 个仓库`);

  // 统计标签分布
  const tagStats = {};
  for (const tags of Object.values(tagsConfig.tags)) {
    for (const tag of tags) {
      tagStats[tag] = (tagStats[tag] || 0) + 1;
    }
  }

  const sortedTags = Object.entries(tagStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  console.log(`\n📊 标签分布 (Top 15):`);
  for (const [tag, count] of sortedTags) {
    console.log(`   ${tag}: ${count}`);
  }

  console.log(`\n💾 已保存到 ${TAGS_FILE}`);
}

main().catch(console.error);
