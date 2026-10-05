/**
 * 规模化验证：**每一个**有内嵌可视化的题解页都真的渲染得出来。
 *
 * ## 为什么不能只验 10 个
 *
 * `check-vis.js` 挑的是每类视图各一题（十种），验的是「视图类型对不对」。
 * 但「166 篇都上得了页面」这句话本身没被验证过 —— 构建期 `adapt()` 成功
 * 只说明**帧**生成对了，页面上那一步是另一回事：
 * `React.lazy` 的 chunk 拉不下来、`fetch('/traces/xxx.json')` 404、
 * 轨迹里的某个值在渲染时抛异常，读者看到的都是一个红框。
 *
 * 这些**只有真开浏览器点按钮才会暴露**，而它们不会让任何单测失败。
 *
 * ## 验什么
 *
 * 对每个带 `id="visualizer"` 的题解页：
 *
 * 1. 折叠块在（构建期 globalData 有这篇）
 * 2. **播放器紧跟在「完整代码实现」那一节的标题下面**（不在页面最底部）
 * 3. 右侧导航里**没有**单独的「算法可视化」条目（它是那一节的一部分）
 * 4. 展开后播放器挂上了（fetch 成功、adapter 在浏览器里跑通了）
 * 5. **没有 `.visError`**（轨迹解析/渲染抛异常时组件显示的就是它）
 * 6. 真的画出了东西（格子 / 树节点 / 网格单元 / aux 行 至少一个）
 * 7. 单步有效（点「下一步」note 会变）—— 证明帧不是全部相同
 *
 * ## 跑法
 *
 * ```
 * node scripts/check-vis.js            # 十类视图各一题（默认）
 * node scripts/check-vis.js --all       # 全站每一个有可视化的题解页
 * node scripts/check-vis.js --all 200   # 同上，但最多查 200 个
 * ```
 *
 * 全站模式从 `build/code-training/problems/` 下面递归找出**含
 * `id="visualizer"` 的页面**（构建产物自带这个事实，不需要另外维护清单）。
 * 需要先 `pnpm build` 且有一个静态服务器（脚本自己起一个 python http.server）。
 */

const PORT = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '3100';
const BASE = `http://localhost:${PORT}`;
const ALL = process.argv.includes('--all');
/** `--tracers`：只查内嵌手写 tracer 的文档（模式 / 模板页） */
const TRACERS_ONLY = process.argv.includes('--tracers');
const LIMIT = (() => {
  const i = process.argv.indexOf('--all');
  const n = i >= 0 ? Number(process.argv[i + 1]) : NaN;
  return Number.isFinite(n) && n > 0 ? n : Infinity;
})();

/**
 * 内嵌手写 tracer 的文档：模式 6 篇 + 模板 2 篇（与 `inlinePlacement.ts` 同步）。
 *
 * 这批要验的东西与录制式不同：那边验的是「轨迹 fetch 回来、adapter 在浏览器里
 * 跑通」，这边验的是「懒加载的 `tracers/index.ts` 真的到了、播放器挂上了、
 * 点播放后画面动起来」。
 */
/**
 * 每个 tracer 该渲染成哪种视图。
 *
 * 为什么要有这张表：`check-vis` 判「画面画出来了」时，不能一律查
 * `[data-testid="cell"]` —— 树走 TreeView、网格走 GridView、DP 走 TableView，
 * 用错选择器会把「视图对了」误报成「没渲染」。
 *
 * 而且**期望必须按播放器给，不能按页面给**：`dynamic_programming.md` 一页里
 * 挂着爬楼梯、0-1 背包、LCS 三个播放器，全是表；`dfs_template.md` 是树 + 数组。
 * 按页面给一个 view 就必然有播放器对不上（早先那样写，6 个播放器全被
 * 误报成「画面是空的」—— 是尺子错了，不是页面错了）。
 */
const TRACER_VIEW = {
  'grid-bfs': 'grid',
  'climb-stairs': 'table',
  'zero-one-knapsack': 'table',
  'lcs-table': 'table',
  'tree-dfs': 'tree',
};

