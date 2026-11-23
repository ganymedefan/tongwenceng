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
    let ty = null;
    let tEl = null, tTop = 0;   // 这一下手势开始时，手指下面那块能滚的区域和它的位置
    const scroller = el => { for (; el && el !== document.body && el.nodeType === 1; el = el.parentElement) { const cs = getComputedStyle(el);
      if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 2) return el; } return null; };
    addEventListener('touchstart', e => { ty = e.touches[0].clientY; tEl = scroller(e.target); tTop = tEl ? tEl.scrollTop : 0; }, { passive: true });
    addEventListener('touchend', e => { if (ty == null) return; const dy = ty - e.changedTouches[0].clientY; ty = null;
      if (Math.abs(dy) > 60 && atEdge(dy) && !(tEl && (Math.abs(tEl.scrollTop - tTop) > 2 || inner(tEl, dy)))) window.parent.postMessage({ tw: 'wheel', dy: dy * 3 }, '*'); }, { passive: true });
    addEventListener('keydown', e => { if (['PageDown', 'PageUp'].includes(e.key)) window.parent.postMessage({ tw: 'wheel', dy: e.key === 'PageDown' ? 200 : -200 }, '*'); });
    // 站内链接：交给外层（外层知道是哪一屏就翻过去，不知道就整页跳）
    addEventListener('click', e => { if (e.defaultPrevented) return; const a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
      const href = a.getAttribute('href'); if (!href || href.startsWith('#') || /^https?:/.test(href)) return;
      e.preventDefault(); window.parent.postMessage({ tw: 'go', href }, '*'); });
  }
  document.documentElement.lang = l === 'en' ? 'en' : 'zh-CN';
  document.documentElement.classList.add('lang-' + l);
})();
