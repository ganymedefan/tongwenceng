// 同温层 · 答题进度（存在本机 tw_answers_v2：{A1:{score,acting,no,ans,feel}, …}）。九格都有记录 = 答完（"无法代入"也算答过）
window.TW_CELLS = ['A1', 'B1', 'C1', 'A2', 'B2', 'C2', 'A3', 'B3', 'C3'];
window.TW_answers = () => { try { return JSON.parse(localStorage.getItem('tw_answers_v2') || '{}') || {}; } catch (e) { return {}; } };
window.TW_progress = () => { const a = TW_answers(); const done = TW_CELLS.filter(c => a[c]).length; return { a, done, complete: done === 9 }; };
window.TW_reset = () => { try { localStorage.removeItem('tw_answers_v2'); } catch (e) {} };
// 每格在哪张桌子、哪个镜头
window.TW_where = cell => ({ page: { 1: './办公桌_新布景_轮廓.html', 2: './茶水间_新布景_轮廓.html', 3: './小桌_新布景_轮廓.html' }[cell[1]], shot: cell[0] });