const TRACER_PAGES = [
  {
    path: '/code-training/patterns/sorting',
    name: '排序模式（三个播放器）',
    count: 3,
  },
  {
    path: '/code-training/patterns/sliding_window',
    name: '滑动窗口',
    count: 1,
  },
  {path: '/code-training/patterns/two_pointers', name: '双指针', count: 1},
  {
    path: '/code-training/patterns/dynamic_programming',
    name: '动态规划（爬楼梯 + 0-1 背包 + LCS 表）',
    count: 3,
  },
  {path: '/code-training/patterns/bfs', name: 'BFS', count: 1},
  {path: '/code-training/patterns/dfs', name: 'DFS', count: 1},
  {path: '/code-training/patterns/backtracking', name: '回溯', count: 1},
  {path: '/code-training/patterns/hash_map', name: '哈希表模式', count: 1},
  {
    path: '/code-training/templates/binary_search_template',
    name: '二分模板（二分 + lower_bound）',
    count: 2,
  },
  {path: '/code-training/templates/bfs_template', name: 'BFS 模板', count: 1},
  {
    path: '/code-training/templates/dfs_template',
    name: 'DFS 模板（遍历 + 回溯）',
    count: 2
  },
  {path: '/code-training/data-structures/hash_table', name: '哈希表', count: 1},
  {path: '/code-training/data-structures/linked_list', name: '链表', count: 1},
  {
    path: '/code-training/data-structures/stack_queue_heap_unionfind',
    name: '并查集',
    count: 1,
  },
  {
    path: '/code-training/data-structures/binary_tree',
    name: '二叉树',
    count: 1
  },
  {path: '/code-training/data-structures/tree', name: '树', count: 1},
  {
    path: '/code-training/data-structures/string',
    name: '字符串',
    count: 1
  },
  {path: '/code-training/data-structures/array', name: '数组', count: 1},
  {
    path: '/code-training/data-structures/graph',
    name: '图',
    count: 1
  },
];

/** 每类 adapter 一题（与 probe-adapters 的输出对应） */
const PAGES = [
  {path: '/code-training/problems/leetcode/11', name: '盛水容器', view: 'array', ptr: true},
  {path: '/code-training/problems/leetcode/104', name: '二叉树最大深度', view: 'tree', ptr: true},
  {path: '/code-training/problems/leetcode/200', name: '岛屿数量', view: 'grid', ptr: false},
  {path: '/code-training/problems/leetcode/20', name: '有效括号', view: 'stack', ptr: false},
  {path: '/code-training/problems/leetcode/198', name: '打家劫舍', view: 'dp', ptr: true},
  {path: '/code-training/problems/leetcode/21', name: '合并两个有序链表', view: 'array', ptr: true},
  // 三种新形态，各挑一题。少一个就等于没验证 —— 新写的 adapter 最容易
  // 「构建期跑得好好的、页面上一个格子都不画」，而那种问题肉眼看不出来。
  {
    path: '/code-training/problems/nowcoder/华为机试/HJ21',
    name: '简单密码（string：字符光标 + 中间结果行）',
    view: 'string',
    ptr: true,
  },
  {
    path: '/code-training/problems/leetcode/560',
    name: '和为 K 的子数组（aux-table：字典键当格子）',
    view: 'aux',
    ptr: true,
  },
  {
    path: '/code-training/problems/leetcode/7',
    name: '整数反转（dp-counter：逐位消费）',
    view: 'digit',
    ptr: true,
  },
  // class-API 设计题：录的是「构造一次 + 挨个调方法」的脚本，
  // 内部状态（LRU 的 key 表 / 最小栈的辅助栈）全在 self.* 上。
  // 这三题没有入参数组可画，少验一个就等于「脚本模式能不能上页面」没验证过。
  {
    path: '/code-training/problems/leetcode/146',
    name: 'LRU 缓存（脚本模式：字典键就是主画面）',
    view: 'keys',
    ptr: false,
  },
  {
    path: '/code-training/problems/leetcode/155',
    name: '最小栈（脚本模式：双栈）',
    view: 'aux',
    ptr: false,
  },
  {
    path: '/code-training/problems/leetcode/208',
    name: '前缀树（脚本模式：逐字符下行）',
    view: 'string',
    ptr: true,
  },
];

