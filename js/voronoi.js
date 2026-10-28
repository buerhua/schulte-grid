/* ==========================================================================
 * voronoi.js —— Voronoi（泰森多边形）几何工具
 *
 * “不规则”与“鹅卵石”两种方格都需要一组大小相近、形状随机且无缝铺满
 * 画板的多边形。这里用经典做法实现：
 *
 *   1. 在正方形区域内随机撒 count 个种子点；
 *   2. 每个种子点的势力范围 = 画布矩形与“所有相邻半平面”的交集
 *      （半平面裁切，Sutherland–Hodgman 算法）；
 *   3. 用 Lloyd 松弛迭代（把种子移动到当前多边形重心）让面积更均匀，
 *      避免出现过于细长、难以点击的格子。
 *
 * 输出坐标统一在 0 ~ VIEW 单位的虚拟画布中，渲染端再映射到 SVG viewBox。
 *
 * 对外接口：
 *   App.voronoi.generate(count, relaxTimes) -> [{ points, cx, cy, r }]
 * ========================================================================== */
(function (global) {
  'use strict';

  var App = global.App;

  var VIEW = 1000;          // 虚拟画布边长
  var MARGIN = 34;          // 种子点安全边距，保证边缘格子不至于太碎

  /**
   * 生成一组铺满正方形的 Voronoi 单元格。
   * @param {number} count 格子数量
   * @param {number} [relaxTimes=3] Lloyd 松弛迭代次数（越多越均匀、越不“随机”）
   * @returns {Array<{points:Array<{x:number,y:number}>, cx:number, cy:number, r:number}>}
   *          每个元素含多边形顶点 points、重心 cx/cy、面积等效半径 r
   */
  function generate(count, relaxTimes) {
    if (relaxTimes == null) relaxTimes = 3;

    // 1. 初始随机种子（带安全边距）
    var seeds = [];
    for (var i = 0; i < count; i++) {
      seeds.push({
        x: App.rand(MARGIN, VIEW - MARGIN),
        y: App.rand(MARGIN, VIEW - MARGIN)
      });
    }

    // 2. 迭代：计算势力范围 → 用重心更新种子（Lloyd 松弛）
    var cells = [];
    for (var iter = 0; iter < relaxTimes; iter++) {
      cells = seeds.map(function (_, idx) {
        return cellOf(idx, seeds);
      });
      seeds = cells.map(function (poly) {
        var c = centroid(poly);
        // 最后一次迭代不再需要更新种子
        return { x: c.x, y: c.y };
      });
    }

    // 3. 最终再计算一次多边形，并附带重心与等效半径
    return seeds.map(function (_, idx) {
      var poly = cellOf(idx, seeds);
      var c = centroid(poly);
      var area = polygonArea(poly);
      return {
        points: poly,
        cx: c.x,
        cy: c.y,
        r: Math.sqrt(Math.abs(area) / Math.PI)
      };
    });
  }

  /**
   * 计算第 index 个种子的 Voronoi 多边形：
   * 从整个画布矩形开始，依次用与其它每个种子的垂直平分半平面进行裁切。
   * @param {number} index 目标种子下标
   * @param {Array<{x:number,y:number}>} seeds 全部种子
   * @returns {Array<{x:number,y:number}>} 凸多边形顶点（顺时针）
   * @private
   */
  function cellOf(index, seeds) {
    var a = seeds[index];
    // 初始多边形 = 完整画布矩形
    var poly = [
      { x: 0,    y: 0 },
      { x: VIEW, y: 0 },
      { x: VIEW, y: VIEW },
      { x: 0,    y: VIEW }
    ];

    for (var j = 0; j < seeds.length; j++) {
      if (j === index) continue;
      poly = clipByBisector(poly, a, seeds[j]);
      if (poly.length < 3) break; // 理论上不会发生，保险兜底
    }
    return poly;
  }

  /**
   * Sutherland–Hodgman：用“a、b 两点的垂直平分半平面”裁切凸多边形，
   * 保留距离 a 更近（即 (b-a)·(p-a) ≤ |b-a|²/2）的一侧。
   * @private
   */
  function clipByBisector(poly, a, b) {
    var out = [];
    var dx = b.x - a.x;
    var dy = b.y - a.y;
    var half = (dx * dx + dy * dy) / 2;

    // 点 p 在保留侧时返回 true
    function inside(p) {
      return dx * (p.x - a.x) + dy * (p.y - a.y) <= half;
    }

    // 线段 p→q 与平分线的交点
    function intersect(p, q) {
      var px = q.x - p.x;
      var py = q.y - p.y;
      // 求 t：dx*(p + t*d - a)·... = half
      var t = (half - (dx * (p.x - a.x) + dy * (p.y - a.y))) /
              (dx * px + dy * py);
      return { x: p.x + px * t, y: p.y + py * t };
    }

    for (var i = 0; i < poly.length; i++) {
      var cur = poly[i];
      var prev = poly[(i - 1 + poly.length) % poly.length];
      var curIn = inside(cur);
      var preIn = inside(prev);

      if (curIn) {
        if (!preIn) out.push(intersect(prev, cur)); // 外 → 内：先加交点
        out.push(cur);
      } else if (preIn) {
        out.push(intersect(prev, cur));             // 内 → 外：加交点
      }
    }
    return out;
  }

  /**
   * 多边形面积（鞋带公式）。
   * @private
   */
  function polygonArea(poly) {
    var s = 0;
    for (var i = 0; i < poly.length; i++) {
      var p = poly[i];
      var q = poly[(i + 1) % poly.length];
      s += p.x * q.y - q.x * p.y;
    }
    return s / 2;
  }

  /**
   * 多边形重心（以面积加权的顶点平均）。
   * @private
   */
  function centroid(poly) {
    var area = polygonArea(poly);
    if (Math.abs(area) < 1e-6) {
      // 退化兜底：直接取顶点平均
      var ax = 0, ay = 0;
      poly.forEach(function (p) { ax += p.x; ay += p.y; });
      return { x: ax / poly.length, y: ay / poly.length };
    }
    var cx = 0, cy = 0;
    for (var i = 0; i < poly.length; i++) {
      var p = poly[i];
      var q = poly[(i + 1) % poly.length];
      var cross = p.x * q.y - q.x * p.y;
      cx += (p.x + q.x) * cross;
      cy += (p.y + q.y) * cross;
    }
    return { x: cx / (6 * area), y: cy / (6 * area) };
  }

  App.voronoi = {
    VIEW: VIEW,
    generate: generate
  };
})(window);
