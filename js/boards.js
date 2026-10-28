/* ==========================================================================
 * boards.js —— 方格渲染器注册表与共享工具
 *
 * 五种方格形态（classic / irregular / cobble / honey / ring）各自有一个
 * 渲染器文件，并通过 App.boards.register 注册到这里。游戏核心逻辑只调用
 * 统一入口 App.boards.render(container, config)，不关心具体形态。
 *
 * 渲染契约（每个形态渲染器都遵守）：
 *   render(container, count, ctx)
 *     - 只负责把 count 个可点击格子画进 container；
 *     - 每个可点击根元素必须带 class="cell" 与 data-num（数字值 1..count）；
 *     - 返回值不需要，状态标记由 game.js 通过 class 控制。
 *
 * ctx 共享上下文包含：
 *   colors: 每个格子的数字颜色（长度 = count，已随数字位置打乱）
 *   fillColors: 鹅卵石等需要底色时使用的填充色数组
 * ========================================================================== */
(function (global) {
  'use strict';

  var App = global.App;
  var SVG_NS = 'http://www.w3.org/2000/svg';

  var Boards = {
    _renderers: {},

    /**
     * 注册一个形态渲染器。
     * @param {string} type 形态 key（与 TYPE_OPTIONS 的 value 对应）
     * @param {function(HTMLElement, number, Object)} renderer 渲染函数
     */
    register: function (type, renderer) {
      this._renderers[type] = renderer;
    },

    /**
     * 按当前配置渲染一版方格。
     * @param {HTMLElement} container 画板容器 #board
     * @param {{size:number, type:string}} config 游戏配置
     * @param {Object} ctx 颜色等共享上下文
     */
    render: function (container, config, ctx) {
      var renderer = this._renderers[config.type];
      container.innerHTML = '';
      container.className = 'board';
      if (!renderer) {
        throw new Error('未注册的方格类型：' + config.type);
      }
      renderer(container, config.size * config.size, ctx);
    }
  };

  /* ------------------------------------------------------------------
   * SVG 共享工具：供不规则 / 鹅卵石 / 蜂巢 / 圆环四种形态复用
   * ------------------------------------------------------------------ */

  var SvgUtil = {
    NS: SVG_NS,
    VIEW: 1000,

    /** 创建 SVG 命名空间元素 */
    el: function (tag, attrs) {
      var node = document.createElementNS(SVG_NS, tag);
      if (attrs) {
        Object.keys(attrs).forEach(function (k) {
          node.setAttribute(k, attrs[k]);
        });
      }
      return node;
    },

    /**
     * 创建一个带数字文本的可点击格子组：
     * <g class="cell svg-cell" data-num="x">
     *   <path/polygon class="cell-shape"> ...
     *   <text class="cell-text">x</text>
     * </g>
     * @returns {SVGGElement}
     */
    createCell: function (num, x, y, fontSize, fillColor) {
      var g = this.el('g', { 'class': 'cell svg-cell', 'data-num': num });
      var text = this.el('text', {
        'class': 'cell-text',
        'x': x.toFixed(2),
        'y': y.toFixed(2),
        'font-size': fontSize.toFixed(1),
        'fill': fillColor || App.NUMBER_COLORS[(num - 1) % App.NUMBER_COLORS.length]
      });
      text.textContent = String(num);
      g._cellText = text;   // 暂存，等形状构造完再统一 append
      return g;
    },

    /**
     * 创建一个 1000×1000 的基础 svg 画布并挂上皮肤 class。
     * @param {HTMLElement} container 容器
     * @param {string} skinClass 皮肤 class（skin-irregular / skin-honey / ...）
     * @returns {SVGSVGElement}
     */
    createSvg: function (container, skinClass) {
      container.classList.add('board--svg', skinClass);
      var svg = this.el('svg', {
        viewBox: '0 0 1000 1000',
        role: 'img'
      });
      container.appendChild(svg);
      return svg;
    },

    /**
     * 依据“外接参考尺寸”计算格子数字字号。
     * 目标：数字约占格子宽度的 42%，并限制上下限保证 9×9 不挤、4×4 不憨。
     * @param {number} ref 格子参考边长（如多边形等效直径、六边形宽、扇区弧长）
     * @returns {number}
     */
    fontSizeFor: function (ref) {
      return App.clamp(ref * 0.42, 30, 150);
    },

    /**
     * 将一组点从原包围盒等比缩放平移进 viewBox 的内框（保持比例居中）。
     * 用于蜂巢等先在“自然坐标”里生成、再统一适配画布的形态。
     * @param {Array<{x:number,y:number}>} pts
     * @param {{minX:number,minY:number,maxX:number,maxY:number}} bbox
     * @param {number} [pad=30] 内框边距
     * @returns {Array<{x:number,y:number}>}
     */
    fitPoints: function (pts, bbox, pad) {
      if (pad == null) pad = 30;
      var w = bbox.maxX - bbox.minX;
      var h = bbox.maxY - bbox.minY;
      var scale = Math.min((this.VIEW - pad * 2) / w, (this.VIEW - pad * 2) / h);
      var usedW = w * scale;
      var usedH = h * scale;
      var ox = (this.VIEW - usedW) / 2 - bbox.minX * scale;
      var oy = (this.VIEW - usedH) / 2 - bbox.minY * scale;
      return pts.map(function (p) {
        return { x: p.x * scale + ox, y: p.y * scale + oy };
      });
    },

    /**
     * 计算点集包围盒。
     * @param {Array<{x:number,y:number}>} pts
     * @returns {{minX:number,minY:number,maxX:number,maxY:number}}
     */
    bboxOf: function (pts) {
      var bbox = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
      pts.forEach(function (p) {
        bbox.minX = Math.min(bbox.minX, p.x);
        bbox.minY = Math.min(bbox.minY, p.y);
        bbox.maxX = Math.max(bbox.maxX, p.x);
        bbox.maxY = Math.max(bbox.maxY, p.y);
      });
      return bbox;
    }
  };

  App.boards = Boards;
  App.SvgUtil = SvgUtil;
})(window);
