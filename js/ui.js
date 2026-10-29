/* ==========================================================================
 * ui.js —— 界面层：统计条、模式选择弹框、结果展示弹框
 *
 * 只负责 DOM 渲染与用户输入采集，游戏规则全部在 game.js 中：
 *   - renderStats(snap)：根据游戏状态快照刷新统计条；
 *   - openMode(config)：打开模式选择弹框，确认后通过 handlers.confirm 回传；
 *   - showResult(result)：游戏完成后展示成绩，关闭时通过 handlers.resultClosed
 *     通知入口层自动重开一局。
 * ========================================================================== */
import { SMALL_SCREEN_MAX_SIZE, SIZE_OPTIONS, TYPE_OPTIONS, isSmallScreen } from './config';

  export const ui = {
    // DOM 缓存
    els: {},
    // 外部注入的事件回调
    handlers: {},
    // 弹框内的临时选择（未点确定前不影响当局）
    _draft: { size: 4, type: 'classic' },
    // 上一次统计快照，用于判断数字是否需要跳字动画
    _prev: { correct: 0, wrong: 0, streak: 0 },

    /**
     * 缓存 DOM 并绑定按钮 / 遮罩 / 键盘事件（仅调用一次）。
     * @param {{confirm:function, restart:function, resultClosed:function}} handlers
     */
    init: function (handlers) {
      this.handlers = handlers;
      var $ = function (id) { return document.getElementById(id); };

      this.els = {
        time: $('statTime'),
        target: $('statTarget'),
        streak: $('statStreak'),
        correct: $('statCorrect'),
        wrong: $('statWrong'),
        timeCard: document.querySelector('.stat-card--accent'),
        hint: $('boardHint'),
        btnOpenMode: $('btnOpenMode'),
        btnRestart: $('btnRestart'),
        modeModal: $('modeModal'),
        resultModal: $('resultModal'),
        sizeOptions: $('sizeOptions'),
        sizeTip: $('sizeTip'),
        typeOptions: $('typeOptions'),
        btnModeCancel: $('btnModeCancel'),
        btnModeConfirm: $('btnModeConfirm'),
        resultSeconds: $('resultSeconds'),
        resultCorrect: $('resultCorrect'),
        resultWrong: $('resultWrong'),
        resultMaxStreak: $('resultMaxStreak'),
        btnPlayAgain: $('btnPlayAgain')
      };

      this.els.btnOpenMode.addEventListener('click', function () {
        // 当前配置由入口层提供，避免把点击事件对象误当作配置
        var cfg = this.handlers.getConfig && this.handlers.getConfig();
        if (cfg) this.openMode(cfg);
      }.bind(this));
      this.els.btnRestart.addEventListener('click', function () {
        this.handlers.restart && this.handlers.restart();
      }.bind(this));
      this.els.btnModeCancel.addEventListener('click', this.closeMode.bind(this));
      this.els.btnModeConfirm.addEventListener('click', this._confirmMode.bind(this));
      this.els.btnPlayAgain.addEventListener('click', this._closeResult.bind(this));

      // 点击两个弹框的遮罩空白处关闭（结果框关闭即自动重开）
      this.els.modeModal.addEventListener('click', function (e) {
        if (e.target === this.els.modeModal) this.closeMode();
      }.bind(this));
      this.els.resultModal.addEventListener('click', function (e) {
        if (e.target === this.els.resultModal) this._closeResult();
      }.bind(this));

      // Esc 关闭弹框
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          if (!this.els.resultModal.hidden) this._closeResult();
          else if (!this.els.modeModal.hidden) this.closeMode();
        }
      }.bind(this));
    },

    /* ------------------------------ 统计条 ------------------------------ */

    /**
     * 根据游戏快照刷新统计条。
     * @param {Object} s {elapsedMs,target,streak,correct,wrong,started,finished}
     */
    renderStats: function (s) {
      // 用时：进行中显示一位小数，结束后保留结束瞬间的值
      this.els.time.textContent = (s.elapsedMs / 1000).toFixed(1);
      this.els.target.textContent = s.finished ? '—' : s.target;
      this.els.streak.textContent = s.streak;
      this.els.correct.textContent = s.correct;
      this.els.wrong.textContent = s.wrong;

      // 正确 / 错误 / 连击数字变化时播放跳字动画
      this._bumpIf(this.els.correct, s.correct, this._prev.correct);
      this._bumpIf(this.els.wrong, s.wrong, this._prev.wrong);
      this._bumpIf(this.els.streak, s.streak, this._prev.streak);
      this._prev = { correct: s.correct, wrong: s.wrong, streak: s.streak };

      // 计时卡在进行中高亮
      this.els.timeCard.classList.toggle('is-running', s.started && !s.finished);
    },

    /** 数字变化时给元素加一次 bump 动画 @private */
    _bumpIf: function (el, now, before) {
      if (now !== before) {
        el.classList.remove('bump');
        void el.offsetWidth; // 强制重排以重启动画
        el.classList.add('bump');
      }
    },

    /** 显示/隐藏画板底部“点击数字 1 开始计时”的提示 */
    setHintHidden: function (hidden) {
      this.els.hint.classList.toggle('is-hidden', hidden);
    },

    /* ---------------------------- 模式选择弹框 ---------------------------- */

    /**
     * 打开模式选择弹框：以当前配置初始化单选项。
     * @param {{size:number, type:string}} config 当前生效配置
     */
    openMode: function (config) {
      this._draft = { size: config.size, type: config.type };

      var small = isSmallScreen();
      // 小屏设备：当前若处于 7×7 以上，选择项自动回落到 6×6
      if (small && this._draft.size > SMALL_SCREEN_MAX_SIZE) {
        this._draft.size = SMALL_SCREEN_MAX_SIZE;
      }

      this._renderSizeOptions(small);
      this._renderTypeOptions();
      this.els.sizeTip.hidden = !small;
      this.els.modeModal.hidden = false;
    },

    /** 关闭模式弹框（取消，不改变当局配置） */
    closeMode: function () {
      this.els.modeModal.hidden = true;
    },

    /**
     * 渲染“格子数量”单选项。
     * @param {boolean} small 是否小屏（7×7 及以上禁用）
     * @private
     */
    _renderSizeOptions: function (small) {
      this.els.sizeOptions.innerHTML = '';
      SIZE_OPTIONS.forEach(function (opt) {
        var disabled = small && opt.value > SMALL_SCREEN_MAX_SIZE;
        var label = this._makeRadio({
          name: 'opt-size',
          value: String(opt.value),
          text: opt.label + (disabled ? '（不支持）' : ''),
          checked: this._draft.size === opt.value,
          disabled: disabled
        });
        if (disabled) label.classList.add('is-disabled');
        this.els.sizeOptions.appendChild(label);
      }, this);
    },

    /** 渲染“方格类型”单选项 @private */
    _renderTypeOptions: function () {
      this.els.typeOptions.innerHTML = '';
      TYPE_OPTIONS.forEach(function (opt) {
        var label = this._makeRadio({
          name: 'opt-type',
          value: opt.value,
          text: opt.label,
          checked: this._draft.type === opt.value,
          disabled: false
        });
        this.els.typeOptions.appendChild(label);
      }, this);
    },

    /**
     * 生成一个自定义圆形 radio 选项：
     * <label class="opt-item"><input type="radio"><span class="radio-dot"></span>文字</label>
     * @private
     */
    _makeRadio: function (o) {
      var label = document.createElement('label');
      label.className = 'opt-item';

      var input = document.createElement('input');
      input.type = 'radio';
      input.name = o.name;
      input.value = o.value;
      input.checked = o.checked;
      input.disabled = o.disabled;

      var dot = document.createElement('span');
      dot.className = 'radio-dot';

      var text = document.createElement('span');
      text.textContent = o.text;

      label.appendChild(input);
      label.appendChild(dot);
      label.appendChild(text);

      // 选择变化时同步到临时草稿
      input.addEventListener('change', function () {
        if (o.name === 'opt-size') this._draft.size = parseInt(o.value, 10);
        else this._draft.type = o.value;
      }.bind(this));

      return label;
    },

    /** 点击“确定”：回传选择结果并关闭弹框 @private */
    _confirmMode: function () {
      this.closeMode();
      this.handlers.confirm && this.handlers.confirm({
        size: this._draft.size,
        type: this._draft.type
      });
    },

    /* ---------------------------- 结果展示弹框 ---------------------------- */

    /**
     * 展示本局结果。
     * @param {{seconds:number, correct:number, wrong:number, maxStreak:number}} result
     */
    showResult: function (result) {
      this.els.resultSeconds.textContent = result.seconds;
      this.els.resultCorrect.textContent = result.correct;
      this.els.resultWrong.textContent = result.wrong;
      this.els.resultMaxStreak.textContent = result.maxStreak;
      this.els.resultModal.hidden = false;
    },

    /** 关闭结果弹框并通知入口层按当前模式自动重开 @private */
    _closeResult: function () {
      if (this.els.resultModal.hidden) return;
      this.els.resultModal.hidden = true;
      this.handlers.resultClosed && this.handlers.resultClosed();
    }
  };
