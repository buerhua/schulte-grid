/* ==========================================================================
 * board-ring.js —— 圆环方格渲染器
 *
 * 形态特征（对应参考稿第六张图）：
 *   - 若干同心圆环，每一环再均分为多个扇区，扇区数由内向外递增
 *     （与周长成正比，保证每个格子面积接近）；
 *   - 用最大余数法把 n² 个格子分配到各环，例如 4×4 → 内环 6 格、外环 10 格；
 *   - 相邻环的分割线错开一个相位角，避免径向缝对齐；
 *   - 白底 + 墨绿青描边，中心留空。
 * ========================================================================== */
import { shuffle, range } from './config';
import { svgUtil} from './boards'

  var CENTER = 500;   // viewBox 中心
  var R_OUT = 472;    // 最外环外半径
  var R_IN = 120;     // 最内环内半径（中心留白）

  /**
   * 渲染圆环方格。
   * @param {HTMLElement} container 画板容器
   * @param {number} count 格子总数（n²）
   * @param {{colors:string[]}} ctx 共享颜色上下文
   */
  export function renderRing(container, count, ctx) {
    var svg = svgUtil.createSvg(container, 'skin-ring');

    // 1) 决定环数：阶数越高环数越多
    //    4×4→2 环（内 6 外 10，与参考稿一致），5~6→2~3 环，7×7→3 环，8~9→3 环
    var n = Math.round(Math.sqrt(count));
    var ringCount = Math.max(2, Math.round(n / 2.6));

    // 2) 环边界半径：用 0.85 次幂分布，让内环更厚实、便于点击
    var bounds = [R_IN];
    for (var k = 1; k <= ringCount; k++) {
      var t = k / ringCount;
      bounds.push(R_IN + (R_OUT - R_IN) * Math.pow(t, 0.85));
    }

    // 3) 按各环平均周长权重分配格子数（最大余数法保证总和恰为 count）
    var weights = [];
    var weightSum = 0;
    for (var r = 0; r < ringCount; r++) {
      var w = (bounds[r] + bounds[r + 1]) / 2; // 环中线半径 ∝ 平均周长
      weights.push(w);
      weightSum += w;
    }
    var sectors = allocateInteger(count, weights);

    // 4) 逐环逐扇区生成格子
    var order = shuffle(range(count));
    var frag = document.createDocumentFragment();
    var idx = 0;

    for (var ring = 0; ring < ringCount; ring++) {
      var m = sectors[ring];
      var r0 = bounds[ring];
      var r1 = bounds[ring + 1];
      var thickness = r1 - r0;
      var rMid = (r0 + r1) / 2;
      var step = Math.PI * 2 / m;
      // 相邻环错开相位，同时每环加一点点固定偏转避免竖缝对齐
      var phase = (ring % 2) * step * 0.5 + ring * 0.13;

      for (var j = 0; j < m; j++) {
        var num = order[idx];
        var a0 = phase + j * step;
        var a1 = a0 + step;

        var d = annularSectorPath(CENTER, CENTER, r0, r1, a0, a1);
        var g = svgUtil.el('g', { 'class': 'cell svg-cell', 'data-num': num });
        var shape = svgUtil.el('path', { 'class': 'cell-shape', 'd': d });

        // 数字落在扇区角平分线上的环中线位置
        var aMid = (a0 + a1) / 2;
        var tx = CENTER + rMid * Math.cos(aMid);
        var ty = CENTER + rMid * Math.sin(aMid);

        // 字号取“径向厚度”与“中线弧长”两者较小值的 42%
        var arcLen = rMid * step;
        var fontSize = svgUtil.fontSizeFor(Math.min(thickness, arcLen));

        var text = svgUtil.el('text', {
          'class': 'cell-text',
          'x': tx.toFixed(1),
          'y': ty.toFixed(1),
          'font-size': fontSize.toFixed(1),
          'fill': ctx.colors[idx]
        });
        text.textContent = String(num);

        g.appendChild(shape);
        g.appendChild(text);
        frag.appendChild(g);
        idx++;
      }
    }

    svg.appendChild(frag);
  }

  /**
   * 按权重把 total 个整数名额分配给各项（最大余数法）。
   * 例如 total=16、2 环权重 [300, 500] → [6, 10]。
   * @param {number} total 待分配总数
   * @param {number[]} weights 各项权重（正数）
   * @returns {number[]} 各项分得的整数名额
   * @private
   */
  function allocateInteger(total, weights) {
    var sum = weights.reduce(function (a, b) { return a + b; }, 0);
    var raw = weights.map(function (w) { return total * w / sum; });
    var result = raw.map(Math.floor);
    var assigned = result.reduce(function (a, b) { return a + b; }, 0);

    // 小数部分从大到小补齐剩余名额
    var remainders = raw.map(function (v, i) {
      return { i: i, frac: v - Math.floor(v) };
    }).sort(function (a, b) { return b.frac - a.frac; });

    for (var k = 0; k < total - assigned; k++) {
      result[remainders[k % remainders.length].i]++;
    }
    return result;
  }

  /**
   * 构造“环形扇区”（annular sector）的 SVG path：
   * 从内弧起点 → 外弧起点 → 外弧 → 外弧终点 → 内弧终点 → 内弧闭合。
   * @param {number} cx 圆心 x
   * @param {number} cy 圆心 y
   * @param {number} r0 内半径
   * @param {number} r1 外半径
   * @param {number} a0 起始角（弧度，0 指向右，顺时增长）
   * @param {number} a1 结束角
   * @returns {string} path d 属性
   * @private
   */
  function annularSectorPath(cx, cy, r0, r1, a0, a1) {
    var largeArc = (a1 - a0) > Math.PI ? 1 : 0;

    var p0 = { x: cx + r0 * Math.cos(a0), y: cy + r0 * Math.sin(a0) };
    var p1 = { x: cx + r1 * Math.cos(a0), y: cy + r1 * Math.sin(a0) };
    var p2 = { x: cx + r1 * Math.cos(a1), y: cy + r1 * Math.sin(a1) };
    var p3 = { x: cx + r0 * Math.cos(a1), y: cy + r0 * Math.sin(a1) };

    var f = function (p) { return p.x.toFixed(1) + ',' + p.y.toFixed(1); };

    return [
      'M' + f(p0),
      'L' + f(p1),
      'A' + r1.toFixed(1) + ',' + r1.toFixed(1) + ' 0 ' + largeArc + ' 1 ' + f(p2),
      'L' + f(p3),
      'A' + r0.toFixed(1) + ',' + r0.toFixed(1) + ' 0 ' + largeArc + ' 0 ' + f(p0),
      'Z'
    ].join('');
  }
