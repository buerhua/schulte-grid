/* ==========================================================================
 * board-classic.js —— 经典方格渲染器
 *
 * 形态特征（对应参考稿第二张图）：
 *   - 严格的 n×n 正方形网格，白底、淡蒂芙尼青细分隔线、蒂芙尼蓝外框；
 *   - 每个格子是一个 <button>，数字用多色盘随机着色；
 *   - 字号通过容器查询单位 cqi 随格子尺寸自适应（见 CSS）。
 * ========================================================================== */
(function (global) {
  'use strict';

  var App = global.App;

  /**
   * 渲染经典方格。
   * @param {HTMLElement} container 画板容器
   * @param {number} count 格子总数（n²）
   * @param {{colors:string[]}} ctx 共享颜色上下文（按格子位置对应）
   */
  function renderClassic(container, count, ctx) {
    var n = Math.round(Math.sqrt(count));

    // 容器切换为经典网格皮肤，并把阶数写入 CSS 变量 --n
    container.classList.add('board--classic');
    container.style.setProperty('--n', n);

    // 使用 DocumentFragment 一次性插入，减少多次重排
    var frag = document.createDocumentFragment();

    // 数字 1..count 随机分布到各个格子
    var order = App.shuffle(App.range(count));
    var pos = 0;

    for (var row = 0; row < n; row++) {
      for (var col = 0; col < n; col++) {
        var num = order[pos];
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cell cell-classic';
        btn.dataset.num = num;
        btn.setAttribute('aria-label', '数字 ' + num);
        btn.style.color = ctx.colors[pos];
        btn.textContent = String(num);
        frag.appendChild(btn);
        pos++;
      }
    }

    container.appendChild(frag);
  }

  App.boards.register('classic', renderClassic);
})(window);
