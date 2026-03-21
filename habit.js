'use strict';

/* ================================================================
HABIT / STREAK - Be U
================================================================ */

var Habit = (function () {

var KEYS = {
STREAK: 'beu_streak',
LAST: 'beu_streak_last'
};

function todayStr() {
var d = new Date();
return d.getFullYear() + '-' +
String(d.getMonth() + 1).padStart(2, '0') + '-' +
String(d.getDate()).padStart(2, '0');
}

function yesterdayStr() {
var d = new Date();
d.setDate(d.getDate() - 1);
return d.getFullYear() + '-' +
String(d.getMonth() + 1).padStart(2, '0') + '-' +
String(d.getDate()).padStart(2, '0');
}

function getStreak() {
return parseInt(localStorage.getItem(KEYS.STREAK) || '0', 10);
}

function getLastDate() {
return localStorage.getItem(KEYS.LAST) || '';
}

function recordReflection() {
var today = todayStr();
var yest  = yesterdayStr();
var last  = getLastDate();
var streak = getStreak();

if (last === today) return streak;   // ya contado hoy
if (last === yest)  streak++;        // consecutivo
else                streak = 1;      // reset

localStorage.setItem(KEYS.STREAK, String(streak));
localStorage.setItem(KEYS.LAST, today);

return streak;
}

function getStreakMessage(streak) {
if (streak >= 30) return streak + ' dias reflexionando. Esto ya es un habito solido.';
if (streak >= 14) return streak + ' dias seguidos. La consistencia es tu mayor herramienta.';
if (streak >= 7)  return streak + ' dias. Una semana completa de reflexion.';
if (streak >= 3)  return streak + ' dias consecutivos. Lo estas haciendo.';
if (streak >= 2)  return 'Segundo dia consecutivo. El habito esta empezando.';
return null;
}

return {
getStreak: getStreak,
recordReflection: recordReflection,
getStreakMessage: getStreakMessage
};

})();
