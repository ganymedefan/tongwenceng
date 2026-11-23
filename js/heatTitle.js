// 同温层 · 章节标题的"字的热弥散"（2026-11-23）
// 用法：heatTitle(元素, 'front' | 'mid' | 'back')。每页只给一个标题用一次，正文不用。
// 做法：按元素自己的字体把字画成热源 → 缩小再放大得到几层越来越糊的遮罩 → 着色器里叠成热场，
//       压一圈"亮-暗-亮"的轮廓带，再用颗粒把边吃掉；颜色取她的 grd 渐变（js/grd.js）。
// 参考：Brik · Dissolve Type Echo（Lera Lesyk，改自 Or Yogev 的 DSSLV）里的热晕与颗粒消散。
window.heatTitle = async function (el, stage = 'front', opt = {}) {
  if (!el) return;
  try { await document.fonts.ready; } catch (e) {}
  const cs = getComputedStyle(el), fs = parseFloat(cs.fontSize), lh = parseFloat(cs.lineHeight) || fs * 1.1;
  const M = Math.round(fs * 0.9);                                  // 热晕要往字外面扩
  if (cs.position === 'static') el.style.position = 'relative';
  const lines = (opt.text || el.innerText).split('\n').filter(t => t.trim());
  const mx = document.createElement('canvas').getContext('2d'); mx.font = `${cs.fontStyle} ${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
  if ('letterSpacing' in mx) mx.letterSpacing = cs.letterSpacing;
  const tw = Math.max(...lines.map(t => mx.measureText(t).width));
  const r = el.getBoundingClientRect(), W = Math.ceil(Math.max(r.width, tw)) + M * 2, H = Math.ceil(Math.max(r.height, lh * lines.length)) + M * 2;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  // 字的遮罩
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const S = mk(Math.round(W * dpr), Math.round(H * dpr)), x = S.getContext('2d');
  x.scale(dpr, dpr); x.fillStyle = '#000'; x.fillRect(0, 0, W, H); x.fillStyle = '#fff';
  x.font = `${cs.fontStyle} ${cs.fontWeight} ${fs}px ${cs.fontFamily}`; x.textBaseline = 'middle';
  if ('letterSpacing' in x) x.letterSpacing = cs.letterSpacing;
  lines.forEach((t, i) => x.fillText(t, M, M + lh * i + lh / 2));
  const down = (src, k) => { const c = mk(Math.max(4, Math.round(src.width / k)), Math.max(4, Math.round(src.height / k))); const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, c.width, c.height); return c; };
  const N = down(down(S, 2), 2), F = down(down(N, 2), 2), Wd = down(down(F, 2), 2);
  // 画布盖在原来的字上，原来的字变透明（还占位、还能被选中和读屏）
  const cv = mk(Math.round(W * dpr), Math.round(H * dpr));
  Object.assign(cv.style, { position: 'absolute', left: -M + 'px', top: -M + 'px', width: W + 'px', height: H + 'px', pointerEvents: 'none' });
  el.appendChild(cv); if (!opt.keepColor) el.style.color = 'transparent';
  const gl = cv.getContext('webgl', { premultipliedAlpha: true, alpha: true });
  if (!gl) { el.style.color = ''; cv.remove(); return; }
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, 'attribute vec2 p; varying vec2 v; void main(){ v = p*0.5+0.5; gl_Position = vec4(p,0.,1.); }'));
  gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, `precision mediump float; varying vec2 v;
    uniform sampler2D tS, tN, tF, tW, tR; uniform float uT, uIn; uniform vec2 uRes;
    float h2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    void main(){
      vec2 uv = vec2(v.x, 1.0 - v.y), px = uv * uRes;
      float S = texture2D(tS, uv).r, N = texture2D(tN, uv).r, F = texture2D(tF, uv).r, W = texture2D(tW, uv).r;
      float field = (S*0.42 + N*0.55 + F*0.62 + W*0.75) * uIn;
      float x = clamp(field, 0.0, 1.2);
      float dz = (x - 0.45)/0.06; x += -0.06*exp(-0.5*dz*dz) + 0.035*exp(-0.5*(dz+1.1)*(dz+1.1));
      float g = h2(floor(px/1.2) + floor(uT*12.0)*7.13);
      float keep = step(g * 0.55, smoothstep(0.02, 0.5, x));
      float a = smoothstep(0.03, 0.3, x) * keep;
      float xr = clamp(x, 0.0, 1.0); xr = xr < 0.5 ? 0.5*pow(xr/0.5, 1.6) : 0.5 + 0.5*pow((xr-0.5)/0.5, 0.45);
      vec3 col = texture2D(tR, vec2(xr, 0.5)).rgb + (h2(px*0.71 + floor(uT*12.0)) - 0.5)*0.05;
      gl_FragColor = vec4(col*a, a);
    }`));
  gl.linkProgram(pr); gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const tex = (unit, src, name) => { const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); gl.uniform1i(gl.getUniformLocation(pr, name), unit); };
  const strip = mk(128, 1), sx = strip.getContext('2d');
  const paint = name => { const id = sx.createImageData(128, 1); TW_grdStrip(name, 128).forEach((c, i) => { id.data.set([c[0], c[1], c[2], 255], i * 4); }); sx.putImageData(id, 0, 0); };
  paint(stage);
  tex(0, S, 'tS'); tex(1, N, 'tN'); tex(2, F, 'tF'); tex(3, Wd, 'tW'); tex(4, strip, 'tR');
  gl.uniform2f(gl.getUniformLocation(pr, 'uRes'), W, H);
  const uT = gl.getUniformLocation(pr, 'uT'), uIn = gl.getUniformLocation(pr, 'uIn');
  gl.viewport(0, 0, cv.width, cv.height);
  const t0 = performance.now();
  (function frame() {
    const t = (performance.now() - t0) / 1000;
    gl.uniform1f(uT, t); gl.uniform1f(uIn, Math.min(1, t / 1.4));   // 进来时热慢慢升起
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(frame);
  })();
  // 换色：传一条渐变的名字（front / mid / back）
  return { setStage(name) { paint(name); gl.activeTexture(gl.TEXTURE4); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, strip); } };
};

// ───── 一整层的"字的热弥散"：在一块全屏画布上，把若干个摆好位置的小字（比如数据页岛里的人数）一起做成热弥散 ─────
// 用法：const h = heatField(canvas); h.set([{ x, y, text, size, font }], 'front'); h.set([], ...) 清空
// 和 heatTitle 同一个着色器（亮-暗-亮的轮廓带、颗粒吃边、grd 颜色），只是字是一个个放在指定位置上的。
window.heatField = function (cv) {
  const gl = cv.getContext('webgl', { premultipliedAlpha: true, alpha: true });
  if (!gl) return { set() {} };
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const down = (src, k) => { const c = mk(Math.max(4, Math.round(src.width / k)), Math.max(4, Math.round(src.height / k))); const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, c.width, c.height); return c; };
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, 'attribute vec2 p; varying vec2 v; void main(){ v = p*0.5+0.5; gl_Position = vec4(p,0.,1.); }'));
  gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, `precision mediump float; varying vec2 v;
    uniform sampler2D tS, tN, tF, tW, tR; uniform float uT, uIn; uniform vec2 uRes;
    float h2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    void main(){
      vec2 uv = vec2(v.x, 1.0 - v.y), px = uv * uRes;
      float S = texture2D(tS, uv).r, N = texture2D(tN, uv).r, F = texture2D(tF, uv).r, W = texture2D(tW, uv).r;
      float field = (S*0.42 + N*0.55 + F*0.62 + W*0.75) * uIn;
      float x = clamp(field, 0.0, 1.2);
      float dz = (x - 0.45)/0.06; x += -0.06*exp(-0.5*dz*dz) + 0.035*exp(-0.5*(dz+1.1)*(dz+1.1));
      float g = h2(floor(px/1.2) + floor(uT*12.0)*7.13);
      float keep = step(g * 0.55, smoothstep(0.02, 0.5, x));
      float a = smoothstep(0.03, 0.3, x) * keep;
      float xr = clamp(x, 0.0, 1.0); xr = xr < 0.5 ? 0.5*pow(xr/0.5, 1.6) : 0.5 + 0.5*pow((xr-0.5)/0.5, 0.45);
      vec3 col = texture2D(tR, vec2(xr, 0.5)).rgb + (h2(px*0.71 + floor(uT*12.0)) - 0.5)*0.05;
      gl_FragColor = vec4(col*a, a);
    }`));
  gl.linkProgram(pr); gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const T = ['tS', 'tN', 'tF', 'tW', 'tR'].map((name, unit) => { const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(gl.getUniformLocation(pr, name), unit); return t; });
  const put = (unit, src) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, T[unit]); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); };
  const strip = mk(128, 1), sx = strip.getContext('2d');
  const uT = gl.getUniformLocation(pr, 'uT'), uIn = gl.getUniformLocation(pr, 'uIn'), uRes = gl.getUniformLocation(pr, 'uRes');
  let t0 = performance.now(), shown = false, want = 0, inv = 0;
  (function frame() {
    const t = (performance.now() - t0) / 1000;
    inv += (want - inv) * 0.12;
    if (inv > 0.01) { gl.uniform1f(uT, t); gl.uniform1f(uIn, inv * Math.min(1, t / 0.9)); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); shown = true; }
    else if (shown) { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); shown = false; }
    requestAnimationFrame(frame);
  })();
  return {
    set(items, stage = 'front') {
      if (!items.length) { want = 0; return; }
      const W = cv.clientWidth, H = cv.clientHeight, dpr = Math.min(devicePixelRatio || 1, 2);
      if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
      gl.viewport(0, 0, cv.width, cv.height); gl.uniform2f(uRes, W, H);
      const S = mk(cv.width, cv.height), x = S.getContext('2d');
      x.scale(dpr, dpr); x.fillStyle = '#000'; x.fillRect(0, 0, W, H); x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
      items.forEach(it => {
        if (it.dot) { x.beginPath(); x.arc(it.x, it.y, it.dot + (it.grow || 0) / 2, 0, Math.PI * 2); x.fill(); return; }
        x.font = it.font || `400 ${it.size || 20}px Exposure, Georgia, serif`; x.textAlign = it.align || 'center';
        if ('letterSpacing' in x) x.letterSpacing = it.spacing || '0px';
        if (it.grow) { x.lineWidth = it.grow; x.lineJoin = 'round'; x.strokeStyle = '#fff'; x.strokeText(it.text, it.x, it.y); }   // 字后面的热要比字粗一圈
        x.fillText(it.text, it.x, it.y); });
      const N = down(down(S, 2), 2), F = down(down(N, 2), 2), Wd = down(down(F, 2), 2);
      put(0, S); put(1, N); put(2, F); put(3, Wd);
      const id = sx.createImageData(128, 1); TW_grdStrip(stage, 128).forEach((c, i) => id.data.set([c[0], c[1], c[2], 255], i * 4)); sx.putImageData(id, 0, 0); put(4, strip);
      t0 = performance.now(); want = 1;
    },
  };
};
