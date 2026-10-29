/* ==========================================================================
 * audio.js —— 音效播放器
 *
 * 职责：
 *   1. 加载 assets/sounds/ding.wav（正确“叮”）与 dong.wav（错误“咚”）
 *   2. 用对象池保存多个 HTMLAudioElement，保证快速连点时音效可以重叠播放
 *   3. 首次用户点击前浏览器可能阻止音频，play() 失败时静默降级（不影响游戏）
 *
 * 对外接口：
 *   audio.play('ding' | 'dong')
 * ========================================================================== */
  // 每种音效保留的 Audio 实例数量（池大小）
  var POOL_SIZE = 5;

  export const audio = {
    _pools: { ding: [], dong: [] },
    _cursor: { ding: 0, dong: 0 },

    /**
     * 初始化音效池：为每种音效预创建若干 Audio 实例。
     * 静态资源路径相对站点根目录，file:// 直开亦可正常加载。
     */
    init: function () {
      this._fillPool('ding', 'assets/sounds/ding.wav');
      this._fillPool('dong', 'assets/sounds/dong.wav');

      // iOS Safari 需要在首次触摸时“解锁”音频：在一次性事件中静音播放后暂停
      var unlock = function () {
        ['ding', 'dong'].forEach(function (name) {
          this._pools[name].forEach(function (a) {
            a.muted = true;
            a.play().then(function () {
              a.pause();
              a.currentTime = 0;
              a.muted = false;
            }).catch(function () { /* 忽略解锁失败 */ });
          }, this);
        }, this);
        window.removeEventListener('touchstart', unlock);
        window.removeEventListener('pointerdown', unlock);
      }.bind(this);
      window.addEventListener('touchstart', unlock, { once: true, passive: true });
      window.addEventListener('pointerdown', unlock, { once: true, passive: true });
    },

    /**
     * 填充单个音效池。
     * @param {string} name 音效名称
     * @param {string} src 音频文件地址
     * @private
     */
    _fillPool: function (name, src) {
      for (var i = 0; i < POOL_SIZE; i++) {
        var audio = new Audio(src);
        audio.preload = 'auto';
        this._pools[name].push(audio);
      }
    },

    /**
     * 播放指定音效：轮询取池中实例，重置播放位置以支持重叠触发。
     * @param {'ding'|'dong'} name 音效名称
     */
    play: function (name) {
      var pool = this._pools[name];
      if (!pool || !pool.length) return;
      var audio = pool[this._cursor[name] % pool.length];
      this._cursor[name]++;
      try {
        audio.currentTime = 0;
        var p = audio.play();
        if (p && typeof p.catch === 'function') {
          p.catch(function () { /* 自动播放策略拦截时静默处理 */ });
        }
      } catch (e) {
        // 个别浏览器在极端情况下抛错，同样静默降级
      }
    }
  };
