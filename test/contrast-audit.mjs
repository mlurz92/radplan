// WCAG contrast audit — virtual review of text/surface pairs in both themes.
// Composites alpha over the relevant base surface and flags pairs < AA.
function hex(h){h=h.replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
function over(fg,a,bg){return fg.map((c,i)=>Math.round(c*a+bg[i]*(1-a)));}
function lum(rgb){const f=rgb.map(c=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4);});return 0.2126*f[0]+0.7152*f[1]+0.0722*f[2];}
function ratio(a,b){const l1=lum(a),l2=lum(b);const hi=Math.max(l1,l2),lo=Math.min(l1,l2);return (hi+0.05)/(lo+0.05);}

// Theme tokens (resolved from core.css)
const DARK={navy900:'#0B131F',navy800:'#111C2E',navy700:'#18283F',ink:[255,255,255]};
const LIGHT={navy900:'#F4F1EA',navy800:'#ECE7DC',navy700:'#E2DCCC',ink:[15,23,42]};
const G={50:'#F8FAFC',100:'#F1F5F9',150:'#E9EFF6',200:'#E2E8F0',300:'#CBD5E1',400:'#94A3B8',500:'#64748B',600:'#475569',700:'#334155',800:'#1E293B',900:'#0F172A'};
const ACCENT='#0EA5E9', GREEN='#22C55E', RED='#EF4444';
const MODAL_DARK=over([255,255,255],0.98,hex(DARK.navy900)); // ~white card on dark canvas
const MODAL_LIGHT=over([255,255,255],0.98,hex(LIGHT.navy900));

// inkAlpha(a, theme) → composited ink color at alpha over a given surface
function inkOn(a,theme,surface){return over(theme.ink,a,surface);}

const tests=[];
function T(name,fg,bg,big=false,exempt=false){const r=ratio(Array.isArray(fg)?fg:hex(fg),Array.isArray(bg)?bg:hex(bg));const min=big?3.0:4.5;tests.push({name,r:+r.toFixed(2),pass:exempt||r>=min,min,exempt});}

// ---- Dark canvas (navy) ----
const dCanvas=over(hex(DARK.navy800),0.85,hex(DARK.navy900));
T('[dark] emp-label ink.88 on td-name(navy700.96)',inkOn(.88,DARK,over(hex(DARK.navy700),.96,hex(DARK.navy900))),over(hex(DARK.navy700),.96,hex(DARK.navy900)));
T('[dark] text-2 (.84) on canvas',inkOn(.84,DARK,hex(DARK.navy900)),hex(DARK.navy900));
T('[dark] text-3 (.70) on canvas',inkOn(.70,DARK,hex(DARK.navy900)),hex(DARK.navy900));
T('[dark] text-faint (.62) on canvas',inkOn(.62,DARK,hex(DARK.navy900)),hex(DARK.navy900));
T('[dark] stats-bar ink.76 on stats-bar surface',inkOn(.76,DARK,dCanvas),dCanvas);

// ---- Light canvas (theme overrides) ----
T('[light] text-2 (.88) on canvas',inkOn(.88,LIGHT,hex(LIGHT.navy900)),hex(LIGHT.navy900));
T('[light] text-3 (.74) on canvas',inkOn(.74,LIGHT,hex(LIGHT.navy900)),hex(LIGHT.navy900));
T('[light] text-faint (.68) on canvas',inkOn(.68,LIGHT,hex(LIGHT.navy900)),hex(LIGHT.navy900));

// ---- White modal (both themes ≈ near-white) ----
[['darkModal',MODAL_DARK],['lightModal',MODAL_LIGHT]].forEach(([t,bg])=>{
  T(`[${t}] gray-800 text`,G[800],bg);
  T(`[${t}] gray-700 text`,G[700],bg);
  T(`[${t}] gray-600 text`,G[600],bg);
  T(`[${t}] gray-500 text`,G[500],bg);
  T(`[${t}] gray-600 placeholder text`,G[600],bg);
});

