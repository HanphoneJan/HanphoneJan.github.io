import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import { execSync } from 'child_process';
import matter from 'gray-matter';

const SOURCE_DIR = path.join(process.cwd(), 'code-training', 'machine-learning');
const DEST_DIR = path.join(process.cwd(), 'code-training', 'docs', 'machine-learning');

/**
 * 检查 Quarto 是否安装
 */
function checkQuarto() {
  try {
    execSync('quarto --version', { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 清理不再需要的已同步文件
 */
async function cleanup(trackedFiles: string[]) {
  const normalizedTrackedFiles = trackedFiles.map(f => path.normalize(f).toLowerCase());

  if (!(await fs.pathExists(DEST_DIR))) return;

  const files = await glob('**/*.md', { cwd: DEST_DIR, absolute: true, windowsPathsNoEscape: true });

  for (const file of files) {
    const normalizedFile = path.normalize(file).toLowerCase();
    if (normalizedTrackedFiles.includes(normalizedFile)) continue;

    const content = await fs.readFile(file, 'utf-8');
    const { data } = matter(content);

    // 只删除带有 _synced 标记的文件
    if (data._synced === true) {
      await fs.remove(file);
      console.log(`[Cleanup] Removed: ${path.relative(process.cwd(), file)}`);

      // 尝试清理空父目录
      let parent = path.dirname(file);
      while (parent !== DEST_DIR && parent !== path.dirname(DEST_DIR)) {
        const items = await fs.readdir(parent);
        if (items.length === 0) {
          await fs.remove(parent);
          console.log(`[Cleanup] Removed empty directory: ${path.relative(process.cwd(), parent)}`);
          parent = path.dirname(parent);
        } else {
          break;
        }
      }
    }
  }

  // 清理源目录中 Quarto 自动生成的 .gitignore 文件
  const gitignores = await glob('**/.gitignore', { cwd: SOURCE_DIR, absolute: true, windowsPathsNoEscape: true });
  for (const gitignore of gitignores) {
    // 如果是源根目录的 .gitignore 则保留
    if (path.normalize(gitignore) === path.normalize(path.join(SOURCE_DIR, '.gitignore'))) continue;

    const content = await fs.readFile(gitignore, 'utf-8');
    if (content.includes('/.quarto/')) {
      await fs.remove(gitignore);
      console.log(`[Cleanup] Removed Quarto-generated .gitignore: ${path.relative(process.cwd(), gitignore)}`);
    }
  }
}

async function sync() {
  if (!checkQuarto()) {
    console.error('Error: Quarto is not installed or not in PATH.');
    process.exit(1);
  }

  // 查找所有 .ipynb 文件，忽略 .ipynb_checkpoints
  const ipynbFiles = await glob('**/*.ipynb', {
    cwd: SOURCE_DIR,
    absolute: true,
    windowsPathsNoEscape: true,
    ignore: '**/ .ipynb_checkpoints/**'
  });

  const trackedFiles: string[] = [];

  for (const file of ipynbFiles) {
    const relPath = path.relative(SOURCE_DIR, file);
    const targetMdPath = path.join(DEST_DIR, relPath.replace(/\.ipynb$/, '.md'));

    // 确保目标目录存在
    await fs.ensureDir(path.dirname(targetMdPath));

    console.log(`[Sync] Converting: ${relPath} ...`);

    try {
      const outputFileName = path.basename(targetMdPath);
      const outputDir = path.dirname(targetMdPath);

      // 使用 Quarto 转换 ipynb 为 markdown
      // 1. cd 到源文件目录执行，以确保相对资源路径正确
      // 2. 使用 --output 和 --output-dir 组合，规避绝对路径可能导致的问题
      execSync(`quarto render "${path.basename(file)}" --to gfm --output "${outputFileName}" --output-dir "${outputDir}"`, {
        stdio: 'inherit',
        cwd: path.dirname(file)
      });

      // 读取生成的文件，添加 frontmatter 标记
      const content = await fs.readFile(targetMdPath, 'utf-8');
      const { data, content: body } = matter(content);

      const cleanData = {
        ...data,
        title: data.title || path.basename(file, '.ipynb'),
        _synced: true
      };

      const output = matter.stringify(body, cleanData);
      await fs.writeFile(targetMdPath, output);

      trackedFiles.push(targetMdPath);
    } catch (error) {
      console.error(`[Error] Failed to convert ${relPath}:`, error);
    }
  }

  await cleanup(trackedFiles);
}

sync().catch(console.error);
