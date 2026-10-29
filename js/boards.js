/* ==========================================================================
 * boards.js —— 方格渲染器注册表
 *
 * 五种方格形态（classic / irregular / cobble / honey / ring）各自有一个
 * 渲染器文件，并通过 boards.register 注册到这里。游戏核心逻辑只调用
 * 统一入口 boards.render(container, config)，不关心具体形态。
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
import { renderClassic } from './board-classic';
import { renderCobble } from './board-cobble';
import { renderHoney } from './board-honey';
import { renderIrregular } from './board-irregular';
import { renderRing } from './board-ring';

  export const boards = {
    _renderers: {},

    /**
     * 注册一个形态渲染器。
     * @param {string} type 形态 key（与 TYPE_OPTIONS 的 value 对应）
     * @param {function(HTMLElement, number, Object)} renderer 渲染函数
     */
    _register: function (type, renderer) {
      this._renderers[type] = renderer;
    },

    /**
     * 初始化渲染器注册
     */
    init() {
      this._register('classic', renderClassic);
      this._register('cobble', renderCobble);
      this._register('honey', renderHoney);
      this._register('irregular', renderIrregular);
      this._register('ring', renderRing);
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
