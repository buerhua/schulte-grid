/* ==========================================================================
 * main.js —— 应用启动入口
 *
 * 负责：
 *   1. 初始化音效池、游戏核心与界面层；
 *   2. 串联事件：游戏统计 → 统计条；首次点击 → 隐藏提示；
 *      完成 → 结果弹框；结果弹框关闭 → 按当前模式自动重开；
 *   3. 首屏自动弹出模式选择（取消则使用默认 4×4 + 经典方格）；
 *   4. 监听视口变化（防抖），小屏状态变化时即时刷新弹框中的禁用选项。
 * ========================================================================== */
import { DEFAULT_CONFIG, SMALL_SCREEN_MAX_SIZE, isSmallScreen } from './config';
import { audio } from './audio';
import { boards } from './boards';
import { game } from './game';
import { ui } from './ui';

  function boot() {
    var boardEl = document.getElementById('board');

    // 当前生效配置：默认 4×4 + 经典方格（取消模式弹框时沿用）
    var currentConfig = {
      size: DEFAULT_CONFIG.size,
      type: DEFAULT_CONFIG.type,
    };

    /* ---------- 初始化各子系统 ---------- */
    audio.init();
    boards.init();
    game.init(boardEl);

    ui.init({
      // 模式弹框“确定”：应用新配置立即开一局
      confirm: function (config) {
        startGame(config);
      },
      // “重新开始”按钮：沿用当前配置
      restart: function () {
        startGame(currentConfig);
      },
      // 打开模式弹框时读取当前生效配置
      getConfig: function () {
        return currentConfig;
      },
      // 结果弹框关闭（按钮 / 遮罩 / Esc）：自动按当前模式重开
      resultClosed: function () {
        startGame(currentConfig);
      }
    });

    /* ---------- 订阅游戏事件 ---------- */
    game.on('stats', function (snap) {
      ui.renderStats(snap);
    });

    game.on('firstClick', function () {
      ui.setHintHidden(true);
    });

    game.on('finish', function (result) {
      ui.setHintHidden(true);
      ui.showResult(result);
    });

    /**
     * 按给定配置开启新局：小屏设备自动把阶数限制在 6×6 以内。
     * @param {{size:number, type:string}} config
     */
    function startGame(config) {
      var size = config.size;
      if (isSmallScreen() && size > SMALL_SCREEN_MAX_SIZE) {
        size = SMALL_SCREEN_MAX_SIZE;
      }
      currentConfig = { size: size, type: config.type };
      ui.setHintHidden(false);
      game.newGame(currentConfig);
    }

    /* ---------- 首屏：先用默认配置起局，再自动弹出模式选择 ---------- */
    startGame(currentConfig);
    ui.openMode(currentConfig);

    /* ---------- 视口变化：小屏判定改变时刷新弹框选项（300ms 防抖）---------- */
    var resizeTimer = 0;
    var wasSmall = isSmallScreen();
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        var small = isSmallScreen();
        if (small !== wasSmall) {
          wasSmall = small;
          // 若模式弹框正打开着，立即重绘禁用态
          var modeModal = document.getElementById('modeModal');
          if (modeModal && !modeModal.hidden) {
            ui.openMode(currentConfig);
          }
        }
      }, 300);
    });
    window.addEventListener('orientationchange', function () {
      // 横竖屏切换后延迟更久一点，等浏览器视口数据稳定
      setTimeout(function () {
        window.dispatchEvent(new Event('resize'));
      }, 200);
    });
  }

  // 脚本位于 body 末尾，DOM 已就绪；仍兜底 DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
