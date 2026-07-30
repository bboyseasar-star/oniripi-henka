// questions.js ── 変化の割合マスター
// 値はすべて「有理数 1つ」を答える設計（数値比較で堅牢に採点）

/* ---------- 分数ユーティリティ ---------- */
function gcd(a, b){ a=Math.abs(a); b=Math.abs(b); while(b){ [a,b]=[b,a%b]; } return a||1; }
function reduce(p, q){ if(q<0){ p=-p; q=-q; } const g=gcd(p,q); return [p/g, q/g]; }
// 有理数を LaTeX に
function ratLatex(p, q){
  [p,q] = reduce(p,q);
  if(q===1) return String(p);
  return p<0 ? `-\\dfrac{${-p}}{${q}}` : `\\dfrac{${p}}{${q}}`;
}
function ratText(p, q){ [p,q]=reduce(p,q); return q===1?String(p):`${p}/${q}`; }
function ratValue(p, q){ return p/q; }

/* ---------- 1次関数式の LaTeX ---------- */
function coefficientLatex(p, q=1, decimalText=''){
  if(decimalText) return decimalText;
  [p,q] = reduce(p,q);
  return q===1 ? String(p) : ratLatex(p,q);
}
function xTermLatex(p, q=1, decimalText=''){
  [p,q] = reduce(p,q);
  if(!decimalText && q===1 && p===1) return 'x';
  if(!decimalText && q===1 && p===-1) return '-x';
  return `${coefficientLatex(p,q,decimalText)}x`;
}
function eqLatex(p, q, b, reversed=false, decimalText=''){
  const xTerm=xTermLatex(p,q,decimalText);
  if(!reversed){
    let s=xTerm;
    if(b>0) s+=`+${b}`; else if(b<0) s+=`-${-b}`;
    return `y=${s}`;
  }
  if(b===0) return `y=${xTerm}`;
  const absX=xTerm.replace(/^-/, '');
  return xTerm.startsWith('-') ? `y=${b}-${absX}` : `y=${b}+${xTerm}`;
}

const RNG = (lo,hi)=>lo+Math.floor(Math.random()*(hi-lo+1));
const pick = arr=>arr[Math.floor(Math.random()*arr.length)];
const shuffle = arr=>arr.slice().sort(()=>Math.random()-0.5);

/* =========================================================
   レベル1：式から変化の割合を即答
   ========================================================= */
function genLevel1(){
  const slopes=[
    {p:-5,q:1},{p:-3,q:1},{p:-1,q:1},{p:1,q:1},{p:2,q:1},{p:4,q:1},
    {p:1,q:2},{p:-1,q:2},{p:2,q:3},{p:-3,q:4},
    {p:1,q:2,decimal:'0.5'},{p:-1,q:2,decimal:'-0.5'},
    {p:1,q:5,decimal:'0.2'},{p:-4,q:5,decimal:'-0.8'}
  ];
  const slope=pick(slopes);
  const b = RNG(-5,5);
  const reversed=Math.random()<0.35;
  const ansLatex=coefficientLatex(slope.p,slope.q,slope.decimal||'');
  const equation=eqLatex(slope.p,slope.q,b,reversed,slope.decimal||'');
  return {
    level:1,
    label:'1次関数の変化の割合を求めなさい',
    display:`\\( ${equation} \\)`,
    extra:reversed?'<p class="question-note">※項の順番に注意しよう</p>':'',
    ansValue:slope.p/slope.q,
    ansLatex,
    hints:[
      '1次関数 \\(y=ax+b\\) の変化の割合は、いつも \\(x\\) の係数 \\(a\\) に等しいよ。',
      `項の順番に関係なく、式 \\(${equation}\\) の \\(x\\) の前についている数を探そう。`,
      `答えは \\( ${ansLatex} \\)。変化の割合は \\(x\\) の係数だよ。`
    ],
    solution:`式 \\(${equation}\\) の \\(x\\) の係数は \\(${ansLatex}\\)。よって、変化の割合は \\(${ansLatex}\\)。`
  };
}

/* =========================================================
   レベル2：2点から変化の割合
   ========================================================= */
