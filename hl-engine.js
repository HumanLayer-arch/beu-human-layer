'use strict';

/* ================================================================
HL ENGINE v3 - Be U Human Layer
================================================================ /

var HLEngine = (function () {

/ ── STORAGE ─────────────────────────────────────────── /
var KEYS = {
HISTORY: 'beu_history_v3',
COACH_LAST: 'beu_coach_last',
PATTERN_LAST: 'beu_pattern_last'
};

var MAX_HISTORY = 20;

/ ================================================================
1. FLAGS
================================================================ /

function detectFlags(text){
if(!text || typeof text !== 'string') return [];
var t = text.toLowerCase();
var flags = [];

var evitacion=['no quiero','miedo','evitar','huir','escapar','no puedo','tengo que','obligado','debo','forzado','atrapado','no me queda'];
if(evitacion.some(function(w){return t.indexOf(w)>=0;})) flags.push('decision_desde_evitacion');

var confusion=['no sé','no se','confuso','perdido','bloqueo','bloqueado','tal vez','quizas','quizás','duda','no entiendo','no clear','no tengo claro'];
if(confusion.some(function(w){return t.indexOf(w)>=0;})) flags.push('baja_claridad');

var ambicion=['crecer','expandir','lanzar','emprender','ambicion','ambición','grande','oportunidad','potencial','exito','éxito','lograr','nuevo negocio','proyecto'];
if(ambicion.some(function(w){return t.indexOf(w)>=0;})) flags.push('ambicion_de_crecimiento');

if(text.length>120) flags.push('decision_critica');

var costo=['si no hago','si no actuo','si no actúo','si no decido','si no cambio','me arrepentiré','me arrepentire'];
if(costo.some(function(w){return t.indexOf(w)>=0;})) flags.push('costo_de_no_actuar');

return flags;
}

/ ================================================================
2. DIRECCIÓN
================================================================ /

function detectLifeDirection(text,flags){
if(!flags) flags=[];
var t=(text||'').toLowerCase();

var cambioWords=['cambiar','cambio','dejar','empezar de nuevo','reinventarme','romper con','salir de','transformar','giro','ruptura'];
if(cambioWords.some(function(w){return t.indexOf(w)>=0;})) return 'cambio';

if(flags.indexOf('ambicion_de_crecimiento')>=0) return 'expansion';

if(flags.indexOf('decision_desde_evitacion')>=0) return 'proteccion';
if(flags.indexOf('baja_claridad')>=0) return 'proteccion';

var expansionWords=['oportunidad','crecer','aprender','mejorar','avanzar','construir','desarrollar','explorar','invertir','lanzar'];
if(expansionWords.some(function(w){return t.indexOf(w)>=0;})) return 'expansion';

return 'proteccion';
}

/ ================================================================
3. IDENTIDAD
================================================================ /

function flagsToIdentity(flags){
if(!Array.isArray(flags)) return null;
if(flags.indexOf('decision_desde_evitacion')>=0) return 'evitador';
if(flags.indexOf('ambicion_de_crecimiento')>=0) return 'constructor';
if(flags.indexOf('baja_claridad')>=0) return 'protector';
return null;
}

/ ================================================================
4. COHERENCIA
================================================================ /

function detectLifeCoherence(currentDirection,history){
if(!Array.isArray(history)||history.length<2) return 'alineado';

var recent=history.slice(0,5).filter(function(e){return e.lifeDirection;});
if(!recent.length) return 'alineado';

var freq={expansion:0,proteccion:0,cambio:0};
recent.forEach(function(e){ if(freq[e.lifeDirection]!==undefined) freq[e.lifeDirection]++; });

var dominant=Object.keys(freq).sort(function(a,b){return freq[b]-freq[a];})[0];
var dominantCount=freq[dominant];
var total=recent.length;

if(dominantCount>=total0.8 && currentDirection!==dominant) return 'ruptura';
if(currentDirection===dominant && dominantCount>=total0.6) return 'alineado';

return 'tension';
}

/ ================================================================
5. RELACIÓN
================================================================ /

function detectDecisionRelationship(currentDirection,history){
if(!Array.isArray(history)||history.length<1) return 'continuidad';

var recent=history.slice(0,3).filter(function(e){return e.lifeDirection;});
if(!recent.length) return 'continuidad';

var lastDir=recent[0].lifeDirection;

if(currentDirection===lastDir) return 'continuidad';

var opuestos={
expansion:'proteccion',
proteccion:'expansion',
cambio:'proteccion'
};

if(opuestos[currentDirection]===lastDir || opuestos[lastDir]===currentDirection){
return 'compensacion';
}

return 'contradiccion';
}

/ ================================================================
6. MENSAJES
================================================================ /

var COHERENCIA_MENSAJES={
alineado:{
continuidad:'Esta decision sigue la linea que vienes marcando.',
compensacion:'Tus decisiones muestran equilibrio.',
contradiccion:'Mantienes patron con ligera variacion.'
},
tension:{
continuidad:'Hay tension en tus decisiones recientes.',
compensacion:'Puede ser equilibrio o evitacion.',
contradiccion:'No hay patron claro.'
},
ruptura:{
continuidad:'Hay un cambio importante.',
compensacion:'Algo ha cambiado en ti.',
contradiccion:'Ruptura clara con tu camino.'
}
};

function getCoherenciaTexto(coherencia,relationship){
var block=COHERENCIA_MENSAJES[coherencia]||COHERENCIA_MENSAJES['alineado'];
return block[relationship]||block['continuidad'];
}

/ ================================================================
7. IDENTIDAD DOMINANTE
================================================================ /

function getDominantIdentity(){
var history=getHistory();
if(!history.length) return null;

var counts={evitador:0,protector:0,constructor:0};
history.forEach(function(e){
if(e.identity && counts[e.identity]!==undefined) counts[e.identity]++;
});

var entries=Object.keys(counts).map(function(k){return [k,counts[k]];});
entries.sort(function(a,b){return b[1]-a[1];});

var top=entries[0];
if(top[1]===0) return null;

return {type:top[0],ratio:top[1]/history.length};
}

/ ================================================================
8. STATS DIRECCIÓN
================================================================ */

