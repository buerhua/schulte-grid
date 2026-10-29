/* ==========================================================================
 * board-classic.js —— 经典方格渲染器（SVG 方案）
 *
 * 形态特征（对应参考稿第二张图）：
 *   - 严格的 n×n 正方形网格，白底、淡蒂芙尼青细分隔线、蒂芙尼蓝外框；
 *   - 使用 SVG 绘制，与其他四种形态保持一致的渲染架构；
 *   - 数字用多色盘随机着色，字号随格子尺寸自适应。
 * ========================================================================== */
import { shuffle, range } from './config';
import { svgUtil } from './svg-util';

  /**
   * 渲染经典方格（SVG 版本）。
   * @param {HTMLElement} container 画板容器
   * @param {number} count 格子总数（n²）
   * @param {{colors:string[]}} ctx 共享颜色上下文（按格子位置对应）
   */
  export function renderClassic(container, count, ctx) {
    var n = Math.round(Math.sqrt(count));
    var svg = svgUtil.createSvg(container, 'skin-classic');
    var order = shuffle(range(count));

    // 计算每个格子的尺寸（viewBox 1000x1000，留 40px 边距）
    var padding = 40;
    var gridSize = 1000 - padding * 2;
    var cellSize = gridSize / n;

    var frag = document.createDocumentFragment();

    // 绘制外框（蒂芙尼蓝描边）
    var outerRect = svgUtil.el('rect', {
      'class': 'classic-border',
      'x': padding,
      'y': padding,
      'width': gridSize,
      'height': gridSize,
      'fill': 'none',
      'stroke': '#0ABAB5',
      'stroke-width': '4'
    });
    svg.appendChild(outerRect);

    // 绘制网格线和数字
    for (var row = 0; row < n; row++) {
      for (var col = 0; col < n; col++) {
        var pos = row * n + col;
        var num = order[pos];

        // 可点击组：矩形 + 数字
        var g = svgUtil.el('g', { 'class': 'cell svg-cell', 'data-num': num });

        // 格子矩形（白底 + 淡分隔线）
        var x = padding + col * cellSize;
        var y = padding + row * cellSize;

        var rect = svgUtil.el('rect', {
          'class': 'cell-shape',
          'x': x,
          'y': y,
          'width': cellSize,
          'height': cellSize,
          'fill': '#FFFFFF',
          'stroke': '#DDECEB',
          'stroke-width': '1'
        });

        // 数字文本（居中显示）
        var cx = x + cellSize / 2;
        var cy = y + cellSize / 2;
        var fontSize = svgUtil.fontSizeFor(cellSize);

        var text = svgUtil.el('text', {
          'class': 'cell-text',
          'x': cx.toFixed(1),
          'y': cy.toFixed(1),
          'font-size': fontSize.toFixed(1),
          'fill': ctx.colors[pos],
          'text-anchor': 'middle',
          'dominant-baseline': 'central'
        });
        text.textContent = String(num);

        g.appendChild(rect);
        g.appendChild(text);
        frag.appendChild(g);
      }
    }

    svg.appendChild(frag);
  }