const {spawn} = require('child_process');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

/**
 * 全站模式：从 build 产物里找出所有带 `id="visualizer"` 的题解页。
 *
 * 「构建产物里有没有这个 id」就是「这篇有没有可视化」的事实本身 ——
 * 不维护第二份清单，也就不会出现清单与产物不一致的情况。
 */
function discoverPages() {
  const root = path.join(process.cwd(), 'build', 'code-training', 'problems');
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        walk(full);
        continue;
      }
      if (!e.name.endsWith('.html')) {
        continue;
      }
      const html = fs.readFileSync(full, 'utf8');
      if (!html.includes('id="visualizer"')) {
        continue;
      }
      const rel = path.relative(path.join(process.cwd(), 'build'), full).split(path.sep).join('/');
      out.push({
        path: '/' + rel.replace(/\/index\.html$/, '').replace(/\.html$/, ''),
        name: e.name.replace(/\.html$/, ''),
        view: 'any',
        ptr: false,
        all: true,
      });
    }
  };
  if (fs.existsSync(root)) {
    walk(root);
  }
  out.sort((a, b) => (a.name < b.name ? -1 : 1));
  return out.slice(0, LIMIT);
}

/** 取 JSON（CDP 的 /json/version）。页面不能走这里，见 ping。 */
function get(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => resolve(JSON.parse(d)));
      })
      .on('error', reject);
  });
}

/**
 * 只看状态码的就绪探测。
 *
 * 不能复用 `get()`：它对响应体做 `JSON.parse`，而页面是 HTML ——
 * 于是「服务器还没起来」这个等待逻辑自己先崩了，
 * 报出来的是 `Unexpected token < in JSON`，一个字都看不出是在等服务器。
 */
function ping(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        res.resume();
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 400) {
            resolve(true);
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      })
      .on('error', reject);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 把播放器拖到中段再检查：首帧是指针初始化的那一帧，本来就没有标签 */
const SEEK_MID = `
(() => {
  const p = document.querySelector('[data-testid="vis-player"]');
  const r = p.querySelector('input[type="range"]');
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'value').set;
  setter.call(r, String(Math.floor(Number(r.max) / 2)));
  r.dispatchEvent(new Event('input', {bubbles: true}));
  r.dispatchEvent(new Event('change', {bubbles: true}));
})()`;