function getLifeDirectionStats(){
var history=getHistory();
if(!history.length) return null;

var counts={expansion:0,proteccion:0,cambio:0};
history.forEach(function(e){
if(e.lifeDirection && counts[e.lifeDirection]!==undefined) counts[e.lifeDirection]++;
});

var total=history.length;
var dominant=Object.keys(counts).sort(function(a,b){return counts[b]-counts[a];})[0];

var percentages={};
Object.keys(counts).forEach(function(k){
percentages[k]=Math.round((counts[k]/total)100);
});

var last5=history.slice(0,5);

return {dominant:dominant,percentages:percentages,last5:last5,total:total};
}

/ ================================================================
9. TEXTOS
================================================================ /

var IDENTITY_TEXTS={
evitador:'Decides desde evitar.',
protector:'Decides desde proteger.',
constructor:'Decides desde construir.'
};

var DIRECTION_TEXTS={
expansion:'Modo crecimiento.',
proteccion:'Modo seguridad.',
cambio:'Modo transformacion.'
};

/ ================================================================
10. PATRONES
================================================================ /

function detectRepeatedPattern(currentFlags){
var history=getHistory().slice(0,5);
if(!history.length) return null;

var count={};
history.forEach(function(e){
(e.flags||[]).forEach(function(f){count[f]=(count[f]||0)+1;});
});
(currentFlags||[]).forEach(function(f){count[f]=(count[f]||0)+1;});

return Object.keys(count).find(function(k){return count[k]>=3;})||null;
}

var PATTERN_MESSAGES={
decision_desde_evitacion:'Patron de evitacion detectado.',
baja_claridad:'Confusion recurrente.',
ambicion_de_crecimiento:'Estas en expansion.',
decision_critica:'Decisiones importantes acumuladas.',
costo_de_no_actuar:'Presion por actuar.'
};

/ ================================================================
11. COACH
================================================================ /

function getCoachMessage(){
var last=parseInt(localStorage.getItem(KEYS.COACH_LAST)||'0',10);
if(Date.now()-last<86400000) return null;
localStorage.setItem(KEYS.COACH_LAST,String(Date.now()));
return 'Reflexiona sin prisa.';
}

/ ================================================================
12. FALLBACK
================================================================ /

function getLocalInsight(flags){
return {
reflexion:'Reflexion generada localmente.',
insight:'Observa tu patron.',
impacto:'Variable.',
coherencia:'Revisa coherencia.',
pregunta:'Que harías sin miedo?'
};
}

/ ================================================================
13. STORAGE
================================================================ /

function getHistory(){
try{return JSON.parse(localStorage.getItem(KEYS.HISTORY)||'[]');}
catch(e){return [];}
}

function saveEntry(entry){
var history=getHistory();
history.unshift(entry);
if(history.length>MAX_HISTORY) history=history.slice(0,MAX_HISTORY);
localStorage.setItem(KEYS.HISTORY,JSON.stringify(history));
}

function buildEntry(text,flags,insight,lifeDirection,coherence,relationship){
return {
id:Date.now(),
text:text.substring(0,200),
flags:flags||[],
identity:flagsToIdentity(flags),
lifeDirection:lifeDirection||'proteccion',
coherence:coherence||'alineado',
relationship:relationship||'continuidad',
insight:insight||null,
ts:new Date().toISOString()
};
}

/ ── API ───────────────────────────────────── */
return {
detectFlags:detectFlags,
detectLifeDirection:detectLifeDirection,
detectLifeCoherence:detectLifeCoherence,
detectDecisionRelationship:detectDecisionRelationship,
flagsToIdentity:flagsToIdentity,
getCoherenciaTexto:getCoherenciaTexto,
getDominantIdentity:getDominantIdentity,
getLifeDirectionStats:getLifeDirectionStats,
detectRepeatedPattern:detectRepeatedPattern,
getCoachMessage:getCoachMessage,
getLocalInsight:getLocalInsight,
getHistory:getHistory,
saveEntry:saveEntry,
buildEntry:buildEntry,
IDENTITY_TEXTS:IDENTITY_TEXTS,
DIRECTION_TEXTS:DIRECTION_TEXTS,
PATTERN_MESSAGES:PATTERN_MESSAGES
};

})();
