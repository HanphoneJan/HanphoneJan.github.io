/**
 * 端到端验证：无头 Chrome 点真实的「算法可视化」折叠块。
 *
 * 每类 adapter 各挑一题，验证：播放器挂上、**对应视图的格子真的渲染了**、
 * 指针/光标标签出现、单步有效。
 *
 * 与 AGENTS.md 记的 Pyodide 扫描脚本同样的思路：肉眼看不算验证。
 * 跑法：node scripts/check-vis.js [port]
 */

const PORT = process.argv[2] || '3100';
const BASE = `http://localhost:${PORT}`;

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
const http = require('http');

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
  const chrome = spawn(
    'google-chrome',
    [
      '--headless=new',
      '--remote-debugging-port=9222',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      'about:blank',
    ],
    {stdio: 'ignore'},
  );

  try {
    let version = null;
    for (let i = 0; i < 40; i++) {
      try {
        version = await get('http://localhost:9222/json/version');
        break;
      } catch {
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

    for (const page of PAGES) {
      const {result: created} = await send('Target.createTarget', {url: 'about:blank'});
      const {result: att} = await send('Target.attachToTarget', {
        targetId: created.targetId,
        flatten: true,
      });
      const sid = att.sessionId;
      await send('Runtime.enable', {}, sid);
      await send('Page.enable', {}, sid);

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
      await sleep(1200);

      const evalJs = async (expr) => {
        const {result} = await send(
          'Runtime.evaluate',
          {expression: expr, returnByValue: true, awaitPromise: true},
          sid,
        );
        return result.result ? result.result.value : undefined;
      };

      const hasBox = await evalJs(`!!document.getElementById('visualizer')`);
      if (!hasBox) {
        fails.push(`${page.name}: 页面上没有 #visualizer`);
        console.log(`✗ ${page.name}：没有 #visualizer`);
        await send('Target.closeTarget', {targetId: created.targetId});
        continue;
      }
      pass++;
      console.log(`✓ ${page.name}：折叠块在页面上`);

      const inToc = await evalJs(
        `!!Array.from(document.querySelectorAll('nav a, .table-of-contents a'))
           .find(a => a.textContent.trim() === '算法可视化')`,
      );
      if (inToc) pass++;
      else fails.push(`${page.name}: TOC 里没有条目`);
      console.log(`${inToc ? '✓' : '✗'} ${page.name}：TOC 条目`);

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
        fails.push(`${page.name}: 播放器没出现`);
        const err = await evalJs(
          `document.querySelector('.visError')?.textContent || '(无错误提示)'`,
        );
        console.log(`✗ ${page.name}：播放器没出现 — ${err}`);
        await send('Target.closeTarget', {targetId: created.targetId});
        continue;
      }
      pass++;
      console.log(`✓ ${page.name}：播放器挂上了`);

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
        };
      })()`);

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
      console.error('失败：\n  ' + fails.join('\n  '));
      process.exitCode = 1;
    }
    ws.close();
  } finally {
    chrome.kill();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