async function main() {
  if (ALL && !fs.existsSync(path.join(process.cwd(), 'build'))) {
    console.error('先跑 pnpm build（--all 模式从 build 产物里找页面）');
    process.exit(1);
  }
  const pages = ALL ? discoverPages() : TRACERS_ONLY ? TRACER_PAGES : PAGES;
  if (pages.length === 0) {
    console.error('一个页面都没找到');
    process.exit(1);
  }
  console.log(
    `检查 ${pages.length} 个页面（${
      ALL ? '全站题解' : TRACERS_ONLY ? '内嵌 tracer' : '抽样'
    }）\n`,
  );

  /**
   * 用 `docusaurus serve` 而不是 `python3 -m http.server`。
   *
   * 差别是**URL 解析**：站点 `trailingSlash: false`，`/problems/leetcode/560`
   * 对应磁盘上的 `560.html`。`http.server` 不做无扩展名解析，于是那个 URL
   * 直接 404 —— 页面加载不出来，`#visualizer` 自然没有，
   * 而 12 个页面**全都**报同一句「页面上没有 #visualizer」，
   * 没有一个字指向「你用的是个不会解析无扩展名 URL 的服务器」。
   *
   * 线上（GitHub Pages）认无扩展名 URL，所以必须用同一种解析方式验。
   */
  // 注意要 spawn `node` + .mjs 入口，不能 spawn `node_modules/.bin/docusaurus`
  // —— 那是个 **shell 脚本**（#!/usr/bin/env sh 的 shim），交给 node 会报
  // `SyntaxError: Invalid or unexpected token`，报错指不到真正的原因。
  const server = spawn(
    'node',
    [
      'node_modules/@docusaurus/core/bin/docusaurus.mjs',
      'serve',
      '--port',
      String(PORT),
      '--no-open',
    ],
    {stdio: 'ignore'},
  );
  // docusaurus serve 起得比 http.server 慢，等它真的能应答再开 Chrome，
  // 否则第一批页面全 404 —— 而报出来的是「页面上没有 #visualizer」。
  let serverUp = false;
  for (let i = 0; i < 60; i++) {
    try {
      await ping(`${BASE}/code-training/problems/leetcode/560`);
      serverUp = true;
      break;
    } catch {
      await sleep(500);
    }
  }
  if (!serverUp) throw new Error('docusaurus serve 没起来');

  /**
   * 调试端口与 profile 目录**每次都用自己的**。
   *
   * 写死 9222 撞过两次：上一轮跑挂之后残留的无头 Chrome 还占着那个端口，
   * 新起的那个绑定失败直接退出，而 `get('…/json/version')` 连上的
   * 是**残留实例** —— 它能建 target、能导航，但拿到的是上一次那个浏览器
   * 的状态，于是 12 个页面**全部**报「页面上没有 #visualizer」。
   *
   * 报错指不到「端口被占」这件事：一个字都没提 Chrome。
   *
   * 端口取 `HTTP 端口 + 1`，profile 放临时目录 —— 与用户自己开着的
   * Chrome（面板用的那个 3080）也不会互相干扰。
   */
  const dbgPort = Number(PORT) + 1;
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'vis-check-'));
  const chrome = spawn(
    'google-chrome',
    [
      '--headless=new',
      `--remote-debugging-port=${dbgPort}`,
      `--user-data-dir=${profile}`,
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-default-browser-check',
      'about:blank',
    ],
    {stdio: 'ignore'},
  );
  let chromeExited = false;
  chrome.on('exit', () => {
    chromeExited = true;
  });

  try {
    let version = null;
    for (let i = 0; i < 40; i++) {
      try {
        version = await get(`http://localhost:${dbgPort}/json/version`);
        break;
      } catch {
        if (chromeExited) {
          throw new Error(
            `Chrome 启动就退出了（多半是 ${dbgPort} 已被占用）`,
          );
        }
        await sleep(250);
      }
    }
    if (!version) throw new Error('Chrome 没起来');

    const ws = new WebSocket(version.webSocketDebuggerUrl, {
      maxPayload: 256 * 1024 * 1024,
    });
    await new Promise((r) => {
      if (ws.readyState === 1) r();
      else ws.addEventListener('open', r);
    });

    let id = 0;
    const pending = new Map();
    const onMessage = (ev) => {
      const msg = JSON.parse((typeof ev === 'string' ? ev : ev.data).toString());
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      }
    };
    if (typeof ws.on === 'function') ws.on('message', onMessage);
    else ws.addEventListener('message', onMessage);

    const send = (method, params = {}, sessionId) =>
      new Promise((resolve) => {
        const mid = ++id;
        pending.set(mid, resolve);
        ws.send(JSON.stringify({id: mid, method, params, sessionId}));
      });

    let pass = 0;
    const fails = [];

    for (const page of pages) {
      const {result: created} = await send('Target.createTarget', {url: 'about:blank'});
      const {result: att} = await send('Target.attachToTarget', {
        targetId: created.targetId,
        flatten: true,
      });
      const sid = att.sessionId;
      await send('Runtime.enable', {}, sid);
      await send('Page.enable', {}, sid);
      /**
       * 把视口**固定成桌面宽度**再验。
       *
       * 无头 Chrome 默认窗口 800×600 → `useWindowSize()` 判成 mobile，
       * `DocItemLayout` 就只渲染 `DocItemTOCMobile` —— 而那个下拉**默认收起**，
       * 条目不在 DOM 里（实测 `.menu a` 里最后十条全是导航与页脚，
       * 本页 TOC 一条都没有）。
       *
       * 于是「TOC 里没有条目」会每页都失败，而页面上明明有条目。
       * `Emulation.setDeviceMetricsOverride` 是正解：桌面侧边栏真的渲染出来，
       * 验的也就是读者在桌面浏览器上看到的那份 TOC。
       */
      await send('Emulation.setDeviceMetricsOverride', {
        width: 1280,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false,
      }, sid);

      const loaded = new Promise((resolve) => {
        const h = (ev) => {
          const m = JSON.parse((typeof ev === 'string' ? ev : ev.data).toString());
          if (m.method === 'Page.loadEventFired') resolve();
        };
        if (typeof ws.on === 'function') ws.on('message', h);
        else ws.addEventListener('message', h);
      });
      await send('Page.navigate', {url: BASE + page.path}, sid);
      await loaded;
      await sleep(ALL ? 500 : 1200);

      const evalJs = async (expr) => {
        const {result} = await send(
          'Runtime.evaluate',
          {expression: expr, returnByValue: true, awaitPromise: true},
          sid,
        );
        return result.result ? result.result.value : undefined;
      };

      /** 只在抽样模式里跑的「讲给人听」的几项 */
      const bail = async (msg) => {
        fails.push(`${page.name}: ${msg}`);
        console.log(`✗ ${page.name}：${msg}`);
        await send('Target.closeTarget', {targetId: created.targetId});
      };

      /**
       * 内嵌手写 tracer 的文档走**另一条**验证路径。
       *
       * 与录制式不同的是：
       * - 折叠壳的 id 是 `vis-<tracerId>`，而不是 `visualizer`；
       * - 没有 `fetch('/traces/x.json')`，要验的是**懒加载的 chunk**
       *   （`tracers/index.ts` + `AlgoPlayer`）真的到了 —— 这是这一路独有的风险：
       *   放置表里的 id 拼错、`findTracer` 返回 undefined，页面上一片空白；
       * - 一个页面可能有多个播放器，必须**逐个**打开。
       */
      if (TRACERS_ONLY) {
        const boxes = await evalJs(
          `Array.from(document.querySelectorAll('details[id^="vis-"]')).map(d => d.id)`,
        );
        if (!Array.isArray(boxes) || boxes.length !== page.count) {
          await bail(
            `折叠壳数量不对：期望 ${page.count}，实际 ${(boxes || []).length}`,
          );
          continue;
        }
        pass++;
        console.log(`✓ ${page.name}：${page.count} 个折叠壳`);

        for (const id of boxes) {
          await evalJs(
            `document.getElementById(${JSON.stringify(id)}).open = true;
             document.getElementById(${JSON.stringify(id)})
               .dispatchEvent(new Event('toggle'))`,
          );
          let mounted = false;
          for (let i = 0; i < 60; i++) {
            mounted = await evalJs(
              `!!Array.from(document.querySelectorAll('input[type="range"]'))
                 .some(r => Number(r.max) > 1)`,
            );
            if (mounted) break;
            await sleep(250);
          }
          if (!mounted) {
            await bail(`${id}：播放器没挂上（懒加载的 chunk 没到？）`);
            break;
          }
          pass++;
          /**
           * 「画面上有东西」要按**该播放器声明的视图**查。
           *
           * 树视图画的是 `tree-node`、DP 表画的是 `dp-table td`，
           * 而用一个大而全的选择器时，某个视图恰好也有别的东西（比如
           * aux 行）就会通过 —— 验的不是「这一类视图渲染了」。
           * 反过来漏掉某个 testid 时又会误报成「画面是空的」。
           */
          const drew = await evalJs(
            `(() => {
              const root = document.getElementById(${JSON.stringify(id)});
              const want = ${JSON.stringify(
                // id 形如 vis-grid-bfs，而 TRACER_VIEW 的键是 grid-bfs ——
                // 忘了剥前缀的话每一项都退化成 'any'，而树 / 网格 / 表三种视图
                // 都没有 cell，六个播放器会被一起误报成「画面是空的」
                TRACER_VIEW[id.replace(/^vis-/, '')] ?? 'any',
              )};
              const sel = {
                tree: '[data-testid="tree-node"]',
                table: '[data-testid="dp-table"] td',
                grid: '[data-testid="grid"] > *',
                any: '[data-testid="cell"], [data-testid="aux-array"] > *',
              }[want];
              return root.querySelectorAll(sel).length;
            })()`,
          );
          if (drew > 0) pass++;
          else {
            fails.push(`${page.name} / ${id}：画面是空的`);
            console.log(`✗ ${page.name} / ${id}：画面是空的`);
          }
          // 点「下一步」看动画真的在动
          const before = await evalJs(
            `document.getElementById(${JSON.stringify(id)}).querySelector('[data-testid="note"]')?.textContent || ''`,
          );
          await evalJs(
            `(() => {
              const root = document.getElementById(${JSON.stringify(id)});
              const btn = root.querySelector('button[aria-label="下一步"]');
              if (btn) btn.click();
            })()`,
          );
          await sleep(350);
          const after = await evalJs(
            `document.getElementById(${JSON.stringify(id)}).querySelector('[data-testid="note"]')?.textContent || ''`,
          );
          if (before !== after) {
            pass++;
          } else {
            fails.push(`${page.name} / ${id}：单步没反应`);
            console.log(`✗ ${page.name} / ${id}：单步没反应`);
          }
        }
        await send('Target.closeTarget', {targetId: created.targetId});
        console.log('');
        continue;
      }

      const hasBox = await evalJs(`!!document.getElementById('visualizer')`);
      if (!hasBox) {
        await bail('页面上没有 #visualizer');
        continue;
      }
      pass++;
      if (!page.all) console.log(`✓ ${page.name}：折叠块在页面上`);

      /**
       * 播放器必须**紧跟在 `## 完整代码实现` 那一节的标题下面**，
       * 且右侧导航里**没有**单独的「算法可视化」条目。
       *
       * 两条都是这次改动的验收点：播放器原来渲染在 `</DocItemContent>` 之后
       * （页面最底部，离它逐帧回放的那段代码隔了好几节），TOC 里还多一条同名条目。
       *
       * 用 `previousElementSibling` 而不是父容器：播放器挂在标题的**下一个兄弟**
       * 位置（`@theme/MDXComponents` 的 `h2`），中间不该夹着别的元素。
       *
       * 条目要同时查 `.menu a` 与 `.table-of-contents a`：无头 Chrome 默认窗口
       * 800×600 → `useWindowSize()` 判成 mobile，桌面侧边栏不进 DOM，
       * 条目全在 `.menu` 里。
       */
      const attached = await evalJs(
        `(() => {
           const el = document.getElementById('visualizer');
           if (!el) return false;
           const prev = el.previousElementSibling;
           // 按 id 判而不是 textContent：标题里还挂着一个 hash-link（锚点按钮），
           // textContent 会把它的「」也读进来
           return !!prev && prev.tagName === 'H2' &&
             prev.id === '完整代码实现';
         })()`,
      );
      if (attached) pass++;
      else {
        fails.push(`${page.name}: 播放器不在「完整代码实现」那一节里`);
        if (!page.all) console.log(`✗ ${page.name}：播放器位置不对`);
      }

      const inToc = await evalJs(
        `!!Array.from(document.querySelectorAll('.menu a, .table-of-contents a'))
           .find(a => a.textContent.trim() === '算法可视化')`,
      );
      if (!inToc) pass++;
      else {
        fails.push(`${page.name}: TOC 里仍有单独的「算法可视化」条目`);
        if (!page.all) console.log(`✗ ${page.name}：TOC 里仍有可视化条目`);
      }

      await evalJs(`document.getElementById('visualizer').open = true`);
      await evalJs(
        `document.getElementById('visualizer').dispatchEvent(new Event('toggle'))`,
      );

      let player = false;
      for (let i = 0; i < 60; i++) {
        player = await evalJs(`!!document.querySelector('[data-testid="vis-player"]')`);
        if (player) break;
        await sleep(250);
      }
      if (!player) {
        const err = await evalJs(
          `document.querySelector('.visError')?.textContent || '(无错误提示)'`,
        );
        await bail(`播放器没出现 — ${err}`);
        continue;
      }
      pass++;
      if (!page.all) console.log(`✓ ${page.name}：播放器挂上了`);

      await evalJs(SEEK_MID);
      await sleep(400);

      /**
       * 按 view 类型断言**对应视图**真的渲染了。
       *
       * 不能一律查 `[data-testid="cell"]`（那是 ArrayView 专用）：
       * 树走 TreeView、网格走 GridView、栈多一条 aux 行，
       * 用错选择器会把「视图对了」误报成「没渲染」。
       */
      const counts = await evalJs(`(() => {
        const p = document.querySelector('[data-testid="vis-player"]');
        return {
          cells: p.querySelectorAll('[data-testid="cell"]').length,
          treeNodes: p.querySelectorAll('[data-testid="tree-node"]').length,
          auxRows: p.querySelectorAll('[data-testid="aux-array"]').length,
          treeCursor: p.querySelectorAll('[data-cursor="true"]').length,
          gridCells: p.querySelectorAll('[class*="grid"] > *').length,
          pointers: Array.from(p.querySelectorAll('[class*="pointer"]')).map(e => e.textContent).filter(Boolean),
          note: p.querySelector('[data-testid="vis-note"]')?.textContent || '',
          step: p.querySelector('[class*="stepCount"]')?.textContent || '',
          counters: Array.from(p.querySelectorAll('[class*="counter"]')).map(e => e.textContent.trim()),
          error: p.querySelector('.visError')?.textContent || '',
          frames: Number(p.querySelector('input[type="range"]')?.max || 0) + 1,
        };
      })()`);

      // 全站模式只看「画出了东西 + 没报错」，不按视图类型分派
      if (page.all) {
        const drew =
          counts.cells + counts.treeNodes + counts.gridCells + counts.auxRows;
        if (drew > 0 && counts.note.trim()) pass++;
        else {
          fails.push(
            `${page.name}: 画面是空的（格 ${counts.cells} 树 ${counts.treeNodes} ` +
              `aux ${counts.auxRows} 网格 ${counts.gridCells}，note「${counts.note.slice(0, 30)}」）`,
          );
          console.log(`✗ ${page.name}：画面是空的`);
        }
        if (!counts.error) pass++;
        else {
          fails.push(`${page.name}: 组件报错 ${counts.error.slice(0, 80)}`);
          console.log(`✗ ${page.name}：组件报错 ${counts.error.slice(0, 80)}`);
        }
        console.log(
          `  ${page.name}｜${counts.frames} 帧｜格 ${counts.cells} 树 ${counts.treeNodes}` +
            ` aux ${counts.auxRows} 网格 ${counts.gridCells}｜${counts.step}`,
        );
        await send('Target.closeTarget', {targetId: created.targetId});
        continue;
      }

      const viewOk = {
        dp: counts.cells > 0 && counts.counters.length > 0,
        array: counts.cells > 0,
        tree: counts.treeNodes > 0,
        grid: counts.gridCells > 0,
        stack: counts.cells > 0 && counts.auxRows > 0,
        // 字符串题：主行是字符格，且**必须有指针标签**——
        // 光标是这个 adapter 的全部教学内容（「现在在改写第几个字符」）
        string: counts.cells > 0 && counts.pointers.length > 0,
        // 字典题：字典的键渲染成 aux 行，而键数必须**在变**
        // （静止的字典画出来就是一张表，读者学不到任何东西）
        aux: counts.cells > 0 && counts.auxRows > 0,
        // 逐位消费：格子条是整数的各位数字 + 一个指针
        digit: counts.cells > 0 && counts.pointers.length > 0,
        // 「只有字典」模式：字典的键**就是主画面**（0146 LRU 没有入参数组，
        // 「缓存里现在有哪几个 key」是全部状态）。这时没有 aux 行可查。
        keys: counts.cells > 0,
      }[page.view];
      if (viewOk) pass++;
      else fails.push(`${page.name}: ${page.view} 视图没渲染出格子`);
      console.log(
        `${viewOk ? '✓' : '✗'} ${page.name}：${page.view} 视图 — ` +
          `格 ${counts.cells} 树节点 ${counts.treeNodes} aux ${counts.auxRows}` +
          (counts.pointers.length ? ` 指针 ${JSON.stringify([...new Set(counts.pointers)])}` : '') +
          (counts.counters.length ? ` 计数 ${JSON.stringify(counts.counters)}` : ''),
      );
      console.log(`    进度 ${counts.step}｜note: ${counts.note}`);
      if (counts.note.trim()) pass++;
      else fails.push(`${page.name}: note 为空`);

      /**
       * 「有没有指出当前在哪」—— 三种形态，不能一律查指针标签：
       *
       * - 数组/链表/栈：指针标签（pointerA 那一族）
       * - 树：光标是**高亮的格子**（data-cursor="true"），不是标签
       * - DP：画面上根本没有指针，状态在**计数器面板**里（f0 / f1）
       *
       * 早先一律要求指针标签，于是树与 DP 被误报成「没有指针」——
       * 是尺子错了，不是页面错了。
       */
      const hasFocus = {
        array: counts.pointers.length > 0,
        tree: counts.treeCursor > 0,
        grid: true,
        stack: true,
        dp: counts.counters.length > 0,
        string: counts.pointers.length > 0,
        aux: counts.pointers.length > 0 || counts.auxRows > 0,
        digit: counts.pointers.length > 0,
        keys: true,
      }[page.view];
      if (page.ptr) {
        if (hasFocus) pass++;
        else fails.push(`${page.name}: 没有指出当前处理位置`);
        console.log(`${hasFocus ? '✓' : '✗'} ${page.name}：指出了当前处理位置`);
      }

      const before = counts.note;
      await evalJs(
        `document.querySelector('[data-testid="vis-player"] button[aria-label="下一步"]').click()`,
      );
      await sleep(350);
      const after = await evalJs(
        `document.querySelector('[data-testid="vis-note"]').textContent`,
      );
      if (before !== after) {
        pass++;
        console.log(`✓ ${page.name}：单步有效`);
      } else {
        fails.push(`${page.name}: 单步没反应`);
        console.log(`✗ ${page.name}: 单步没反应`);
      }

      await send('Target.closeTarget', {targetId: created.targetId});
      console.log('');
    }

    console.log(`全部通过：${pass} 项`);
    if (fails.length) {
      console.error(`失败 ${fails.length} 条：\n  ` + fails.join('\n  '));
      process.exitCode = 1;
    }
    ws.close();
  } finally {
    chrome.kill();
    server.kill();
    /**
     * 临时 profile 目录**尽力删**。
     *
     * `chrome.kill()` 只是发信号，Chrome 还在写自己的 profile，
     * 紧接着 `rmSync` 就会 ENOTEMPTY —— 而这个异常是在检查**全部通过**
     * 之后抛出来的，于是「830 项全过」被一个清理失败盖成退出码非 0。
     *
     * 判失败的是检查本身，不是收尾。
     */
    await sleep(300);
    try {
      fs.rmSync(profile, {recursive: true, force: true, maxRetries: 5, retryDelay: 200});
    } catch {
      console.log(`（临时目录没删掉：${profile}）`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});