// ---- Fixed gray-800 table headers (yp/dept/empdash) with gray-300 text ----
T('[hdr] gray-300 on gray-800 header',G[300],G[800]);
T('[hdr] yp-th-now accent-lt on blue/gray-800',hex('#67D4FF'),over(hex(ACCENT),0.2,hex(G[800])));
T('[btn] #fff on #0369A1 (export)',[255,255,255],hex('#0369A1'));
T('[badge] #042231 dark on accent (badges/chips)',hex('#042231'),ACCENT);

// ---- Fixed light surfaces (gray-100 / gray-50) with label text ----
T('[card] gray-600 on gray-100 (dept-th)',G[600],G[100]);
T('[card] gray-500 on gray-50',G[500],G[50]);
T('[card] gray-600 on white',G[600],[255,255,255]);

// ---- Position tags (posColor fg on bg) ----
const POS={CA:['#7E22CE','#F3E8FF'],LOA:['#1D4ED8','#DBEAFE'],OA:['#0F766E','#CCFBF1'],FA:['#15803D','#DCFCE7'],AA:['#475569','#F1F5F9'],fallback:['#475569','#F1F5F9']};
Object.entries(POS).forEach(([k,[fg,bg]])=>T(`[pos] ${k} tag`,fg,bg,true));

// ---- Toast (fixed dark surface) ----
T('[toast] #F8FAFC on slate',[248,250,252],hex('#1E293B'));
T('[toast] error #FFF on dark red',[255,255,255],hex('#781616'));

// ---- yp-eval colored numbers on white ----
['#C2410C','#0369A1','#15803D','#7C3AED','#B91C1C','#0F766E','#64748B'].forEach(c=>T(`[yp] num ${c} on white`,c,[255,255,255]));

// ---- Fixed-light surfaces that previously used theme-ink (white in dark) and
//      went invisible in dark mode. Now pinned to fixed dark ink / fixed grays. ----
T('[pp] text-3 pin (15,23,42 @.64) on gray-50',over([15,23,42],.64,hex(G[50])),hex(G[50]));
T('[pp] text-2 pin (15,23,42 @.80) on gray-50',over([15,23,42],.80,hex(G[50])),hex(G[50]));
T('[tip] text-3 pin (15,23,42 @.62) on glass-light(≈white)',over([15,23,42],.62,[255,255,255]),[255,255,255]);
T('[import] or-divider gray-500 on white',G[500],[255,255,255]);
T('[cmdk] active hint #0369A1 on accent-dim(≈#E8F8FF)',hex('#0369A1'),hex('#E8F8FF'));
T('[pm] today-empty gray-500 on gray-50',G[500],hex(G[50]));
T('[hg] #0369A1 on white',hex('#0369A1'),[255,255,255]);
T('[hg] #0369A1 on #E0F2FE',hex('#0369A1'),hex('#E0F2FE'));
T('[hdr] modal-hd-sub white@.76 on navy-800(dark)',over([255,255,255],.76,hex('#0A1525')),hex('#0A1525'));
T('[hdr] modal-hd-sub slate@.76 on navy-800(cream)',over([15,23,42],.76,hex('#ECE7DC')),hex('#ECE7DC'));
T('[mdc] empty-duty gray-500 on white',G[500],[255,255,255]);
T('[modal-body] pinned text-1 on fixed light modal',hex('#0F172A'),MODAL_DARK);
T('[modal-body] pinned text-3 on fixed light modal',over([15,23,42],.76,MODAL_DARK),MODAL_DARK);
T('[modal-body] pinned text-faint on fixed light modal',over([15,23,42],.68,MODAL_DARK),MODAL_DARK);
T('[mobile-nav] text-2 dark on navy chrome',inkOn(.84,DARK,dCanvas),dCanvas);
T('[mobile-sheet] mday section label gray-600 on gray-50',G[600],hex(G[50]));

// ---- Output ----
const fails=tests.filter(t=>!t.pass);
console.log('Total pairs:',tests.length,'| FAIL:',fails.length);
console.log('\n--- FAILURES (< AA) ---');
fails.forEach(t=>console.log(`✗ ${t.r}  (min ${t.min})  ${t.name}`));
console.log('\n--- borderline pass (AA but < 4.5 large only / <5) ---');
tests.filter(t=>t.pass&&!t.exempt&&t.r<5).forEach(t=>console.log(`~ ${t.r}  ${t.name}`));
if (fails.length) process.exitCode = 1;
