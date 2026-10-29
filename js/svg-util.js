/* ==========================================================================
 * svg-util.js —— SVG 共享工具（独立模块，避免循环依赖）
 *
 * 提供：
 *   1. 创建 SVG 容器（viewBox 1000x1000）
 *   2. 创建 SVG 命名空间元素
 *   3. 根据格子尺寸计算字号
 * ========================================================================== */

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var VIEW_SIZE = 1000;

  export const svgUtil = {
    NS: SVG_NS,
    VIEW: VIEW_SIZE,

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
     * 创建 SVG 容器并添加到目标容器。
     * @param {HTMLElement} container 父容器
     * @param {string} skinClass 皮肤类名（如 'skin-classic'）
     * @returns {SVGSVGElement}
     */
    createSvg: function (container, skinClass) {
      var svg = this.el('svg', {
        'viewBox': '0 0 ' + VIEW_SIZE + ' ' + VIEW_SIZE,
        'class': skinClass,
        'preserveAspectRatio': 'xMidYMid meet'
      });
      container.appendChild(svg);
      return svg;
    },

    /**
     * 根据格子等效直径计算字号（约占格子宽度的 42%）。
     * @param {number} cellDiameter 格子等效直径（viewBox 单位）
     * @returns {number} 字号
     */
    fontSizeFor: function (cellDiameter) {
      // 字号 = 直径 × 0.42，限制在 [28, 180] 范围内
      return Math.max(28, Math.min(180, cellDiameter * 0.42));
    }
  };
