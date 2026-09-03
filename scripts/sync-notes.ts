import fs from 'fs-extra';
import path from 'path';
import matter from 'gray-matter';
import { glob } from 'glob';

const SOURCE_DIR = 'E:/hanphonejan/hanphone-note';
const DEST_DOCS = path.join(process.cwd(), 'docs');
const DEST_BLOG = path.join(process.cwd(), 'blog');

async function cleanup(trackedFiles: string[]) {
  const destDirs = [DEST_DOCS, DEST_BLOG];
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
      const isBlog = data.type === 'blog';
      const targetBase = isBlog ? DEST_BLOG : DEST_DOCS;
      const targetPath = path.join(targetBase, relPath);

      // 处理内容：移除 img 标签中的 style 属性
      const cleanBody = body.replace(imgStylePattern, '$1');

      // 处理元数据
      const cleanData = { ...data };
      delete cleanData.publish;
      if (isBlog) delete cleanData.type;
      cleanData._synced = true; // 标记为同步生成

      const output = matter.stringify(cleanBody, cleanData);
      await fs.ensureDir(path.dirname(targetPath));
      await fs.writeFile(targetPath, output);

      trackedFiles.push(targetPath);
      console.log(`[Sync] Updated: ${relPath} -> ${isBlog ? 'blog' : 'docs'}`);
    }
  }

  await cleanup(trackedFiles);
}

sync().catch(console.error);
