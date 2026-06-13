// main.js ── 鬼リピ 変化の割合マスター
'use strict';
(function(){

/* ===== localStorage（フォールバック付き） ===== */
const STORE_KEY = 'oniripi_henka_v1';
const mem = {};
const store = {
  get(k){ try{ return localStorage.getItem(k); }catch(e){ return mem[k]??null; } },
  set(k,v){ try{ localStorage.setItem(k,v); }catch(e){ mem[k]=v; } },
  del(k){ try{ localStorage.removeItem(k); }catch(e){ delete mem[k]; } }
};
function loadData(){ try{ return JSON.parse(store.get(STORE_KEY))||{high:0,history:[]}; }catch(e){ return {high:0,history:[]}; } }
function saveData(d){ store.set(STORE_KEY, JSON.stringify(d)); }

/* ===== 状態 ===== */
let level=1, session=[], idx=0, score=0, hintStep=0, locked=false, results=[];
const QN = 5;

/* ===== DOM ===== */
const $ = id=>document.getElementById(id);
const screens = { start:$('screen-start'), quiz:$('screen-quiz'), result:$('screen-result') };
function show(name){ Object.values(screens).forEach(s=>s.classList.remove('active')); screens[name].classList.add('active'); }
function typeset(el){ if(window.MathJax&&MathJax.typesetPromise) MathJax.typesetPromise(el?[el]:undefined).catch(()=>{}); }

/* ===== LaTeX → 数値（採点用） ===== */
function latexToNumber(latex){
  if(latex==null) return NaN;
  let s = String(latex).replace(/\s+/g,'');
  s = s.replace(/\\left|\\right|\\,|\\!|\\;|\\cdot|\\mleft|\\mright/g,'');
  s = s.replace(/[−ー–—]/g,'-');               // 各種マイナス
  s = s.replace(/[＋]/g,'+');
  // \dfrac / \frac{a}{b}
  let m = s.match(/^(-?)\\d?frac\{(-?\d+)\}\{(-?\d+)\}$/);
  if(m){ const sign=m[1]==='-'?-1:1; return sign*(parseFloat(m[2])/parseFloat(m[3])); }
  m = s.match(/^(-?)\\d?frac\{(-?\d+)\}\{(-?\d+)\}$/);
  // a/b スラッシュ
  m = s.match(/^(-?\d+)\/(-?\d+)$/);
  if(m){ return parseFloat(m[1])/parseFloat(m[2]); }
  // 整数・小数
  if(/^-?\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  return NaN;
}
function isCorrect(userLatex, q){
  const v = latexToNumber(userLatex);
  if(!isNaN(v)) return Math.abs(v - q.ansValue) < 1e-9;
  // フォールバック：文字列正規化
  const norm = x=>String(x).replace(/\s+|\\left|\\right|\\,|d(?=frac)/g,'').replace(/[−ー]/g,'-');
  return norm(userLatex)===norm(q.ansLatex);
}

/* ===== レベル選択 ===== */
document.querySelectorAll('.level-btn').forEach(btn=>{
  btn.onclick=()=>{
    document.querySelectorAll('.level-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active'); level=+btn.dataset.level;
  };
});

/* ===== 履歴・ハイスコア表示 ===== */
function renderHome(){
  const d=loadData();
  $('high-score').textContent = d.high||0;
  const list=$('history-list');
  if(!d.history||!d.history.length){ list.innerHTML='<p class="no-history">まだ記録がないよ！</p>'; return; }
  list.innerHTML = d.history.slice(-20).reverse().map(h=>{
    const pass = h.score>=Math.ceil(h.total*0.8);
    return `<div class="history-item"><span>${h.date} <small>Lv.${h.level}</small></span>
      <span class="${pass?'pass':'fail'}">${h.score}/${h.total} ${pass?'合格':' '}</span></div>`;
  }).join('');
}

/* ===== ヘルパーキー（MathLive） ===== */
const mf = ()=>$('answer-field');
document.querySelector('.helper-keys').addEventListener('click',e=>{
  const b=e.target.closest('.hkey'); if(!b||locked) return;
  const f=mf();
  if(b.dataset.cmd==='frac'){ try{ f.executeCommand(['insert','\\frac{#0}{#?}']); }catch(_){ try{ f.insert('\\frac{#0}{#?}'); }catch(__){} } }
  else if(b.dataset.cmd==='minus'){ try{ f.insert('-'); }catch(_){} }
  else if(b.dataset.cmd==='clear'){ f.value=''; }
  f.focus();
});
function forceHalfWidth(f){
  if(!f) return;
  f.setAttribute('inputmode','latin');
  f.addEventListener('compositionend',ev=>{
    const data=ev.data;
    if(data){
      const c=data.replace(/[０-９]/g,s=>String.fromCharCode(s.charCodeAt(0)-0xFEE0))
        .replace(/[ａ-ｚ]/g,s=>String.fromCharCode(s.charCodeAt(0)-0xFEE0))
        .replace(/[Ａ-Ｚ]/g,s=>String.fromCharCode(s.charCodeAt(0)-0xFEE0))
        .replace(/[＋]/g,'+').replace(/[－ー−]/g,'-').replace(/[／]/g,'/').replace(/[＝]/g,'=');
      f.value=''; f.insert(c);
    }
  });
  f.addEventListener('focus',()=>{
    f.setAttribute('inputmode','latin');
    const sh=f.shadowRoot; if(sh){ const ta=sh.querySelector('textarea'); if(ta){ ta.setAttribute('inputmode','latin'); ta.setAttribute('autocorrect','off'); ta.setAttribute('lang','en'); } }
  });
}

/* ===== ゲーム進行 ===== */
function startGame(reuse){
  if(!reuse) session = generateSession(level, QN);
  idx=0; score=0; results=[];
  $('level-tag').textContent='Lv.'+level;
  show('quiz'); loadQuestion();
}
function loadQuestion(){
  locked=false; hintStep=0;
  const q=session[idx];
  $('q-counter').textContent=`Q ${idx+1} / ${session.length}`;
  $('progress-fill').style.width = (idx/session.length*100)+'%';
  $('score-display').textContent=score+'点';
  $('question-label').innerHTML=q.label;
  $('question-display').innerHTML=q.display;
  $('question-extra').innerHTML=q.extra||'';
  $('feedback-box').className='feedback-box hidden';
  resetHints();
  $('hint-btn').classList.remove('hidden');
  $('hint-btn').textContent='💡 ヒント';
  $('hint-btn').disabled=false;
  $('submit-btn').classList.remove('hidden');
  $('submit-btn').disabled=false;
  $('next-btn').classList.add('hidden');
  const f=mf(); f.value=''; setTimeout(()=>{ try{f.focus();}catch(_){} },50);
  setTimeout(()=>{ try{ if(window.clearMemo) window.clearMemo(); }catch(_){} },80);
  typeset(screens.quiz);
}

function submit(){
  if(locked) return;
  const q=session[idx];
  const userLatex = mf().getValue ? mf().getValue('latex') : mf().value;
  if(!userLatex || !userLatex.trim()){ flashNote('答えを入力してね！'); return; }
  const ok = isCorrect(userLatex, q);
  finishQuestion(ok, userLatex);
}
let noteTimer;
function flashNote(msg){
  const note=document.querySelector('.input-note');
  note.dataset.orig = note.dataset.orig||note.textContent;
  note.textContent=msg; note.style.color='var(--ng)';
  clearTimeout(noteTimer);
  noteTimer=setTimeout(()=>{ note.textContent=note.dataset.orig; note.style.color=''; },1600);
}

function finishQuestion(ok, userLatex, gaveUp){
  locked=true;
  const q=session[idx];
  if(ok) score+=20;
  $('score-display').textContent=score+'点';
  results.push({ q, userLatex: gaveUp?null:userLatex, ok });
  const fb=$('feedback-box');
  fb.className='feedback-box '+(ok?'ok':'ng');
  if(ok){
    fb.innerHTML=`<div class="fb-row" style="font-weight:700;font-size:2.2vh">⭕ 正解！</div>`;
  }else{
    fb.innerHTML=`<div class="fb-row" style="font-weight:700;font-size:2.2vh">${gaveUp?'🏳️ ギブアップ':'❌ ざんねん…'}</div>
      <div class="fb-row"><span class="fb-label">あなたの解答：</span> \\(${userLatex?cleanLatex(userLatex):'（なし）'}\\)</div>
      <div class="fb-row"><span class="fb-label">正しい答え：</span> \\(${q.ansLatex}\\)</div>
      <div class="fb-row"><span class="fb-label">解き方：</span> ${q.solution}</div>`;
  }
  fb.classList.remove('hidden');
  $('submit-btn').classList.add('hidden');
  $('hint-btn').classList.add('hidden');
  $('next-btn').classList.remove('hidden');
  typeset(fb);
  if(ok) try{ confetti({particleCount:60,spread:55,origin:{y:.7}}); }catch(_){}
}
function cleanLatex(s){ return String(s).replace(/\\dfrac/g,'\\frac'); }

/* ヒント（積み重ね式・最後＝答え→ギブアップ確定・右カラム固定） */
const HINT_PLACEHOLDER='<div class="hint-placeholder">💡 ヒントを押すと、ここに順番に出るよ</div>';
function resetHints(){
  const box=$('hint-text');
  // 右カラムは最初から表示（空でもプレースホルダーで埋める）
  box.className='hint-text';
  box.innerHTML=HINT_PLACEHOLDER;
}
function appendHint(html,stepNo,isAnswer){
  const box=$('hint-text');
  box.classList.remove('hidden');
  // 最初のヒントが出たらプレースホルダーを消す
  const ph=box.querySelector('.hint-placeholder');
  if(ph) ph.remove();
  const block=document.createElement('div');
  block.className='hint-step'+(isAnswer?' hint-step--answer':'');
  const label=isAnswer?'答え':('ステップ'+stepNo);
  block.innerHTML='<span class="hint-step-no">'+label+'</span>'
    +'<span class="hint-step-body">'+html+'</span>';
  box.appendChild(block);
  typeset(box);
  box.scrollTop=box.scrollHeight;
}
$('hint-btn').onclick=async()=>{
  if(locked) return;
  const q=session[idx];
  const last = hintStep>=q.hints.length-1;
  if(last){
    if(!(await showConfirm({title:'答えを見る？',message:'次のヒントは答えだよ！見ると不正解（ギブアップ）になります。',okText:'見る',danger:true}))) return;
    if(locked) return;
    appendHint(q.hints[q.hints.length-1], hintStep+1, true);
    finishQuestion(false, mf().getValue?mf().getValue('latex'):mf().value, true);
    return;
  }
  appendHint(q.hints[hintStep], hintStep+1, false);
  hintStep++;
  if(hintStep>=q.hints.length-1) $('hint-btn').textContent='⚠️ 答えを見る';
};

$('next-btn').onclick=()=>{
  idx++;
  if(idx>=session.length) showResult();
  else loadQuestion();
};

/* ===== 結果 ===== */
function showResult(){
  $('progress-fill').style.width='100%';
  show('result');
  const total=session.length, max=total*20;
  $('result-score').textContent=`${score} / ${max} 点`;
  const pass = score>=Math.ceil(max*0.8);
  const msgs = pass
    ? ['🏆 おにリピ クリア！','🔥 完ぺき！キミは変化の割合マスター！','⭐ すごい！この調子！']
    : ['📘 もう一回チャレンジ！','💪 おしい！復習しよう','🌱 まちがいは成長のチャンス'];
  $('result-badge').textContent=pick(msgs);
  if(pass) try{ burst(); }catch(_){}
  // 履歴保存
  const d=loadData();
  d.high=Math.max(d.high||0, score);
  d.history=d.history||[];
  d.history.push({ date:new Date().toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}), score, total:max, level });
  if(d.history.length>50) d.history=d.history.slice(-50);
  saveData(d);
  // 振り返り
  const wrong = results.filter(r=>!r.ok);
  $('review-wrong-btn').classList.toggle('hidden', wrong.length===0);
  $('review-list').innerHTML = results.map((r,i)=>{
    return `<div class="review-item ${r.ok?'ok':'ng'}">
      <div class="ri-q">${r.ok?'⭕':'❌'} 第${i+1}問　${r.q.label} ${r.q.display?('　\\('+stripWrap(r.q.display)+'\\)'):''}</div>
      ${r.q.extra||''}
      <div class="ri-ans">あなた: \\(${r.userLatex?cleanLatex(r.userLatex):'なし'}\\) ／ 正解: \\(${r.q.ansLatex}\\)</div></div>`;
  }).join('');
  typeset($('review-list'));
}
function stripWrap(s){ return String(s).replace(/\\\(|\\\)/g,''); }
function pick(a){ return a[Math.floor(Math.random()*a.length)]; }
function burst(){
  const end=Date.now()+800;
  (function frame(){
    confetti({particleCount:5,angle:60,spread:55,origin:{x:0}});
    confetti({particleCount:5,angle:120,spread:55,origin:{x:1}});
    if(Date.now()<end) requestAnimationFrame(frame);
  })();
}

/* ===== ボタン ===== */
$('quit-btn').onclick=()=>{ showConfirm({title:'ホームに戻る？',message:'いまのチャレンジは記録されません。',okText:'戻る'}).then(ok=>{ if(ok){ renderHome(); show('start'); } }); };
$('submit-btn').onclick=submit;
mf().addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); if(!locked) submit(); } });
$('start-btn').onclick=()=>startGame(false);
$('retry-btn').onclick=()=>startGame(false);
$('home-btn').onclick=()=>{ renderHome(); show('start'); };
$('review-wrong-btn').onclick=()=>{
  const wrong=results.filter(r=>!r.ok).map((r,i)=>({ ...r.q, id:i }));
  if(!wrong.length) return;
  session=wrong; idx=0; score=0; results=[];
  $('level-tag').textContent='復習';
  show('quiz'); loadQuestion();
};
$('reset-btn').onclick=()=>{ showConfirm({title:'履歴を消す？',message:'学習履歴と最高スコアを消すよ。',okText:'消す',danger:true}).then(ok=>{ if(ok){ store.del(STORE_KEY); renderHome(); } }); };

