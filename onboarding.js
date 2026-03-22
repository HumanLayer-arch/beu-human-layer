'use strict';

var OB = (function () {

  var currentSlide = 0;

  function next() {
    complete();
  }

  function skip() {
    complete();
  }

  function complete() {
    var ob = document.getElementById('screen-onboarding');
    var app = document.getElementById('screen-app');

    if (ob) ob.classList.remove('active');
    if (app) app.classList.add('active');

    if (typeof APP !== 'undefined' && APP.init) {
      APP.init();
    }
  }

  function start() {
    var ob = document.getElementById('screen-onboarding');
    if (ob) ob.classList.add('active');
  }

  return {
    start: start,
    next: next,
    skip: skip
  };

})();