function genLevel2(){
  // 傾きは分数も許可
  const slopes = [[-3,1],[-2,1],[-1,1],[2,1],[3,1],[1,2],[-1,2],[2,3],[-2,3],[3,2],[-3,2],[1,3]];
  const [sp,sq] = pick(slopes);
  // x1, x2 を選ぶ（x2-x1 が sq の倍数になるよう）
  const x1 = RNG(-4,2);
  const dx = sq*RNG(1,2);           // x の増加量
  const x2 = x1+dx;
  const b = RNG(-4,4);
  const y1n = sp*x1 + b*sq, y1d = sq;  // y1 = sp/sq*x1 + b
  const y2n = sp*x2 + b*sq, y2d = sq;
  const Y = (n,d)=>{ [n,d]=reduce(n,d); return d===1?String(n):ratLatex(n,d); };
  return {
    level:2,
    label:'2点を通る1次関数の変化の割合を求めなさい',
    display:`2点 \\( (${x1},\\ ${Y(y1n,y1d)}) \\)、\\( (${x2},\\ ${Y(y2n,y2d)}) \\) を通る`,
    extra:'',
    ansValue:sp/sq,
    ansLatex:ratLatex(sp,sq),
    hints:[
      '変化の割合 ＝ （\\(y\\)の増加量）÷（\\(x\\)の増加量）。',
      `\\(x\\)の増加量 ＝ ${x2}−(${x1}) ＝ ${dx}。\\(y\\)の増加量も同じように計算しよう。`,
      `答えは \\( ${ratLatex(sp,sq)} \\)`
    ],
    solution:`変化の割合 ＝ \\(\\dfrac{\\text{yの増加量}}{\\text{xの増加量}}=${ratLatex(sp,sq)}\\)`
  };
}

/* =========================================================
   レベル3：表から / 反比例（変化の割合が一定でない）
   ========================================================= */
function genLevel3(){
  if(Math.random()<0.5){
    // 表型（1次関数：変化の割合は一定）
    const a = pick([-3,-2,2,3,4]);
    const b = RNG(-4,4);
    const xs = [-2,-1,0,1,2];
    let row1='<tr><td>\\(x\\)</td>', row2='<tr><td>\\(y\\)</td>';
    xs.forEach(x=>{ row1+=`<td>${x}</td>`; row2+=`<td>${a*x+b}</td>`; });
    return {
      level:3,
      label:'下の表は1次関数を表しています。変化の割合は？',
      display:'',
      extra:`<table class="q-table">${row1}</tr>${row2}</tr></table>`,
      ansValue:a,
      ansLatex:String(a),
      hints:[
        '表のとなり合う値を見て、\\(x\\)が1増えると\\(y\\)がいくつ変わるか調べよう。',
        '1次関数なら、どこをとっても変化の割合は一定だよ。',
        `答えは \\( ${a} \\)`
      ],
      solution:`\\(x\\)が1増えるごとに\\(y\\)は${a}変化。変化の割合は一定で \\( ${a} \\)。`
    };
  }else{
    // 反比例型：y=k/x、x1→x2 の変化の割合
    const k = pick([12,24,18,36,12,24]);
    const cands = [[2,6],[2,4],[4,6],[1,3],[3,6],[2,3],[1,2],[4,8]];
    let x1,x2,y1,y2;
    for(const [a,bx] of shuffle(cands)){
      if(k%a===0 && k%bx===0){ x1=a; x2=bx; y1=k/a; y2=k/bx; break; }
    }
    if(x1===undefined){ x1=2; x2=6; y1=k/2; y2=k/6; }
    const dy = y2-y1, dx = x2-x1;
    const [rp,rq] = reduce(dy,dx);
    return {
      level:3,
      label:`反比例で \\(x\\) が ${x1} から ${x2} まで増えるときの変化の割合は？`,
      display:`\\( y=\\dfrac{${k}}{x} \\)`,
      extra:'<p style="font-size:1.6vh;color:var(--muted)">※反比例では変化の割合は一定ではないよ</p>',
      ansValue:dy/dx,
      ansLatex:ratLatex(dy,dx),
      hints:[
        `まず \\(x=${x1}\\) と \\(x=${x2}\\) のときの \\(y\\) を求めよう。`,
        `\\(y\\)の増加量 ＝ ${y2}−${y1} ＝ ${dy}、\\(x\\)の増加量 ＝ ${dx}。`,
        `答えは \\( ${ratLatex(dy,dx)} \\)`
      ],
    solution:`\\(x=${x1}\\)で\\(y=${y1}\\)、\\(x=${x2}\\)で\\(y=${y2}\\)。変化の割合 ＝ \\( ${ratLatex(dy,dx)} \\)`
    };
  }
}

/* =========================================================
   レベル4：x の増加量から y の増加量
   ========================================================= */
