/* ==========================================================================
 * board-honey.js —— 蜂巢方格渲染器
 *
 * 形态特征（对应参考稿第五张图）：
 *   - 尖角朝上（pointy-top）的正六边形；
 *   - 奇数行整体向右错开半个身位，形成蜂窝咬合；
 *   - 白底 + 墨绿青描边，共 n 行 × n 列 = n² 个格子。
 * ========================================================================== */
import { shuffle, range } from "./config";
import { svgUtil } from "./svg-util";

  var PAD = 34; // 适配 1000×1000 viewBox 时保留的内边距

  /**
   * 渲染蜂巢方格。
   * @param {HTMLElement} container 画板容器
   * @param {number} count 格子总数
   * @param {{colors:string[]}} ctx 共享颜色上下文
   */
  export function renderHoney(container, count, ctx) {
    var svg = svgUtil.createSvg(container, 'skin-honey');
    var n = Math.round(Math.sqrt(count));

    // ---- 第一步：在自然坐标（边长 s=1）中生成全部六边形中心点 ----
    var s = 1;
    var width = Math.sqrt(3) * s;   // 六边形宽
    var hSpace = width;             // 水平间距
    var vSpace = 1.5 * s;           // 垂直间距（3/4 高度）

    var centers = [];
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        centers.push({
          x: (r % 2 === 1 ? 0.75 * s : 0) + c * hSpace,
          y: r * vSpace
        });
      }
    }

    // ---- 第二步：计算包围盒并求统一缩放/平移参数 ----
    var allPts = [];
    centers.forEach(function (ct) {
      hexVertices(ct.x, ct.y, s).forEach(function (p) { allPts.push(p); });
    });
    var bbox = svgUtil.bboxOf(allPts);
    var w = bbox.maxX - bbox.minX;
    var h = bbox.maxY - bbox.minY;
    var scale = Math.min((svgUtil.VIEW - PAD * 2) / w, (svgUtil.VIEW - PAD * 2) / h);
    var ox = (svgUtil.VIEW - w * scale) / 2 - bbox.minX * scale;
    var oy = (svgUtil.VIEW - h * scale) / 2 - bbox.minY * scale;

    // 坐标变换：自然坐标 → viewBox 坐标
    var tx = function (p) {
      return { x: p.x * scale + ox, y: p.y * scale + oy };
    };

    // ---- 第三步：生成乱序数字并绘制 ----
    var order = shuffle(range(count));
    var frag = document.createDocumentFragment();

    centers.forEach(function (ct, i) {
      var num = order[i];
      var verts = hexVertices(ct.x, ct.y, s).map(tx);
      var ctv = tx(ct);

      var g = svgUtil.el('g', { 'class': 'cell svg-cell', 'data-num': num });

      var shape = svgUtil.el('polygon', {
        'class': 'cell-shape',
        'points': verts.map(function (p) {
          return p.x.toFixed(1) + ',' + p.y.toFixed(1);
        }).join(' ')
      });

      var text = svgUtil.el('text', {
        'class': 'cell-text',
        'x': ctv.x.toFixed(1),
        'y': ctv.y.toFixed(1),
        'font-size': (hSpace * scale * 0.42).toFixed(1),
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
   * 返回尖角朝上六边形的 6 个顶点（自然坐标）。
   * 顶点角度：-90°/-30°/30°/90°/150°/210°。
   * @param {number} cx 中心 x
   * @param {number} cy 中心 y
   * @param {number} s 六边形边长
   * @returns {Array<{x:number,y:number}>}
   * @private
   */
  function hexVertices(cx, cy, s) {
    var verts = [];
    for (var k = 0; k < 6; k++) {
      var angle = (-90 + k * 60) * Math.PI / 180;
      verts.push({
        x: cx + s * Math.cos(angle),
        y: cy + s * Math.sin(angle)
      });
    }
    return verts;
  }
