import fs from 'fs-extra';
import path from 'path';
import matter from 'gray-matter';
import { glob } from 'glob';

const SOURCE_DIR = 'E:/hanphonejan/hanphone-note';
// 只同步文档。博客站是 hanphone.cn，这个仓库不再有 blog/，
// 笔记里 type: blog 的条目会被跳过。
const DEST_DOCS = path.join(process.cwd(), 'docs');

async function cleanup(trackedFiles: string[]) {
  const destDirs = [DEST_DOCS];
  const normalizedTrackedFiles = trackedFiles.map(f => path.normalize(f).toLowerCase());

  for (const dir of destDirs) {
    if (!(await fs.pathExists(dir))) continue;

    const files = await glob('**/*.{md,mdx}', { cwd: dir, absolute: true, windowsPathsNoEscape: true });

    for (const file of files) {
      const normalizedFile = path.normalize(file).toLowerCase();
      if (normalizedTrackedFiles.includes(normalizedFile)) continue;

      const content = await fs.readFile(file, 'utf-8');
      const { data } = matter(content);

      if (data._synced === true) {
        await fs.remove(file);
        console.log(`[Cleanup] Removed: ${path.relative(process.cwd(), file)}`);

        // Attempt to clean empty parent directories
        let parent = path.dirname(file);
        while (parent !== dir && parent !== path.dirname(dir)) {
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
  }
}

async function sync() {
  // Use forward slashes for glob patterns even on Windows
  const sourceFiles = await glob('**/*.{md,mdx}', { cwd: SOURCE_DIR, absolute: true, windowsPathsNoEscape: true });
  const trackedFiles: string[] = [];
  const imgStylePattern = /(<img\b[^>]*?)\s*style\s*=\s*(?:"[^"]*"|'[^']*')/gi;

  for (const file of sourceFiles) {
    const content = await fs.readFile(file, 'utf-8');
    const { data, content: body } = matter(content);

    if (data.publish === true) {
      const relPath = path.relative(SOURCE_DIR, file);
      if (data.type === 'blog') {
        continue;
      }
      const targetPath = path.join(DEST_DOCS, relPath);

      // 处理内容：移除 img 标签中的 style 属性
      const cleanBody = body.replace(imgStylePattern, '$1');

      // 处理元数据
      const cleanData = { ...data };
      delete cleanData.publish;
      delete cleanData.type;
      cleanData._synced = true; // 标记为同步生成

      const output = matter.stringify(cleanBody, cleanData);
      await fs.ensureDir(path.dirname(targetPath));
      await fs.writeFile(targetPath, output);

      trackedFiles.push(targetPath);
      console.log(`[Sync] Updated: ${relPath} -> docs`);
    }
  }

  await cleanup(trackedFiles);
}

sync().catch(console.error);
