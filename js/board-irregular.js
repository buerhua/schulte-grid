/* ==========================================================================
 * board-irregular.js —— 不规则方格渲染器
 *
 * 形态特征（对应参考稿第三张图）：
 *   - Voronoi 泰森多边形无缝铺满画板，形状大小各异但面积接近；
 *   - 白色填充、墨绿青色 (#2B7A70) 手绘感描边；
 *   - 数字置于每个多边形的重心，字号随等效半径自适应。
 * ========================================================================== */
import { shuffle, range } from './config';
import { svgUtil } from './boards';
import {voronoi} from './voronoi';

  /**
   * 渲染不规则方格。
   * @param {HTMLElement} container 画板容器
   * @param {number} count 格子总数
   * @param {{colors:string[]}} ctx 共享颜色上下文（按格子位置对应）
   */
  export function renderIrregular(container, count, ctx) {
    var svg = svgUtil.createSvg(container, 'skin-irregular');

    // 生成经过 3 次 Lloyd 松弛的 Voronoi 单元
    var cells = voronoi.generate(count, 3);
    var order = shuffle(range(count));

    var frag = document.createDocumentFragment();

    cells.forEach(function (cell, i) {
      var num = order[i];

      // 可点击组：形状 polygon + 数字 text
      var g = svgUtil.el('g', { 'class': 'cell svg-cell', 'data-num': num });

      // polygon 顶点坐标串："x1,y1 x2,y2 ..."
      var points = cell.points.map(function (p) {
        return p.x.toFixed(1) + ',' + p.y.toFixed(1);
      }).join(' ');

      var shape = svgUtil.el('polygon', {
        'class': 'cell-shape',
        'points': points
      });

      var text = svgUtil.el('text', {
        'class': 'cell-text',
        'x': cell.cx.toFixed(1),
        'y': cell.cy.toFixed(1),
        'font-size': svgUtil.fontSizeFor(cell.r * 2).toFixed(1),
        'fill': ctx.colors[i]
      });
      text.textContent = String(num);

      g.appendChild(shape);
      g.appendChild(text);
      frag.appendChild(g);
    });

    svg.appendChild(frag);
  }
