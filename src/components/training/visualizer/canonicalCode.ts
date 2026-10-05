/**
 * 「哪段代码是这篇题解的完整代码实现」——录制器与样例抽取共用的那份判据。
 *
 * ## 为什么不各自抽一遍
 *
 * 录制器（`recorder/index.ts`）拿它当**被执行的源码**，
 * `plugins/py-samples` 拿它定入口签名。两边一旦漂移，表现是
 * 「题解明明录了，页面上播放器不见了」或「跑样例调错了函数」，
 * 而报错完全指不到「其实抽的不是同一段」。
 */

/** 那一节的标题。页面上的播放器也认它（见 `theme/MDXComponents.tsx`） */
export const FULL_CODE_HEADING = '完整代码实现';

/**
 * `## 完整代码实现` 小节里的第一个 python 块。
 *
 * **必须按小节取，不能全文正则取第一个块** —— 题解的「解题思路」里往往先
 * 出现暴力解法的片段。录暴力解法会得到 n/i/j 三重循环的轨迹：
 * 帧数暴涨、指针有三个、读者看到的还不是题解主推的解法
 * （实测 0001 全文首个块是 O(n²) 的嵌套循环，录出来完全不是那题该有的样子）。
 */
export function canonCode(md: string): string {
  const lines = md.split('\n');
  const startRe = new RegExp(`^##\\s+${escapeRe(FULL_CODE_HEADING)}\\s*$`);
  const start = lines.findIndex((l) => startRe.test(l.trim()));
  if (start === -1) {
    return '';
  }
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i].trim())) {
      end = i;
      break;
    }
  }
  const m = lines
    .slice(start + 1, end)
    .join('\n')
    .match(/```python\s*\n([\s\S]*?)```/);
  return m ? m[1].trim() : '';
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}