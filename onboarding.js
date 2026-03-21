'use strict';

/* ================================================================
ONBOARDING - Be U
================================================================ /

var OB = (function () {

var KEY = 'beu_onboarding_done';
var currentSlide = 0;
var TOTAL_SLIDES = 3;

function isDone() {
return localStorage.getItem(KEY) === '1';
}

function markDone() {
localStorage.setItem(KEY, '1');
}

function updateUI() {
document.querySelectorAll('.ob-slide').forEach(function (s, i) {
s.classList.toggle('active', i === currentSlide);
});

document.querySelectorAll('.ob-dot-nav').forEach(function (d, i) {
d.classList.toggle('active', i === currentSlide);
});

var btn = document.getElementById('ob-next');
if (btn) {
btn.textContent = currentSlide === TOTAL_SLIDES - 1 ? 'Empezar' : 'Siguiente';
}
}

function next() {
if (currentSlide < TOTAL_SLIDES - 1) {
currentSlide++;
updateUI();
} else {
complete();
}
}

function skip() {
complete();
}

function complete() {
markDone();
showApp();
}

function showApp() {
var ob = document.getElementById('screen-onboarding');
var app = document.getElementById('screen-app');

if (ob) ob.classList.remove('active');
if (app) app.classList.add('active');

/ Inicializa la app solo cuando onboarding termina */
if (typeof APP !== 'undefined' && APP.init) {
APP.init();
}
}

function start() {
if (isDone()) {
showApp();
} else {
var ob = document.getElementById('screen-onboarding');
if (ob) ob.classList.add('active');
updateUI();
}
}

return {
start: start,
next: next,
skip: skip
};

})();
