# AGENTS.md — 舒尔特方格（纯前端原生静态项目）

## 项目概览
- 产品：舒尔特方格注意力训练网页，纯前端本地运行，无后端、无构建步骤。
- 技术栈：原生 HTML + CSS + JavaScript（经典脚本，无打包、无 npm 依赖），SVG 绘制不规则/鹅卵石/蜂巢/圆环四种形态。
- 主题：蒂芙尼蓝 `#0ABAB5`，视觉规范见 [DESIGN.md](./DESIGN.md)。
- 静态服务：`python3 -m http.server`（见 `.coze`，端口读 `DEPLOY_RUN_PORT`，默认 5000）。

## 目录结构
```
index.html              # 页面骨架：标题栏/统计条/画板/操作按钮/两个弹框
css/style.css           # 全部样式（12 个功能分组，见文件头注释）
js/
  config.js             # 可选项、色盘、小屏判定（物理像素<600）、工具函数
  audio.js              # 叮/咚音效对象池（assets/sounds/*.wav）
  voronoi.js            # Voronoi 多边形（半平面裁切 + Lloyd 松弛）
  boards.js             # 渲染器注册表 + SVG 共享工具（App.SvgUtil）
  board-classic.js      # 经典方格：CSS Grid + <button>
  board-irregular.js    # 不规则：Voronoi polygon
  board-cobble.js       # 鹅卵石：Voronoi 收缩 + 中点贝塞尔平滑，马卡龙填充
  board-honey.js        # 蜂巢：pointy-top 六边形错位排列
  board-ring.js         # 圆环：同心环扇区（最大余数法分配格数）
  game.js               # 核心状态机：计时/判定/连击/完成事件
  ui.js                 # 统计条、模式选择弹框、结果弹框
  main.js               # 入口：装配事件、首屏弹框、resize 防抖
assets/
  favicon.svg           # 主题图标
  sounds/ding.wav       # 正确音效（G6+C7+E7 钟音）
  sounds/dong.wav       # 错误音效（低频敲击）
```

## 核心架构约定
- 所有脚本挂载到全局命名空间 `window.App`，**禁止改为 ES Module**（需支持 file:// 双击直开）。
- 渲染器契约：`render(container, count, ctx)`，每个可点击根元素必须有 `class="cell"` 与 `data-num`；新增方格形态时实现渲染函数并 `App.boards.register(type, fn)`，同时在 `config.js` 的 `TYPE_OPTIONS` 登记。
- 游戏事件用订阅：`App.game.on('stats'|'firstClick'|'finish', fn)`；UI 与规则解耦。
- 数字色按格子位置取 `ctx.colors[i]`（色盘循环后整体洗牌），不要在渲染器内部自行随机。
- SVG 统一 viewBox `0 0 1000 1000`，坐标自适应；经典方格字号用容器查询单位 `cqi`。

## 关键规则
- 计时：首次点击数字开始（rAF），完成瞬间取精确时间，结果 **四舍五入整数秒**；进行中统计条显示一位小数。
- 判定：必须从 1 严格升序；正确→叮+连击+1+完成态；错误→咚+连击清零+抖动泛红，已找到格不响应。
- 小屏判定：`min(innerWidth, innerHeight) * devicePixelRatio < 600` → 7×7/8×8/9×9 禁用并回落 6×6。
- 结果弹框任何方式关闭（按钮/遮罩/Esc）都按当前模式自动重开。

## 常用命令
- 启动：`python3 -m http.server ${DEPLOY_RUN_PORT}`（或 coze dev 自动托管）
- JS 语法检查：`for f in js/*.js; do node --check "$f"; done`
- 无单元测试框架；几何与渲染逻辑可用 Node 桩环境 + Playwright（沙箱已装 chromium）做验证脚本。

## 代码风格
- JS：`'use strict'`、IIFE 包裹、函数与文件头必须有中文功能注释（JSDoc 风格）。
- CSS：选择器按功能分组，每组带中文块注释；颜色/圆角/阴影统一走 `:root` 令牌，禁止硬编码主色。
- HTML：功能片段用 `<!-- ==== -->` 注释分隔；中文 `lang="zh-CN"`。