/* ===== 確認モーダル（confirm 置換） ===== */
function showConfirm({title,message,okText='OK',cancelText='キャンセル',danger=false}){
  return new Promise(resolve=>{
    const ov=$('modal-overlay'),card=$('modal-card');
    $('modal-title').textContent=title; $('modal-message').textContent=message;
    $('modal-ok').textContent=okText; $('modal-cancel').textContent=cancelText;
    $('modal-icon').textContent=danger?'⚠️':'❓'; card.classList.toggle('is-danger',danger);
    ov.classList.remove('hidden');
    const done=v=>{ov.classList.add('hidden');cleanup();resolve(v);};
    const onOk=()=>done(true),onCancel=()=>done(false),onBg=e=>{if(e.target===ov)done(false);};
    function cleanup(){$('modal-ok').removeEventListener('click',onOk);$('modal-cancel').removeEventListener('click',onCancel);ov.removeEventListener('click',onBg);}
    $('modal-ok').addEventListener('click',onOk);$('modal-cancel').addEventListener('click',onCancel);ov.addEventListener('click',onBg);
  });
}

/* ===== 手書き計算メモ（Canvas 2D + Pointer Events） ===== */
function initMemo(){
  const canvas=$('memo-canvas'); if(!canvas) return;
  const ctx=canvas.getContext('2d');
  let drawing=false, last=null;
  function resize(){
    const r=canvas.getBoundingClientRect();
    if(r.width<=0||r.height<=0) return;
    const dpr=window.devicePixelRatio||1;
    canvas.width=Math.round(r.width*dpr); canvas.height=Math.round(r.height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.lineWidth=2.5; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.strokeStyle='#334155';
  }
  function pos(e){ const r=canvas.getBoundingClientRect(); return {x:e.clientX-r.left,y:e.clientY-r.top}; }
  canvas.addEventListener('pointerdown',e=>{ drawing=true; last=pos(e); try{canvas.setPointerCapture(e.pointerId);}catch(_){} e.preventDefault(); });
  canvas.addEventListener('pointermove',e=>{ if(!drawing) return; const p=pos(e); ctx.beginPath(); ctx.moveTo(last.x,last.y); ctx.lineTo(p.x,p.y); ctx.stroke(); last=p; e.preventDefault(); });
  const stop=()=>{ drawing=false; last=null; };
  canvas.addEventListener('pointerup',stop); canvas.addEventListener('pointercancel',stop); canvas.addEventListener('pointerleave',stop);
  $('memo-clear').addEventListener('click',()=>{ ctx.clearRect(0,0,canvas.width,canvas.height); });
  window.addEventListener('resize',resize);
  window.clearMemo=()=>{ resize(); };
  resize();
}

/* ===== 起動 ===== */
function boot(){
  renderHome();
  initMemo();
  if(window.customElements&&customElements.whenDefined){
    customElements.whenDefined('math-field').then(()=>forceHalfWidth(mf())).catch(()=>{});
  }
  setTimeout(()=>forceHalfWidth(mf()),500);
}
if(document.readyState==='loading') window.addEventListener('DOMContentLoaded',boot);
else boot();

})();
