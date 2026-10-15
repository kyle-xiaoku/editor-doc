/* ==========================================================================
   KEditor 官网 · 在线试用页交互
   依赖 site.js 先创建好 window.__demo（同为 defer，按文档顺序执行）
   ========================================================================== */
(function () {
  'use strict';

  var $ = function (sel) { return document.querySelector(sel); };

  // 编辑器在 site.js 的 boot() 里同步创建，这里仍然等一下以防脚本顺序变动
  (function wait(tries) {
    if (window.__demo) return init(window.__demo);
    if (tries > 100) return;
    setTimeout(function () { wait(tries + 1); }, 60);
  })(0);

  function init(editor) {
    var output = $('#pg-output');
    var outputCode = $('#pg-output-code');
    var sample = window.__demoSample;

    function refresh() {
      if (!output || output.hidden || !outputCode) return;
      outputCode.textContent = editor.getHTML();
    }

    var sampleBtn = $('#pg-sample');
    if (sampleBtn && sample) {
      sampleBtn.addEventListener('click', function () {
        editor.setContent(sample);
        editor.focus();
        refresh();
      });
    }

    var clearBtn = $('#pg-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        editor.clear();
        editor.focus();
        refresh();
      });
    }

    var exportBtn = $('#pg-export');
    if (exportBtn) {
      exportBtn.addEventListener('click', function () {
        if (!output) return;
        output.hidden = false;
        refresh();
        output.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }

    editor.on('change', refresh);
  }
})();
