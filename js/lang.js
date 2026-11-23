// 同温层 · 语言：?lang=en / ?lang=zh 优先，其次记在本机的 tw_lang，默认中文
(function () {
  const q = new URLSearchParams(location.search).get('lang');
  let l = q || (function () { try { return localStorage.getItem('tw_lang'); } catch (e) { return null; } })() || 'zh';
  if (l !== 'en') l = 'zh';
  try { localStorage.setItem('tw_lang', l); } catch (e) {}
  window.TW_LANG = l;
  window.L = (zh, en) => (l === 'en' ? en : zh);
  const inFrame = window.parent !== window;
  // 全站只有一种看法：往下滑。单独打开站里任何一页，都送进滑动站、停在这一页（加 ?solo 可以单独看）
  const SITE = ['首页.html', '关于_情绪劳动.html', '数据_九十三种温度.html', '办公桌_新布景_轮廓.html', '茶水间_新布景_轮廓.html', '小桌_新布景_轮廓.html', '热像镜子.html'];
  const me = decodeURIComponent(location.pathname.split('/').pop());
  if (!inFrame && SITE.includes(me)) {
    const sp = new URLSearchParams(location.search);
    if (!sp.has('solo')) { sp.delete('lang'); const q = sp.toString();
      location.replace('./网站_滑动版.html?p=' + encodeURIComponent(me + (q ? '?' + q : ''))); }
  }
  window.TW_IN_FRAME = inFrame;
  if (inFrame) document.documentElement.classList.add('inframe');   // 在滑动站里：logo 和导航由外层统一给，各页自己的藏起来
  window.setLang = v => { try { localStorage.setItem('tw_lang', v); } catch (e) {}
    if (inFrame) { window.parent.postMessage({ tw: 'lang', v }, '*'); return; }
    const u = new URL(location.href); u.searchParams.set('lang', v); location.href = u.toString(); };
  if (inFrame) {
    // 页面自己滚到头了（或者根本不滚），再往下/往上滑，就交给外层翻到下一屏/上一屏
    const atEdge = dy => { const se = document.scrollingElement || document.documentElement;
      if (se.scrollHeight <= innerHeight + 2) return true;
      return dy > 0 ? se.scrollTop + innerHeight >= se.scrollHeight - 2 : se.scrollTop <= 1; };
    // 到头了：这一下交给外层（外层按自己的节奏滚、管阻尼），并且不让浏览器顺手把外层也直接滚了
    // 手指/滚轮下面有自己能滚的一块（比如手机上问卷的题目栏）、而且它还没滚到头：让它自己滚
    const inner = (el, dy) => { for (; el && el !== document.body && el.nodeType === 1; el = el.parentElement) {
      const cs = getComputedStyle(el); if (!/(auto|scroll)/.test(cs.overflowY) || el.scrollHeight <= el.clientHeight + 2) continue;
      if (dy > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 2 : el.scrollTop > 1) return true; } return false; };
    addEventListener('wheel', e => { if (!atEdge(e.deltaY) || inner(e.target, e.deltaY)) return; e.preventDefault();
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * innerHeight : e.deltaY;
      window.parent.postMessage({ tw: 'wheel', dy }, '*'); }, { passive: false });
    // 触屏：手指在页面上拖，页面自己滚不动时，把每一小段移动都交给外层（和滚轮一样），
    // 并且挡住浏览器"顺手直接滚外层"——不挡的话外层的阻尼会一直把它拉回来，看起来就是来回抖。松手时带一点惯性。
    let ty = null, tEl = null, vy = 0, lt = 0;
    const scroller = el => { for (; el && el !== document.body && el.nodeType === 1; el = el.parentElement) { const cs = getComputedStyle(el);
      if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 2) return el; } return null; };
    addEventListener('touchstart', e => { if (e.touches.length > 1) { ty = null; return; } ty = e.touches[0].clientY; tEl = scroller(e.target); vy = 0; lt = performance.now(); }, { passive: true });
    addEventListener('touchmove', e => {
      if (ty == null || e.touches.length > 1) return;
      const y = e.touches[0].clientY, dy = ty - y; ty = y;
      if (tEl && inner(tEl, dy)) return;                                  // 题目栏之类还能滚：让它自己滚
      if (!atEdge(dy)) return;
      if (e.cancelable) e.preventDefault();
      const now = performance.now(), dt = Math.max(8, now - lt); lt = now; vy = vy * 0.6 + (dy / dt) * 0.4;
      window.parent.postMessage({ tw: 'wheel', dy }, '*');
    }, { passive: false });
    addEventListener('touchend', () => { if (ty == null) return; ty = null;
      if (Math.abs(vy) > 0.25 && performance.now() - lt < 120) window.parent.postMessage({ tw: 'wheel', dy: vy * 260, fling: true }, '*'); }, { passive: true });
    // 鼠标移到屏幕最上面一条：告诉外层（把导航叫出来）
    let lastNear = 0; addEventListener('mousemove', e => { if (e.clientY < 70 && performance.now() - lastNear > 300) { lastNear = performance.now(); window.parent.postMessage({ tw: 'near-top' }, '*'); } }, { passive: true });
    addEventListener('keydown', e => { if (['PageDown', 'PageUp'].includes(e.key)) window.parent.postMessage({ tw: 'wheel', dy: e.key === 'PageDown' ? 200 : -200 }, '*'); });
    // 站内链接：交给外层（外层知道是哪一屏就翻过去，不知道就整页跳）
    addEventListener('click', e => { if (e.defaultPrevented) return; const a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
      const href = a.getAttribute('href'); if (!href || href.startsWith('#') || /^https?:/.test(href)) return;
      e.preventDefault(); window.parent.postMessage({ tw: 'go', href }, '*'); });
  }
  // 页面最上面一条（外层导航压着的地方）是深是浅：深就让导航用白字，浅就用黑字。各页在自己的 WebGL 画完一帧后调用。
  window.TW_topInk = (() => { let cur = null, lastT = 0; const px = new Uint8Array(4);
    return gl => { const now = performance.now(); if (!inFrame || now - lastT < 450) return; lastT = now;
      const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, d = W / innerWidth; let s = 0, n = 0;
      for (let a = 0.03; a < 0.98; a += 0.1) for (const y of [22, 46]) { gl.readPixels(Math.round(a * W), Math.round(H - y * d), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); s += (0.3 * px[0] + 0.59 * px[1] + 0.11 * px[2]) / 255; n++; }
      const L = s / n, k = L < 0.5 ? 'light' : L > 0.58 ? 'dark' : (cur || 'dark');
      if (k !== cur) { cur = k; window.parent.postMessage({ tw: 'ink', v: k }, '*'); } }; })();
  document.documentElement.lang = l === 'en' ? 'en' : 'zh-CN';
  document.documentElement.classList.add('lang-' + l);
})();