function genLevel4(){
  const slopes=[[-4,1],[-3,1],[-2,1],[2,1],[3,1],[4,1],[1,2],[-1,2],[2,3],[-2,3]];
  const [sp,sq]=pick(slopes);
  const b=RNG(-5,5);
  const dx=sq*RNG(2,5);
  const dy=sp*(dx/sq);
  const aLatex=ratLatex(sp,sq);
  const equation=eqLatex(sp,sq,b);
  return {
    level:4,
    label:`\\(x\\) の増加量が \\(${dx}\\) のとき、\\(y\\) の増加量を求めなさい`,
    display:`\\( ${equation} \\)`,
    extra:'',
    ansValue:dy,
    ansLatex:String(dy),
    hints:[
      '\\(y\\) の増加量 ＝（変化の割合）×（\\(x\\) の増加量）だよ。',
      `式 \\(${equation}\\) の変化の割合は \\(${aLatex}\\)、\\(x\\) の増加量は \\(${dx}\\) だね。`,
      `答えは \\( ${aLatex}\\times${dx}=${dy} \\)。`
    ],
    solution:`\\(y\\) の増加量 ＝ \\(${aLatex}\\times${dx}=${dy}\\)。${dy<0?'増加量が負なので、\\(y\\) は減少している。':''}`
  };
}

/* =========================================================
   レベル5：y の増加量から x の増加量
   ========================================================= */
function genLevel5(){
  const slopes=[[-4,1],[-3,1],[-2,1],[2,1],[3,1],[4,1],[1,2],[-1,2],[2,3],[-2,3]];
  const [sp,sq]=pick(slopes);
  const b=RNG(-5,5);
  const dx=sq*RNG(2,5);
  const dy=sp*(dx/sq);
  const aLatex=ratLatex(sp,sq);
  const equation=eqLatex(sp,sq,b);
  return {
    level:5,
    label:`\\(y\\) の増加量が \\(${dy}\\) のとき、\\(x\\) の増加量を求めなさい`,
    display:`\\( ${equation} \\)`,
    extra:'',
    ansValue:dx,
    ansLatex:String(dx),
    hints:[
      '\\(\\text{変化の割合}=\\dfrac{y\\text{ の増加量}}{x\\text{ の増加量}}\\) を使おう。',
      `この問題では \\(${aLatex}=\\dfrac{${dy}}{x\\text{ の増加量}}\\) となるよ。`,
      `\\(x\\) の増加量 ＝ \\( ${dy}\\div(${aLatex})=${dx} \\)。`
    ],
    solution:`\\(x\\) の増加量 ＝ \\(\\dfrac{y\\text{ の増加量}}{\\text{変化の割合}}=${dy}\\div(${aLatex})=${dx}\\)。`
  };
}

/* =========================================================
   レベル6：文脈から変化の割合の意味を読む
   ========================================================= */
