'use strict';

/* ================================================================
APP.JS - Be U Human Layer v3
================================================================ /

var APP = (function () {

var AI_ENDPOINT = '/api/hl-insight';
var AI_TIMEOUT  = 8000;

/ ── DOM CACHE ──────────────────────────────────────────────── /
var el = {};
var DOM_IDS = [
'decisionInput','btnAnalyze','loading','resultZone',
'insightReflexion','insightInsight','insightImpacto',
'insightCoherencia','insightPregunta',
'identityCard','identityText',
'bannerCoach','bannerCoachText',
'bannerPattern','bannerPatternText',
'bannerStreak','bannerStreakText',
'bannerCoherence','bannerCoherenceText',
'streakBadge','streakCount',
'histList','identityProfile','directionContent',
'navReflect','navHistory','navIdentity','navDirection'
];

function cacheDOM() {
DOM_IDS.forEach(function (id) { el[id] = document.getElementById(id); });
}

/ ── HELPERS ────────────────────────────────────────────────── /
function show(elem){ if(elem) elem.style.display=''; }
function hide(elem){ if(elem) elem.style.display='none'; }
function mk(tag,cls){ var e=document.createElement(tag); if(cls)e.className=cls; return e; }

function setBanner(bEl,tEl,msg,color){
if(!bEl||!tEl) return;
tEl.textContent=msg;
bEl.className='banner show '+(color||'neutral');
}
function hideBanner(bEl){ if(bEl) bEl.classList.remove('show'); }

function setBtn(disabled,text){
if(!el.btnAnalyze) return;
el.btnAnalyze.disabled=disabled;
el.btnAnalyze.textContent=text||'Ver lo que pasa';
}

/ ── NAVEGACIÓN ─────────────────────────────────────────────── /
var VIEWS=['reflect','history','identity','direction'];

function showView(view){
VIEWS.forEach(function(v){
var vEl=document.getElementById('view-'+v);
var nKey='nav'+v.charAt(0).toUpperCase()+v.slice(1);
if(vEl) vEl.classList.toggle('active',v===view);
if(el[nKey]) el[nKey].classList.toggle('active',v===view);
});
if(view==='history') renderHistory();
if(view==='identity') renderIdentityProfile();
if(view==='direction') renderDirection();
window.scrollTo({top:0,behavior:'smooth'});
}

/ ── STREAK ─────────────────────────────────────────────────── /
function updateStreakUI(){
var streak=Habit.getStreak();
if(streak>=2&&el.streakBadge&&el.streakCount){
el.streakBadge.style.display='flex';
el.streakCount.textContent=String(streak);
}
var msg=Habit.getStreakMessage(streak);
if(msg) setBanner(el.bannerStreak,el.bannerStreakText,msg,'green');
else hideBanner(el.bannerStreak);
}

/ ── IDENTIDAD ─────────────────────────────────────────────── /
function updateIdentityUI(){
var identity=HLEngine.getDominantIdentity();
if(!identity||!el.identityCard||!el.identityText) return;
if(identity.ratio>=0.35){
el.identityText.textContent=HLEngine.IDENTITY_TEXTS[identity.type]||'';
el.identityCard.classList.add('show');
}
}

/ ── COHERENCIA ────────────────────────────────────────────── /
function updateCoherenceBanner(coherence,relationship){
var msg=HLEngine.getCoherenciaTexto(coherence,relationship);
if(!msg){ hideBanner(el.bannerCoherence); return; }
var colorMap={alineado:'green',tension:'amber',ruptura:'purple'};
setBanner(el.bannerCoherence,el.bannerCoherenceText,msg,colorMap[coherence]||'neutral');
}

/ ── AI ───────────────────────────────────────────────────── /
function callAI(text,flags,history){
var ctrl=new AbortController();
var timeout=setTimeout(function(){ctrl.abort();},AI_TIMEOUT);

var recentDirs=(history||[]).slice(0,3).map(function(e){
return e.lifeDirection||'proteccion';
});

return fetch(AI_ENDPOINT,{
method:'POST',
headers:{'Content-Type':'application/json'},
body:JSON.stringify({
contexto:text.substring(0,2000),
flags:flags,
recentDirections:recentDirs
}),
signal:ctrl.signal
})
.then(function(res){
clearTimeout(timeout);
if(!res.ok) throw new Error('HTTP '+res.status);
return res.json();
})
.then(function(data){
if(!data||!data.reflexion) throw new Error('Invalid response');
return data;
})
.catch(function(e){
clearTimeout(timeout);
throw e;
});
}

/ ── RENDER ────────────────────────────────────────────────── /
function renderInsight(insight){
if(!insight) return;
if(el.insightReflexion) el.insightReflexion.textContent=insight.reflexion||'';
if(el.insightInsight) el.insightInsight.textContent=insight.insight||'';
if(el.insightImpacto) el.insightImpacto.textContent=insight.impacto||'';
if(el.insightCoherencia) el.insightCoherencia.textContent=insight.coherencia||'';
if(el.insightPregunta) el.insightPregunta.textContent=insight.pregunta||'';
if(el.resultZone) el.resultZone.classList.add('show');
}

/ ── ANALYZE ───────────────────────────────────────────────── /
function analyze(){
var text=el.decisionInput?el.decisionInput.value.trim():'';
if(!text){
if(el.decisionInput){
el.decisionInput.focus();
el.decisionInput.style.borderColor='var(--red)';
setTimeout(function(){el.decisionInput.style.borderColor='';},1500);
}
return;
}

if(el.resultZone) el.resultZone.classList.remove('show');

var flags=HLEngine.detectFlags(text);
var lifeDirection=HLEngine.detectLifeDirection(text,flags);
var history=HLEngine.getHistory();
var coherence=HLEngine.detectLifeCoherence(lifeDirection,history);
var relationship=HLEngine.detectDecisionRelationship(lifeDirection,history);

setBtn(true,'Analizando...');
if(el.loading) el.loading.classList.add('show');

callAI(text,flags,history)
.catch(function(){
var local=HLEngine.getLocalInsight(flags);
local.coherencia=HLEngine.getCoherenciaTexto(coherence,relationship);
return local;
})
.then(function(insight){

if(el.loading) el.loading.classList.remove('show');
setBtn(false);

renderInsight(insight);

var entry=HLEngine.buildEntry(
text,flags,
insight,
lifeDirection,coherence,relationship
);
HLEngine.saveEntry(entry);

Habit.recordReflection();
updateStreakUI();
updateIdentityUI();
});
}

/ ── RESET ─────────────────────────────────────────────────── /
function reset(){
if(el.decisionInput){
el.decisionInput.value='';
el.decisionInput.focus();
}
if(el.resultZone) el.resultZone.classList.remove('show');
window.scrollTo({top:0,behavior:'smooth'});
}

/ ── INIT ─────────────────────────────────────────────────── /
function init(){
cacheDOM();
updateStreakUI();
updateIdentityUI();
}

/ ── BOOT ─────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded',function(){
if(typeof OB!=='undefined') OB.start();
});

return {
init:init,
analyze:analyze,
reset:reset,
showView:showView
};

})();
