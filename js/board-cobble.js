/* ==========================================================================
 * board-cobble.js —— 鹅卵石方格渲染器
 *
 * 形态特征（对应参考稿第四张图）：
 *   - 同样基于 Voronoi 分区，但每个多边形向自身重心收缩约 8%，形成缝隙；
 *   - 再用“中点二次贝塞尔”把尖角全部磨圆，变成鹅卵石般的圆润色块；
 *   - 填充马卡龙色盘（蜜桃/薰衣草/薄荷/奶油/樱粉/雾蓝），无描边。
 * ========================================================================== */
(function (global) {
  'use strict';

  var App = global.App;
  var U = App.SvgUtil;

  var SHRINK = 0.905; // 收缩系数：越小缝隙越大

  /**
   * 渲染鹅卵石方格。
   * @param {HTMLElement} container 画板容器
   * @param {number} count 格子总数
   * @param {{colors:string[], fillColors:string[]}} ctx 数字色与底色上下文
   */
  function renderCobble(container, count, ctx) {
    var svg = U.createSvg(container, 'skin-cobble');

    // 鹅卵石希望形状更随性一些，松弛 2 次保留自然差异
    var cells = App.voronoi.generate(count, 2);
    var order = App.shuffle(App.range(count));
    var frag = document.createDocumentFragment();

    cells.forEach(function (cell, i) {
      var num = order[i];

      // 1) 多边形顶点向重心收缩，拉出鹅卵石之间的缝隙
      var shrunk = cell.points.map(function (p) {
        return {
          x: cell.cx + (p.x - cell.cx) * SHRINK,
          y: cell.cy + (p.y - cell.cy) * SHRINK
        };
      });

      // 2) 中点二次贝塞尔平滑：以各顶点为控制点，相邻中点为起止点
      var d = smoothClosedPath(shrunk);

      var g = U.el('g', { 'class': 'cell svg-cell', 'data-num': num });

      var shape = U.el('path', {
        'class': 'cell-shape',
        'd': d,
        'fill': ctx.fillColors[i]
      });

      var text = U.el('text', {
        'class': 'cell-text',
        'x': cell.cx.toFixed(1),
        'y': cell.cy.toFixed(1),
        'font-size': U.fontSizeFor(cell.r * 2 * SHRINK).toFixed(1),
        'fill': ctx.colors[i]
      });
      text.textContent = String(num);

      g.appendChild(shape);
      g.appendChild(text);
      frag.appendChild(g);
    });

    svg.appendChild(frag);
  }

  /**
   * 把闭合点集转为平滑 path 数据：
   * 从最后一条边的中点起笔，每个顶点 v_i 作为二次贝塞尔控制点，
   * 曲线落于 v_i 与 v_{i+1} 的中点，形成无尖角的圆润闭合形状。
   * @param {Array<{x:number,y:number}>} pts 收缩后的多边形顶点
   * @returns {string} SVG path d 属性
   * @private
   */
  function smoothClosedPath(pts) {
    var len = pts.length;
    var mid = function (a, b) {
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    };

    var start = mid(pts[len - 1], pts[0]);
    var d = 'M' + start.x.toFixed(1) + ',' + start.y.toFixed(1);

    for (var i = 0; i < len; i++) {
      var v = pts[i];
      var next = pts[(i + 1) % len];
      var m = mid(v, next);
      d += 'Q' + v.x.toFixed(1) + ',' + v.y.toFixed(1) + ' ' +
            m.x.toFixed(1) + ',' + m.y.toFixed(1);
    }
    return d + 'Z';
  }

  App.boards.register('cobble', renderCobble);
})(window);