function genLevel6(forcedKind=''){
  const templates=[
    {id:'water',a:3,b:12,
      situation:'容器に水を一定の割合で入れます。水を入れ始めてから \\(x\\) 分後の水量を \\(y\\) L とすると、以下の式が成り立ちます。',
      equation:'y=3x+12',
      rateQuestion:'1分たつごとの水の増加量を答えなさい。',
      initialQuestion:'水を入れ始めたときの水量を答えなさい。',
      variables:'\\(x\\) は時間（分）、\\(y\\) は水の量（L）',
      rateMeaning:'1分たつごとに水が3 L増える',
      initialMeaning:'水を入れ始めたときには12 L入っている'},
    {id:'candle',a:-0.5,b:18,
      situation:'ろうそくが一定の割合で短くなるとします。火をつけてから \\(x\\) 分後の長さを \\(y\\) cm とすると、以下の式が成り立ちます。',
      equation:'y=-0.5x+18',
      rateQuestion:'1分たつごとの長さの増加量を答えなさい。',
      initialQuestion:'火をつけたときのろうそくの長さを答えなさい。',
      variables:'\\(x\\) は時間（分）、\\(y\\) は長さ（cm）',
      rateMeaning:'1分たつごとに長さが0.5 cm減る',
      initialMeaning:'火をつけたときの長さは18 cmである'},
    {id:'temperature',a:4,b:20,
      situation:'水温が一定の割合で上がる範囲を考えます。加熱を始めてから \\(x\\) 分後の温度を \\(y\\) ℃ とすると、以下の式が成り立ちます。',
      equation:'y=4x+20',
      rateQuestion:'1分たつごとの温度の増加量を答えなさい。',
      initialQuestion:'加熱を始めたときの水温を答えなさい。',
      variables:'\\(x\\) は時間（分）、\\(y\\) は温度（℃）',
      rateMeaning:'1分たつごとに温度が4 ℃上がる',
      initialMeaning:'加熱を始めたときの水温は20 ℃である'},
    {id:'battery',a:-6,b:96,
      situation:'機器の充電量が一定の割合で減るとします。使用開始から \\(x\\) 時間後の充電量を \\(y\\) % とすると、以下の式が成り立ちます。',
      equation:'y=-6x+96',
      rateQuestion:'1時間たつごとの充電量の増加量を答えなさい。',
      initialQuestion:'使用を始めたときの充電量を答えなさい。',
      variables:'\\(x\\) は時間（時間）、\\(y\\) は充電量（%）',
      rateMeaning:'1時間たつごとに充電量が6ポイント減る',
      initialMeaning:'使用を始めたときの充電量は96 %である'},
    {id:'distance',a:0.8,b:5,
      situation:'基準地点から離れる向きに、一定の速さで進みます。時間を測り始めてから \\(x\\) 分後の基準地点からの距離を \\(y\\) km とすると、以下の式が成り立ちます。',
      equation:'y=0.8x+5',
      rateQuestion:'1分たつごとの、基準地点からの距離の増加量を答えなさい。',
      initialQuestion:'時間を測り始めたときの、基準地点からの距離を答えなさい。',
      variables:'\\(x\\) は時間（分）、\\(y\\) は基準地点からの距離（km）',
      rateMeaning:'1分たつごとに基準地点からの距離が0.8 km増える',
      initialMeaning:'時間を測り始めたとき、基準地点から5 km離れている'},
    {id:'tank',a:1.5,b:8,
      situation:'水位が一定の割合で上がる範囲を考えます。水を入れ始めてから \\(x\\) 分後の水位を \\(y\\) cm とすると、以下の式が成り立ちます。',
      equation:'y=1.5x+8',
      rateQuestion:'1分たつごとの水位の増加量を答えなさい。',
      initialQuestion:'水を入れ始めたときの水位を答えなさい。',
      variables:'\\(x\\) は時間（分）、\\(y\\) は水位（cm）',
      rateMeaning:'1分たつごとに水位が1.5 cm上がる',
      initialMeaning:'水を入れ始めたときの水位は8 cmである'}
  ];
  const t=pick(templates);
  const kind=forcedKind||pick(['rate','initial']);
  const isRate=kind==='rate';
  const question=isRate?t.rateQuestion:t.initialQuestion;
  const answer=isRate?t.a:t.b;
  const meaning=isRate?t.rateMeaning:t.initialMeaning;
  return {
    level:6,
    label:question,
    context:t.situation,
    display:`\\( ${t.equation} \\)`,
    extra:'<p class="context-note">※答えには単位を付けず、数で入力しよう。</p>',
    ansValue:answer,
    ansLatex:String(answer),
    hints:isRate?[
      `この問題で ${t.variables} を表しているよ。`,
      '\\(x\\) が1増えるときの \\(y\\) の増加量は、式の \\(x\\) の係数を見ると分かるよ。',
      `答えは \\(${answer}\\)。これは「${meaning}」ことを表しているよ。`
    ]:[
      `この問題で ${t.variables} を表しているよ。`,
      '「始めたとき」は \\(x=0\\) のときだよ。式に \\(x=0\\) を代入しよう。',
      `答えは \\(${answer}\\)。これは「${meaning}」ことを表しているよ。`
    ],
    solution:isRate
      ? `式の \\(x\\) の係数は \\(${answer}\\)。つまり、${meaning}ことを表す。`
      : `始めたときは \\(x=0\\)。式に代入すると \\(y=${answer}\\)。つまり、${meaning}。`,
    contextId:`${t.id}-${kind}`,
    questionKind:kind
  };
}

/* ---------- セッション生成 ---------- */
function generateSession(level, count=5){
  const generators={1:genLevel1,2:genLevel2,3:genLevel3,4:genLevel4,5:genLevel5,6:genLevel6};
  const gen=generators[level]||genLevel1;
  const level6Kinds=level===6
    ? shuffle(Array.from({length:count},(_,i)=>i%2===0?'rate':'initial'))
    : [];
  const out=[];
  const seen=new Set();
  let guard=0;
  while(out.length<count && guard<200){
    guard++;
    const q = level===6 ? gen(level6Kinds[out.length]) : gen();
    const key = level===6
      ? `${q.contextId}|${q.questionKind}`
      : q.label+'|'+q.display+'|'+q.ansLatex+'|'+q.extra;
    if(seen.has(key)) continue;
    seen.add(key);
    q.id = out.length;
    out.push(q);
  }
  return out;
}
