// 同温层 · 她的三条 PS 渐变（原样从 .grd 文件里解出来的色标和位置，2026-11-23）
//   粉红.grd → 前台；橙蓝.grd → 中台；同温层_薄荷蓝紫柠檬黄.grd → 后台
// 位置 0..1（冷 → 热）。别处要用颜色，就从这里取，不再自己改色。
window.TW_GRD = {
  // 前台 2026-11-24 改：粉红.grd 最热处发白发灰、看着比中台还弱。冷端仍是粉（淡进白底），热端接映射工具 20.4 的亮端（红→珊瑚→桃白）
  front: [['#EB83B0', 0], ['#EA4351', 0.4], ['#FB6264', 0.55], ['#FE766F', 0.68], ['#FF9C86', 0.8], ['#FFC8AE', 0.9], ['#FFEBDC', 1]],
  mid:   [['#696FE1', 0], ['#EA6031', 0.338], ['#FFAF52', 0.77], ['#E3FA91', 0.985], ['#E3FA91', 1]],
  back:  [['#C1E1D4', 0], ['#868AE7', 0.55], ['#FAFB71', 1]],
};
// 在某条渐变上取 t（0..1）处的颜色，返回 [r,g,b]（0..255）
window.TW_grdAt = (name, t) => {
  const s = window.TW_GRD[name], h = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  t = Math.max(0, Math.min(1, t));
  for (let i = 0; i < s.length - 1; i++) {
    const [c0, p0] = s[i], [c1, p1] = s[i + 1];
    if (t <= p1 || i === s.length - 2) { const f = p1 > p0 ? (t - p0) / (p1 - p0) : 0; const a = h(c0), b = h(c1); return a.map((v, k) => v + (b[k] - v) * Math.max(0, Math.min(1, f))); }
  }
  return h(s[s.length - 1][0]);
};
// 做成 n 格的色带数组（给着色器的贴图用）
window.TW_grdStrip = (name, n = 128) => Array.from({ length: n }, (_, i) => window.TW_grdAt(name, i / (n - 1)));
