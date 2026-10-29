/* ==========================================================================
 * audio.js —— 音效播放器（移动端兼容增强版）
 *
 * 职责：
 *   1. 加载 assets/sounds/ding.wav（正确"叮"）与 dong.wav（错误"咚"）
 *   2. 用对象池保存多个 HTMLAudioElement，保证快速连点时音效可以重叠播放
 *   3. 移动端音频解锁：在首次用户交互时静音播放后暂停，解除浏览器限制
 *   4. 备用方案：若 HTMLAudio 持续失败，降级为 Web Audio API 合成简单音效
 *
 * 对外接口：
 *   audio.init()          —— 初始化音效池与解锁监听
 *   audio.play('ding' | 'dong')  —— 播放指定音效
 * ========================================================================== */

  // 每种音效保留的 Audio 实例数量（池大小）
  var POOL_SIZE = 5;

  // Web Audio API 上下文（备用方案）
  var audioCtx = null;

  export const audio = {
    _pools: { ding: [], dong: [] },
    _cursor: { ding: 0, dong: 0 },
    _unlocked: false,
    _useWebAudio: false,  // 是否降级为 Web Audio API

    /**
     * 初始化音效池与移动端解锁机制。
     * 必须在用户首次交互前调用，以便绑定解锁事件监听。
     */
    init: function () {
      this._fillPool('ding', 'assets/sounds/ding.wav');
      this._fillPool('dong', 'assets/sounds/dong.wav');

      // 尝试初始化 Web Audio API 作为备用
      try {
        var AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          audioCtx = new AudioContext();
        }
      } catch (e) {
        // Web Audio API 不可用，仅使用 HTMLAudio
      }

      // 移动端解锁：监听多种用户交互事件
      var unlockEvents = ['touchstart', 'touchend', 'mousedown', 'keydown', 'click'];
      var unlockHandler = function () {
        this._unlock();
        // 移除所有解锁监听
        unlockEvents.forEach(function (evt) {
          window.removeEventListener(evt, unlockHandler);
        });
      }.bind(this);

      // 绑定解锁事件（passive 以提升滚动性能）
      unlockEvents.forEach(function (evt) {
        window.addEventListener(evt, unlockHandler, { once: true, passive: true });
      });

      // 页面可见性变化时恢复音频上下文（移动端切后台后会挂起）
      document.addEventListener('visibilitychange', function () {
        if (!document.hidden && audioCtx && audioCtx.state === 'suspended') {
          audioCtx.resume();
        }
      });
    },

    /**
     * 执行音频解锁：静音播放所有音效后暂停。
     * @private
     */
    _unlock: function () {
      if (this._unlocked) return;
      this._unlocked = true;

      // 恢复 Web Audio 上下文（若被挂起）
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      // HTMLAudio 解锁：静音播放后暂停
      ['ding', 'dong'].forEach(function (name) {
        this._pools[name].forEach(function (a) {
          a.muted = true;
          a.play().then(function () {
            a.pause();
            a.currentTime = 0;
            a.muted = false;
          }).catch(function () {
            // 解锁失败，后续 play 时再尝试
          });
        });
      }, this);
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
        // 移动端优化：禁用默认控件、允许内联播放
        audio.controls = false;
        audio.setAttribute('playsinline', '');
        audio.setAttribute('webkit-playsinline', '');
        this._pools[name].push(audio);
      }
    },

    /**
     * 播放指定音效：轮询取池中实例，重置播放位置以支持重叠触发。
     * 若 HTMLAudio 持续失败，自动降级为 Web Audio API 合成音效。
     * @param {'ding'|'dong'} name 音效名称
     */
    play: function (name) {
      // 若已标记使用 Web Audio，直接合成
      if (this._useWebAudio) {
        this._playWebAudio(name);
        return;
      }

      var pool = this._pools[name];
      if (!pool || !pool.length) {
        this._playWebAudio(name);
        return;
      }

      var audio = pool[this._cursor[name] % pool.length];
      this._cursor[name]++;

      try {
        audio.currentTime = 0;
        var p = audio.play();
        if (p && typeof p.catch === 'function') {
          p.catch(function (err) {
            // 自动播放策略拦截或解码失败，尝试解锁后重试
            if (err && err.name === 'NotAllowedError') {
              // 强制解锁
              audio.muted = true;
              audio.play().then(function () {
                audio.pause();
                audio.currentTime = 0;
                audio.muted = false;
              }).catch(function () {
                // 仍失败，降级为 Web Audio
                this._useWebAudio = true;
                this._playWebAudio(name);
              }.bind(this));
            } else {
              // 其他错误，降级为 Web Audio
              this._useWebAudio = true;
              this._playWebAudio(name);
            }
          }.bind(this));
        }
      } catch (e) {
        // 极端情况抛错，降级为 Web Audio
        this._useWebAudio = true;
        this._playWebAudio(name);
      }
    },

    /**
     * 使用 Web Audio API 合成简单音效（备用方案）。
     * ding: 高频短促（800Hz, 0.15s）
     * dong: 低频沉闷（200Hz, 0.2s）
     * @param {'ding'|'dong'} name 音效名称
     * @private
     */
    _playWebAudio: function (name) {
      if (!audioCtx) return;

      // 确保上下文已恢复
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (name === 'ding') {
        osc.frequency.value = 800;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.15);
      } else {
        osc.frequency.value = 200;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.2);
      }
    }
  };
