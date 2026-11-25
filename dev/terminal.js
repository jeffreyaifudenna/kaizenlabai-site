// KaizenLabAI dev-mode command window.
// Loaded only on localhost / 127.0.0.1 (see the loader in index.html). Not deployed: /dev is in .vercelignore.
(function () {
  var css = [
    '.term-btn{position:fixed;right:calc(14px + env(safe-area-inset-right));bottom:calc(14px + env(safe-area-inset-bottom));z-index:60;background:#0a0c08;border:1px solid #3a4a30;color:#9fd18b;font:600 .75rem/1 ui-monospace,Consolas,monospace;padding:.45rem .55rem;border-radius:8px;cursor:pointer;touch-action:manipulation}',
    '.term-btn b{color:#0a0c08;background:#9fd18b;border-radius:4px;padding:1px 4px;margin-left:6px;font-size:.62rem;letter-spacing:.06em}',
    '.term-btn:hover,.term-btn:focus-visible{border-color:#9fd18b;outline:none}',
    '.term{position:fixed;right:calc(16px + env(safe-area-inset-right));bottom:calc(60px + env(safe-area-inset-bottom));width:min(380px,40vw);height:min(260px,40vh);z-index:61;background:#0a0c08;border:1px solid #9fd18b;border-radius:10px;color:#9fd18b;font:12px/1.45 ui-monospace,Consolas,"Courier New",monospace;text-align:left;display:flex;flex-direction:column;overflow:hidden;opacity:0;transform:scale(.92);transform-origin:bottom right;visibility:hidden;transition:opacity .18s ease,transform .18s ease,visibility 0s linear .18s;box-shadow:0 12px 36px rgba(0,0,0,.65)}',
    '.term.open{opacity:1;transform:none;visibility:visible;transition:opacity .18s ease,transform .18s ease}',
    '.term-bar{display:flex;align-items:center;justify-content:space-between;padding:4px 6px 4px 10px;border-bottom:1px solid #22261c;color:#5e7d55;font-size:11px}',
    '.term-x{background:none;border:0;color:#5e7d55;font:16px/1 ui-monospace,Consolas,monospace;cursor:pointer;padding:2px 6px;border-radius:4px}',
    '.term-x:hover,.term-x:focus-visible{color:#9fd18b;outline:none;background:#1a1d14}',
    '.term-body{flex:1;min-height:0;display:flex;flex-direction:column;padding:8px 10px}',
    '.term-out{flex:1;min-height:0;overflow-y:auto;white-space:pre-wrap;word-break:break-word}',
    '.term-out .dim{color:#5e7d55}.term-out .gold{color:#e5b84c}.term-out .err{color:#e08a6f}.term-out a{color:#e5b84c}',
    '.term form{display:flex;gap:.5rem;align-items:center;margin-top:6px}',
    '.term .prompt{color:#e5b84c;white-space:nowrap}',
    '.term input{flex:1;min-width:0;background:transparent;border:0;color:#9fd18b;font:inherit;font-size:16px;padding:0;outline:none;caret-color:#9fd18b}',
    '@media (max-width:699px){.term{left:0;right:0;bottom:0;width:auto;height:40vh;border-radius:12px 12px 0 0;border-width:1px 0 0;transform:translateY(100%);transform-origin:bottom center}.term.open{transform:none}.term.open ~ .term-btn{opacity:0;pointer-events:none}}',
    '@media (prefers-reduced-motion:reduce){.term,.term.open{transition:none}}'
  ].join('\n');
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var wrap = document.createElement('div');
  wrap.innerHTML =
    '<section class="term" id="term" role="dialog" aria-label="Dev command window" aria-hidden="true">' +
      '<div class="term-bar"><span>kaizen@lab &middot; dev mode</span><button class="term-x" id="termX" type="button" aria-label="Close command window">&times;</button></div>' +
      '<div class="term-body"><div class="term-out" id="termOut" aria-live="polite"></div>' +
      '<form id="termForm" autocomplete="off"><label class="prompt" for="termIn">kaizen@lab:~$</label><input id="termIn" type="text" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="go"></form></div>' +
    '</section>' +
    '<button class="term-btn" id="termBtn" type="button" aria-label="Open dev command window" aria-controls="term" aria-expanded="false">&gt;_<b>DEV</b></button>';
  while (wrap.firstChild) document.body.appendChild(wrap.firstChild);

  var term = document.getElementById('term'), out = document.getElementById('termOut'), form = document.getElementById('termForm'),
      input = document.getElementById('termIn'), tbtn = document.getElementById('termBtn'), opener = null, greeted = false, hist = [], hi = 0;

  function line(text, cls) { var d = document.createElement('div'); if (cls) d.className = cls; d.textContent = text; out.appendChild(d); out.scrollTop = out.scrollHeight; return d; }
  function link(text, href) { var d = line(''), a = document.createElement('a'); a.href = href; a.target = '_blank'; a.rel = 'noopener'; a.textContent = text; d.appendChild(a); }
  function isOpen() { return term.classList.contains('open'); }
  function openTerm(from) {
    if (isOpen()) return; opener = from || document.activeElement;
    term.classList.add('open'); term.setAttribute('aria-hidden', 'false'); tbtn.setAttribute('aria-expanded', 'true');
    if (!greeted) { line('KaizenLabAI dev command window', 'gold'); line('Only shows on localhost. Type help.', 'dim'); greeted = true; }
    setTimeout(function () { input.focus({ preventScroll: true }); }, 30);
  }
  function closeTerm() {
    if (!isOpen()) return;
    term.classList.remove('open'); term.setAttribute('aria-hidden', 'true'); tbtn.setAttribute('aria-expanded', 'false'); input.blur();
    if (opener && opener !== input && document.contains(opener)) opener.focus({ preventScroll: true });
  }

  var sections = { learning: '/learning/', agents: '/agents/', automations: '/automations/', 'open-source': '/open-source/', opensource: '/open-source/', home: '/' };
  var commands = {
    help: function () {
      ['Commands:',
       '  help              this list',
       '  sections          list the site sections',
       '  open <section>    go to learning | agents | automations | open-source | home',
       '  menu              open the command-bar menu',
       '  seams clear       wipe the gold seams off the page',
       '  info              page, viewport and device details',
       '  links             YouTube, GitHub, live site',
       '  reload            reload this page',
       '  clear             clear this window',
       '  exit              close (also Esc or the ` key)'].forEach(function (s) { line(s); });
    },
    sections: function () { Array.prototype.forEach.call(document.querySelectorAll('nav a'), function (a) { line('  ' + a.textContent + '  ' + a.getAttribute('href')); }); },
    open: function (arg) {
      var k = (arg || '').toLowerCase().replace(/\s+/g, '-');
      if (!sections[k]) { line('usage: open learning | agents | automations | open-source | home', 'err'); return; }
      line('opening ' + sections[k] + ' ...', 'dim'); location.href = sections[k];
    },
    menu: function () { var b = document.getElementById('cmdOpen'); if (!b) { line('no command bar on this page', 'err'); return; } closeTerm(); setTimeout(function () { b.click(); }, 200); },
    seams: function (arg) {
      if (arg !== 'clear') { line('usage: seams clear', 'err'); return; }
      var n = 0; ['seams', 'seamsLive'].forEach(function (id) { var c = document.getElementById(id); if (c) { c.getContext('2d').clearRect(0, 0, c.width, c.height); n++; } });
      line(n ? 'seams cleared' : 'no seams canvas on this page', n ? null : 'err');
    },
    info: function () {
      line('url       ' + location.href);
      line('viewport  ' + innerWidth + ' x ' + innerHeight + ' (dpr ' + (window.devicePixelRatio || 1) + ')');
      line('theme     ' + (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') + ', reduced motion ' + (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'on' : 'off'));
      line('agent     ' + navigator.userAgent);
    },
    links: function () { link('youtube.com/@KaizenLabAI', 'https://www.youtube.com/@KaizenLabAI'); link('github.com/jeffreyaifudenna', 'https://github.com/jeffreyaifudenna'); link('www.kaizenlabai.com (live)', 'https://www.kaizenlabai.com/'); },
    reload: function () { location.reload(); },
    clear: function () { out.textContent = ''; },
    exit: function () { closeTerm(); }
  };

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var raw = input.value.trim(); input.value = '';
    line('kaizen@lab:~$ ' + raw, 'dim'); if (!raw) return;
    hist.push(raw); hi = hist.length;
    var parts = raw.split(/\s+/), cmd = parts[0].toLowerCase(), arg = parts.slice(1).join(' ');
    if (Object.prototype.hasOwnProperty.call(commands, cmd)) commands[cmd](arg);
    else line('command not found: ' + parts[0] + ' (try help)', 'err');
  });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowUp' && hist.length) { e.preventDefault(); hi = Math.max(0, hi - 1); input.value = hist[hi]; }
    else if (e.key === 'ArrowDown' && hist.length) { e.preventDefault(); hi = Math.min(hist.length, hi + 1); input.value = hist[hi] || ''; }
  });
  tbtn.addEventListener('click', function () { isOpen() ? closeTerm() : openTerm(tbtn); });
  document.getElementById('termX').addEventListener('click', closeTerm);
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var inField = e.target && /INPUT|TEXTAREA/.test(e.target.tagName);
    if (e.key === 'Escape' && isOpen()) { e.preventDefault(); closeTerm(); return; }
    if (e.key === '`' && (!inField || e.target === input)) { e.preventDefault(); isOpen() ? closeTerm() : openTerm(); }
  });
  try { console.log('%cKaizenLabAI dev mode: press ` or click >_ DEV for the command window', 'color:#9fd18b'); } catch (e) {}
})();
