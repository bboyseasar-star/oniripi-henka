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
function eqLatex(a, b){ // a は整数想定、b 整数
  let s = a===1?'x':a===-1?'-x':`${a}x`;
  if(b>0) s+=`+${b}`; else if(b<0) s+=`-${-b}`;
  return `y=${s}`;
}

const RNG = (lo,hi)=>lo+Math.floor(Math.random()*(hi-lo+1));
const pick = arr=>arr[Math.floor(Math.random()*arr.length)];
const shuffle = arr=>arr.slice().sort(()=>Math.random()-0.5);

/* =========================================================
   レベル1：式から変化の割合を即答 / 増加量
   ========================================================= */
function genLevel1(){
  const a = pick([-3,-2,-1,2,3,4,-4]);
  const b = RNG(-5,5);
  const type = Math.random()<0.5 ? 'rate' : 'inc';
  if(type==='rate'){
    return {
      level:1,
      label:'変化の割合を求めなさい',
      display:`\\( ${eqLatex(a,b)} \\)`,
      extra:'',
      ansValue:a,
      ansLatex:String(a),
      hints:[
        '1次関数 \\(y=ax+b\\) の変化の割合は、いつも傾き \\(a\\) に等しいよ。',
        `この式の \\(x\\) の係数を見てみよう。`,
        `答えは \\( ${a} \\)。変化の割合 = 傾き = ${a}`
      ],
      solution:`1次関数 \\(y=ax+b\\) の変化の割合は傾き \\(a\\)。よって \\( ${a} \\)。`
    };
  }else{
    const dx = RNG(2,5);
    const dy = a*dx;
    return {
      level:1,
      label:`\\(x\\) が ${dx} 増えるときの \\(y\\) の増加量は？`,
      display:`\\( ${eqLatex(a,b)} \\)`,
      extra:'',
      ansValue:dy,
      ansLatex:String(dy),
      hints:[
        '（\\(y\\)の増加量）＝（変化の割合）×（\\(x\\)の増加量）だよ。',
        `変化の割合は ${a}、\\(x\\)の増加量は ${dx}。`,
        `答えは \\( ${a}\\times${dx}=${dy} \\)`
      ],
      solution:`\\(y\\)の増加量 ＝ ${a}×${dx} ＝ ${dy}`
    };
  }
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
    solution:`変化の割合 ＝ (\\(y\\)の増加量)/(\\(x\\)の増加量) ＝ \\( ${ratLatex(sp,sq)} \\)`
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
      solution:`\\(x=${x1}\\)で\\(y=${y1}\\)、\\(x=${x2}\\)で\\(y=${y2}\\)。変化の割合 ＝ ${dy}/${dx} ＝ \\( ${ratLatex(dy,dx)} \\)`
    };
  }
}

/* ---------- セッション生成 ---------- */
function generateSession(level, count=5){
  const gen = level===1?genLevel1 : level===2?genLevel2 : genLevel3;
  const out=[];
  const seen=new Set();
  let guard=0;
  while(out.length<count && guard<200){
    guard++;
    const q = gen();
    const key = q.label+'|'+q.display+'|'+q.ansLatex+'|'+q.extra;
    if(seen.has(key)) continue;
    seen.add(key);
    q.id = out.length;
    out.push(q);
  }
  return out;
}
