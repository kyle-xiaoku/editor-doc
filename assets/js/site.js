/* ==========================================================================
   KEditor 官网 · 交互脚本（零依赖，原生 DOM）
   包含：吸顶导航 / 移动端抽屉 / 代码复制 / 页签 / 滚动入场 /
        文档侧边栏与大纲自动生成 + 滚动高亮 / 首页实机演示
   ========================================================================== */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  /* ------------------------------------------------------------ 吸顶导航 -- */

  function initHeader() {
    var header = $('.site-header');
    if (!header) return;

    var onScroll = function () {
      header.classList.toggle('is-stuck', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* -------------------------------------------------------- 移动端抽屉 -- */

  function initDrawer() {
    var toggle = $('.nav-toggle');
    var drawer = $('#site-drawer');
    if (!toggle || !drawer) return;

    var setOpen = function (open) {
      drawer.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    };

    toggle.addEventListener('click', function () {
      setOpen(!drawer.classList.contains('is-open'));
    });

    drawer.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });

    document.addEventListener('click', function (e) {
      if (!drawer.classList.contains('is-open')) return;
      if (e.target.closest('#site-drawer, .nav-toggle')) return;
      setOpen(false);
    });
  }

  /* ------------------------------------------------------------ 代码复制 -- */

  function copyText(text) {
    var legacy = function () {
      return new Promise(function (resolve, reject) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '-1000px';
        document.body.appendChild(ta);
        ta.select();
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
        document.body.removeChild(ta);
        ok ? resolve() : reject(new Error('copy failed'));
      });
    };

    // 异步剪贴板 API 并不一定可用：非安全上下文（file:// 或 http 内网）没有它，
    // 被嵌在跨域 iframe 里、或文档未获得焦点时 writeText 也会 reject。
    // 所以失败后还要退回 execCommand，否则按钮只会显示「复制失败」。
    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(legacy);
    }
    return legacy();
  }

  function initCopy() {
    $$('.copy-btn').forEach(function (btn) {
      var label = btn.getAttribute('data-label') || btn.textContent.trim();

      btn.addEventListener('click', function () {
        var scope = btn.closest('.code-block') || btn.closest('.install-bar') || document;
        var source = $('code', scope) || $('pre', scope);
        var text = btn.getAttribute('data-copy');

        if (text == null) {
          text = (btn.closest('.install-bar') ? ($('.install-bar__cmd', scope) || source) : source);
          text = text ? text.textContent : '';
        }

        copyText(text.trim()).then(function () {
          btn.classList.add('is-done');
          btn.textContent = '已复制';
          setTimeout(function () {
            btn.classList.remove('is-done');
            btn.textContent = label;
          }, 1600);
        }).catch(function () {
          btn.textContent = '复制失败';
          setTimeout(function () { btn.textContent = label; }, 1600);
        });
      });
    });
  }

  /* --------------------------------------------------------------- 页签 -- */

  function initTabs() {
    $$('[data-tabs]').forEach(function (wrap) {
      var btns = $$('[role="tab"]', wrap);
      var panels = $$('[role="tabpanel"]', wrap);
      if (!btns.length) return;

      var select = function (index) {
        btns.forEach(function (b, i) {
          var on = i === index;
          b.setAttribute('aria-selected', String(on));
          b.tabIndex = on ? 0 : -1;
        });
        panels.forEach(function (p, i) {
          if (i === index) p.removeAttribute('hidden');
          else p.setAttribute('hidden', '');
        });
      };

      btns.forEach(function (btn, i) {
        btn.addEventListener('click', function () { select(i); });
        btn.addEventListener('keydown', function (e) {
          var delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
          if (!delta) return;
          e.preventDefault();
          var next = (i + delta + btns.length) % btns.length;
          btns[next].focus();
          select(next);
        });
      });
    });
  }

  /* ----------------------------------------------------------- 滚动入场 -- */

  function initReveal() {
    var items = $$('.reveal');
    if (!items.length) return;

    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.06 });

    items.forEach(function (el) { io.observe(el); });
  }

  /* --------------------------------------------------- 文档标题 id 生成 -- */

  function slugify(text, index) {
    var slug = text
      .trim()
      .toLowerCase()
      .replace(/[\s\u3000]+/g, '-')
      .replace(/[^\w\u4e00-\u9fa5-]/g, '')
      .replace(/-{2,}/g, '-')
      .replace(/^-|-$/g, '');
    return slug || 'section-' + (index + 1);
  }

  function initDocHeadings() {
    var body = $('.doc-body');
    if (!body) return [];

    var used = Object.create(null);
    var heads = $$('h2, h3', body).filter(function (h) {
      return !h.hasAttribute('data-no-anchor');
    });

    heads.forEach(function (h, i) {
      if (!h.id) {
        var base = slugify(h.textContent, i);
        var id = base;
        var n = 2;
        while (used[id]) { id = base + '-' + n++; }
        used[id] = true;
        h.id = id;
      } else {
        used[h.id] = true;
      }
    });

    return heads;
  }

  /* -------------------------------------------------- 侧边栏 / 大纲构建 -- */

  function initDocNav(heads) {
    if (!heads.length) return;

    var items = heads.map(function (h) {
      var clone = h.cloneNode(true);
      $$('.anchor, .doc-anchor', clone).forEach(function (a) { a.remove(); });
      return {
        id: h.id,
        text: clone.textContent.trim(),
        level: h.tagName === 'H2' ? 2 : 3
      };
    });

    // 移动端横向导航
    var mobile = $('#doc-mobile-nav');
    if (mobile) {
      var frag = document.createDocumentFragment();
      items.forEach(function (it) {
        var a = document.createElement('a');
        a.href = '#' + it.id;
        a.textContent = it.text;
        frag.appendChild(a);
      });
      mobile.appendChild(frag);
    }

    // 右侧大纲（只取二级标题）
    var outline = $('#doc-outline');
    if (outline) {
      var list = document.createElement('ul');
      items.forEach(function (it) {
        var li = document.createElement('li');
        li.className = 'lvl-' + it.level;
        var a = document.createElement('a');
        a.href = '#' + it.id;
        a.textContent = it.text;
        li.appendChild(a);
        list.appendChild(li);
      });
      var box = document.createElement('div');
      box.className = 'doc-outline__title';
      box.textContent = '本页目录';
      outline.appendChild(box);
      outline.appendChild(list);
    }

    // 滚动高亮。侧边栏与移动端导航是「分区级」目录（只有 h2），
    // 右侧大纲是「精确级」（h2 + h3）。如果统一按精确 id 匹配，
    // 滚到某个 h3 时侧边栏会因为找不到对应链接而整个失去高亮 —— 
    // 所以给每个标题记录它所属的分区 id。
    var sectionOf = Object.create(null);
    var section = '';
    items.forEach(function (it) {
      if (it.level === 2) section = it.id;
      sectionOf[it.id] = section || it.id;
    });

    var links = $$('#doc-mobile-nav a, #doc-outline a, .doc-nav a');
    if (!links.length) return;

    var mark = function (id) {
      var inSection = sectionOf[id] || id;
      links.forEach(function (a) {
        var href = a.getAttribute('href');
        var on = a.closest('.doc-outline')
          ? href === '#' + id
          : href === '#' + inSection;
        a.classList.toggle('is-active', on);
      });
    };

    if (!('IntersectionObserver' in window)) return;

    var visible = [];
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var id = entry.target.id;
        var i = visible.indexOf(id);
        if (entry.isIntersecting && i === -1) visible.push(id);
        if (!entry.isIntersecting && i !== -1) visible.splice(i, 1);
      });

      // 取当前可视区最靠上的标题
      var first = null;
      var best = Infinity;
      visible.forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        var top = el.getBoundingClientRect().top;
        if (top < best) { best = top; first = id; }
      });
      if (first) mark(first);
    }, { rootMargin: '-70px 0px -70% 0px', threshold: 0 });

    heads.forEach(function (h) { io.observe(h); });
  }

  /* ---------------------------------------------------------- 实机演示 -- */

  var SAMPLE = [
    '<h2>公众号排版，开箱即用</h2>',
    '<p>这是一段<strong>正文示例</strong>：改动、编辑、加粗、上色 —— 甚至直接<strong>把图片拖进来</strong>，都会立刻生效。</p>',
    '<blockquote><p>左侧工具栏都是真的：段落样式、字号、颜色、表格、链接、代码块、导入 Markdown。</p></blockquote>',
    '<ul><li><strong>20 种语言</strong>的代码块，可选语言并语法高亮</li>',
    '<li>导入 <code>.md</code> 文件或粘贴 Markdown 文本，实时预览后落位</li>',
    '<li>图片 / 视频走上传，小文件整包、大文件自动分片并发</li></ul>',
    '<pre data-k-lang="javascript"><code class="language-javascript">const editor = KEditor.create(\'#editor\', {',
    '  primaryColor: \'#07c160\',   // 主题色',
    '  paperWidth: 677,            // 公众号版心',
    '})',
    '',
    'editor.on(\'change\', ({ html }) => save(html))</code></pre>',
    '<p>试试工具栏最右侧的「<strong>导入MD</strong>」「<strong>源码</strong>」「<strong>全屏</strong>」。</p>'
  ].join('\n');

  function initPlayground() {
    var mount = $('#playground-editor');
    if (!mount) return;

    var fallback = $('#playground-fallback');

    if (!window.KEditor) {
      if (fallback) fallback.removeAttribute('hidden');
      return;
    }

    try {
      window.__demo = window.KEditor.create(mount, {
        value: SAMPLE,
        placeholder: '在这里写点什么…',
        primaryColor: '#07c160',
        height: Number(mount.getAttribute('data-height')) || (window.innerWidth < 700 ? 320 : 400),
        paperWidth: 677,
        paperGap: 20,
        uploader: 'mock',
        chunkUploader: 'mock',
        code: { defaultLanguage: 'javascript' },
        markdown: { insertMode: 'replace' },
        wordCount: true
      });
      window.__demoSample = SAMPLE;
    } catch (err) {
      if (fallback) {
        fallback.removeAttribute('hidden');
        fallback.textContent = '演示编辑器初始化失败：' + (err && err.message ? err.message : err);
      }
    }
  }

  /* ---------------------------------------------------------------- 启动 -- */

  function boot() {
    initHeader();
    initDrawer();
    initCopy();
    initTabs();
    initReveal();
    initPlayground();

    var heads = initDocHeadings();
    initDocNav(heads);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
