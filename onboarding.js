'use strict';

/* ================================================================
   ONBOARDING - Be U
   Controls the 3-slide intro experience.
   Uses localStorage to remember if user has seen it.
   ================================================================ */

var OB = (function() {

  var STORAGE_KEY = 'beu_onboarding_done';
  var currentSlide = 0;
  var totalSlides  = 3;

  /* Check if onboarding was already completed */
  function isDone() {
    return localStorage.getItem(STORAGE_KEY) === '1';
  }

  /* Mark onboarding as complete */
  function markDone() {
    localStorage.setItem(STORAGE_KEY, '1');
  }

  /* Update the slide UI */
  function updateSlides() {
    // Update slide visibility
    var slides = document.querySelectorAll('.ob-slide');
    slides.forEach(function(s, i) {
      s.classList.toggle('active', i === currentSlide);
    });

    // Update dot indicators
    var dots = document.querySelectorAll('.ob-dot-nav');
    dots.forEach(function(d, i) {
      d.classList.toggle('active', i === currentSlide);
    });

    // Update next button text on last slide
    var btn = document.getElementById('ob-next');
    if (btn) {
      btn.textContent = currentSlide === totalSlides - 1 ? 'Empezar' : 'Siguiente';
    }
  }

  /* Advance to next slide or complete */
  function next() {
    if (currentSlide < totalSlides - 1) {
      currentSlide++;
      updateSlides();
    } else {
      complete();
    }
  }

  /* Skip all slides */
  function skip() {
    complete();
  }

  /* Mark done and show app */
  function complete() {
    markDone();
    showApp();
  }

  /* Switch screens */
  function showApp() {
    var ob  = document.getElementById('screen-onboarding');
    var app = document.getElementById('screen-app');
    if (ob)  ob.classList.remove('active');
    if (app) app.classList.add('active');
    // Let app initialize after onboarding
    if (typeof APP !== 'undefined' && APP.init) APP.init();
  }

  /* Entry point: decide which screen to show */
  function start() {
    if (isDone()) {
      showApp();
    } else {
      var ob = document.getElementById('screen-onboarding');
      if (ob) ob.classList.add('active');
      updateSlides();
    }
  }

  return { start: start, next: next, skip: skip };

})();
