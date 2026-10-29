/* ==========================================================================
 * config.js —— 全局配置与通用工具
 *
 * 职责：
 *   1. 定义游戏可选项（格子数量 4×4 ~ 9×9、五种方格类型）
 *   2. 定义蒂芙尼蓝主题相关的色盘（数字多色盘、鹅卵石马卡龙盘）
 *   3. 提供小屏设备判定：可视区域最小物理宽高（CSS 像素 × DPR）< 600px
 *   4. 提供通用纯函数：洗牌 shuffle、区间随机 rand 等
 *
 * ========================================================================== */

  /* ------------------------------------------------------------------
  * 游戏可选项配置
  * ------------------------------------------------------------------ */

  // 格子数量候选：n×n，n 从 4 到 9
  export const SIZE_OPTIONS = [
    { label: '4×4', value: 4 },
    { label: '5×5', value: 5 },
    { label: '6×6', value: 6 },
    { label: '7×7', value: 7 },
    { label: '8×8', value: 8 },
    { label: '9×9', value: 9 }
  ];

  // 方格类型候选：key 与 boards.js 中注册的渲染器一一对应
  export const TYPE_OPTIONS = [
    { label: '经典方格', value: 'classic' },
    { label: '不规则',   value: 'irregular' },
    { label: '鹅卵石',   value: 'cobble' },
    { label: '蜂巢',     value: 'honey' },
    { label: '圆环',     value: 'ring' }
  ];

  // 默认配置（首屏取消模式弹框时使用）
  export const DEFAULT_CONFIG = { size: 4, type: 'classic' };

  // 小屏设备允许的最大阶数：当最小物理宽高 < 600px 时，7×7 及以上禁用
  export const SMALL_SCREEN_MAX_SIZE = 6;
  export const SMALL_SCREEN_PX = 600;

  /* ------------------------------------------------------------------
   * 主题色盘
   * ------------------------------------------------------------------ */

  // 数字多色盘：墨绿 / 朱红 / 宝蓝 / 赭橙 / 墨黑 / 酱紫（呼应参考稿）
  export const NUMBER_COLORS = [
    '#2E7D5B',
    '#C0392B',
    '#2F6FB2',
    '#D2691E',
    '#333333',
    '#8E44AD'
  ];

  // 鹅卵石填充马卡龙色盘：蜜桃 / 薰衣草 / 薄荷 / 奶油 / 樱粉 / 雾蓝
  export const PEBBLE_COLORS = [
    '#F7D9B5',
    '#DCD2F0',
    '#BEE8D2',
    '#F2E8B0',
    '#F6D7E3',
    '#C9DDF5'
  ];

  // 已找到格子的数字色（统一转为蒂芙尼深蓝，保证完成态一致）
  export const FOUND_COLOR = '#069691';

  /* ------------------------------------------------------------------
   * 设备与视口工具
   * ------------------------------------------------------------------ */

  /**
   * 判断当前设备可视区域是否属于“小屏”。
   *
   * 规则（按需求字面实现）：取可视区域宽、高中的较小值，
   * 换算为物理像素（CSS 像素 × devicePixelRatio）后与 600 比较。
   *
   * @returns {boolean} true 表示小屏，格子数量最大只能选 6×6
   */
  export const isSmallScreen = function () {
    var dpr = window.devicePixelRatio || 1;
    var physicalMin = Math.min(window.innerWidth || 0, window.innerHeight || 0) * dpr;
    return physicalMin < SMALL_SCREEN_PX;
  };

  /* ------------------------------------------------------------------
   * 通用工具函数
   * ------------------------------------------------------------------ */

  /**
   * Fisher–Yates 洗牌：返回乱序后的新数组，不修改原数组。
   * @template T
   * @param {T[]} arr 待洗牌数组
   * @returns {T[]} 乱序新数组
   */
  export const shuffle = function (arr) {
    var list = arr.slice();
    for (var i = list.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = list[i];
      list[i] = list[j];
      list[j] = tmp;
    }
    return list;
  };

  /**
   * 生成 [min, max) 区间内的随机浮点数。
   * @param {number} min 最小值（含）
   * @param {number} max 最大值（不含）
   * @returns {number}
   */
  export const rand = function (min, max) {
    return min + Math.random() * (max - min);
  };

  /**
   * 生成 [1, 2, ..., n] 的顺序数组（用于再洗牌得到数字分布）。
   * @param {number} n
   * @returns {number[]}
   */
  export const range = function (n) {
    var list = new Array(n);
    for (var i = 0; i < n; i++) list[i] = i + 1;
    return list;
  };

  /**
   * 将数值限制在 [min, max] 闭区间内。
   * @param {number} v
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  export const clamp = function (v, min, max) {
    return Math.min(max, Math.max(min, v));
  };
