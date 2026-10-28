/* ==========================================================================
 * game.js —— 舒尔特方格游戏核心（状态机 + 判定 + 计时）
 *
 * 一局游戏的生命周期：
 *
 *   newGame(config)
 *       │  重置统计、渲染方格，等待首次点击
 *       ▼
 *   首次点击 ── 开始计时（rAF 循环刷新用时）
 *       │
 *       ▼
 *   每次点击格子
 *       ├─ 数字 === 下一个目标：播放“叮”，正确数 +1，连击 +1，格子置完成态
 *       └─ 其它情况：播放“咚”，错误数 +1，连击清零，格子短暂泛红抖动
 *       │
 *       ▼
 *   找完全部数字 → 停止计时，结果用时四舍五入到整数秒，触发 finish
 *
 * 与界面层完全解耦：通过 on(event, fn) 订阅 'stats' / 'firstClick' / 'finish'。
 * ========================================================================== */
(function (global) {
  'use strict';

  var App = global.App;

  var Game = {
    // 当前游戏配置与状态（newGame 时整体重置）
    config: null,
    state: null,
    boardEl: null,

    _listeners: {},      // 事件监听器表
    _rafId: 0,           // 计时刷新的 requestAnimationFrame 句柄
    _startAt: 0,         // 首次点击的时间戳（ms）
    _elapsed: 0,         // 本局已用时间（ms）

    /**
     * 绑定画板并挂载统一的点击事件委托。
     * 只需调用一次：因为后续重开只替换 board 内部 DOM，容器不变。
     * @param {HTMLElement} boardEl 画板容器 #board
     */
    init: function (boardEl) {
      this.boardEl = boardEl;

      // 事件委托：所有 .cell 的点击都在容器层统一处理
      boardEl.addEventListener('click', function (e) {
        var cell = e.target.closest('.cell');
        if (!cell || !boardEl.contains(cell)) return;
        var num = parseInt(cell.dataset.num, 10);
        if (!isNaN(num)) this.handleClick(num, cell);
      }.bind(this));
    },

    /**
     * 订阅游戏事件。
     * @param {'stats'|'firstClick'|'finish'} event 事件名
     * @param {function} fn 回调
     */
    on: function (event, fn) {
      (this._listeners[event] || (this._listeners[event] = [])).push(fn);
    },

    /** @private 触发事件 */
    _emit: function (event, payload) {
      (this._listeners[event] || []).forEach(function (fn) {
        try { fn(payload); } catch (err) { console.error(err); }
      });
    },

    /**
     * 按配置开启一局新游戏。
     * @param {{size:number, type:string}} config 阶数 n 与形态 type
     */
    newGame: function (config) {
      this._stopTimer();
      this.config = { size: config.size, type: config.type };

      var count = config.size * config.size;
      this.state = {
        total: count,
        target: 1,        // 下一个需要点击的数字
        correct: 0,       // 总正确次数
        wrong: 0,         // 总错误次数
        streak: 0,        // 当前连续正确步数
        maxStreak: 0,     // 本局最高连对
        started: false,   // 是否已首次点击
        finished: false,
        elapsedMs: 0      // 完成时的总用时（ms）
      };
      this._elapsed = 0;
      this._startAt = 0;

      // 颜色上下文：色盘循环取够 count 个后打乱位置顺序，
      // 由各渲染器在摆放数字时按“格子位置”取用。
      var ctx = {
        colors: App.shuffle(cyclePalette(App.NUMBER_COLORS, count)),
        fillColors: App.shuffle(cyclePalette(App.PEBBLE_COLORS, count))
      };

      App.boards.render(this.boardEl, this.config, ctx);
      this._emitStats();
    },

    /**
     * 处理一次格子点击（游戏判定的核心）。
     * @param {number} num 被点击的数字
     * @param {HTMLElement|SVGGElement} cell 被点击的格子根元素
     */
    handleClick: function (num, cell) {
      var st = this.state;
      if (!st || st.finished) return;
      if (cell.classList.contains('is-found')) return; // 已找到的格子不再响应

      // 首次有效点击：启动计时
      if (!st.started) {
        st.started = true;
        this._startTimer();
        this._emit('firstClick');
      }

      if (num === st.target) {
        this._onCorrect(num, cell);
      } else {
        this._onWrong(cell);
      }
    },

    /**
     * 正确点击：叮、连击累加、标记完成、推进目标；找完全部则结束。
     * @private
     */
    _onCorrect: function (num, cell) {
      var st = this.state;
      App.audio.play('ding');

      st.correct++;
      st.streak++;
      st.maxStreak = Math.max(st.maxStreak, st.streak);
      st.target++;

      // 弹跳反馈后保留安静的完成态（动画类在结束后移除，避免重复触发）
      cell.classList.add('is-correct');
      setTimeout(function () {
        cell.classList.remove('is-correct');
        cell.classList.add('is-found');
      }, 200);

      this._emitStats();

      if (st.correct >= st.total) {
        this._finish();
      }
    },

    /**
     * 错误点击：咚、连击清零、错误数 +1、格子抖动泛红。
     * @private
     */
    _onWrong: function (cell) {
      var st = this.state;
      App.audio.play('dong');

      st.wrong++;
      st.streak = 0;

      // 抖动 300ms 后移除反馈类（动画与 CSS @keyframes shake 对齐）
      cell.classList.remove('is-wrong');
      // 强制重排，保证连续点错时动画可以重新播放
      void (cell.getBoundingClientRect ? cell.getBoundingClientRect() : null);
      cell.classList.add('is-wrong');
      setTimeout(function () {
        cell.classList.remove('is-wrong');
      }, 320);

      this._emitStats();
    },

    /**
     * 全部点完：停表、封存结果并通知界面层弹结果框。
     * @private
     */
    _finish: function () {
      var st = this.state;
      st.finished = true;
      this._stopTimer();
      // 结束瞬间再采一次精确用时，避免落在两帧之间少算时间
      if (st.started && this._startAt) {
        this._elapsed = performance.now() - this._startAt;
        st.elapsedMs = this._elapsed;
      }

      this._emit('finish', {
        // 计时结果四舍五入到整数秒
        seconds: Math.round(st.elapsedMs / 1000),
        elapsedMs: st.elapsedMs,
        correct: st.correct,
        wrong: st.wrong,
        maxStreak: st.maxStreak,
        total: st.total
      });
    },

    /* ---------------- 计时器：rAF 驱动，约每帧刷新用时 ---------------- */

    /** @private */
    _startTimer: function () {
      this._startAt = performance.now();
      var tick = function () {
        this._elapsed = performance.now() - this._startAt;
        this.state.elapsedMs = this._elapsed;
        this._emitStats();
        if (!this.state.finished) {
          this._rafId = requestAnimationFrame(tick);
        }
      }.bind(this);
      this._rafId = requestAnimationFrame(tick);
    },

    /** @private */
    _stopTimer: function () {
      if (this._rafId) {
        cancelAnimationFrame(this._rafId);
        this._rafId = 0;
      }
    },

    /** @private 广播当前统计快照给界面层 */
    _emitStats: function () {
      var st = this.state;
      this._emit('stats', {
        elapsedMs: this._elapsed,
        target: st ? st.target : 1,
        streak: st ? st.streak : 0,
        maxStreak: st ? st.maxStreak : 0,
        correct: st ? st.correct : 0,
        wrong: st ? st.wrong : 0,
        started: st ? st.started : false,
        finished: st ? st.finished : false
      });
    }
  };

  /**
   * 把色盘循环取够 count 个颜色（不打乱，打乱交给调用方按需要处理）。
   * @param {string[]} palette 色盘
   * @param {number} count 需要的数量
   * @returns {string[]}
   * @private
   */
  function cyclePalette(palette, count) {
    var out = [];
    for (var i = 0; i < count; i++) {
      out.push(palette[i % palette.length]);
    }
    return out;
  }

  App.game = Game;
})(window);
