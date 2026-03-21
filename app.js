'use strict';

/* ================================================================
   APP.JS - Be U
   Main application logic. Connects all modules.
   ================================================================ */

var APP = (function() {

  var AI_ENDPOINT = '/api/hl-insight';
  var AI_TIMEOUT  = 8000;

  /* ── DOM REFERENCES ─────────────────────────────────────────── */
  var el = {};

  function cacheDOM() {
    var ids = [
      'decisionInput','btnAnalyze','loading','resultZone',
      'insightReflexion','insightInsight','insightPregunta',
      'identityCard','identityText',
      'bannerCoach','bannerCoachText',
      'bannerPattern','bannerPatternText',
      'bannerStreak','bannerStreakText',
      'streakBadge','streakCount',
      'histList','identityProfile',
      'navReflect','navHistory','navIdentity',
      'view-reflect','view-history','view-identity'
    ];
    ids.forEach(function(id) { el[id] = document.getElementById(id); });
  }

  /* ── SECURITY: sanitize user text before rendering ──────────── */
  function sanitize(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;')
      .replace(/'/g,  '&#x27;');
  }

  /* ── HELPERS ────────────────────────────────────────────────── */
  function show(elem) { if (elem) elem.style.display = ''; }
  function hide(elem) { if (elem) elem.style.display = 'none'; }

  function setBanner(bannerEl, textEl, msg, colorClass) {
    if (!bannerEl || !textEl) return;
    textEl.textContent = msg;
    bannerEl.className = 'banner show ' + (colorClass || 'neutral');
  }

  function hideBanner(bannerEl) {
    if (bannerEl) bannerEl.classList.remove('show');
  }

  function setBtn(disabled, text) {
    if (!el.btnAnalyze) return;
    el.btnAnalyze.disabled    = disabled;
    el.btnAnalyze.textContent = text || 'Ver lo que pasa';
  }

  /* ── VIEW NAVIGATION ────────────────────────────────────────── */
  function showView(view) {
    var views = ['reflect','history','identity'];
    views.forEach(function(v) {
      var vEl  = el['view-' + v];
      var navEl = el['nav' + v.charAt(0).toUpperCase() + v.slice(1)];
      if (vEl)  vEl.classList.toggle('active',  v === view);
      if (navEl) navEl.classList.toggle('active', v === view);
    });
    if (view === 'history')  renderHistory();
    if (view === 'identity') renderIdentityProfile();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ── STREAK UI ──────────────────────────────────────────────── */
  function updateStreakUI() {
    var streak = Habit.getStreak();
    if (streak >= 2 && el.streakBadge && el.streakCount) {
      el.streakBadge.style.display = 'flex';
      el.streakCount.textContent   = String(streak);
    }
    var streakMsg = Habit.getStreakMessage(streak);
    if (streakMsg) {
      setBanner(el.bannerStreak, el.bannerStreakText, streakMsg, 'green');
    } else {
      hideBanner(el.bannerStreak);
    }
  }

  /* ── IDENTITY UI ─────────────────────────────────────────────── */
  function updateIdentityUI() {
    var identity = HLEngine.getDominantIdentity();
    if (!identity || !el.identityCard || !el.identityText) return;
    if (identity.ratio >= 0.4) { // Only show if clearly dominant
      el.identityText.textContent = HLEngine.IDENTITY_TEXTS[identity.type] || '';
      el.identityCard.classList.add('show');
    }
  }

  /* ── COACH ───────────────────────────────────────────────────── */
  function checkCoach() {
    var msg = HLEngine.getCoachMessage();
    if (msg) setBanner(el.bannerCoach, el.bannerCoachText, msg, 'neutral');
    else     hideBanner(el.bannerCoach);
  }

  /* ── AI CALL ─────────────────────────────────────────────────── */
  function callAI(text, flags) {
    var controller = new AbortController();
    var timeout    = setTimeout(function() { controller.abort(); }, AI_TIMEOUT);

    return fetch(AI_ENDPOINT, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ contexto: text.substring(0, 2000), flags: flags }),
      signal:  controller.signal
    })
    .then(function(res) {
      clearTimeout(timeout);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function(data) {
      clearTimeout(timeout);
      if (!data || !data.reflexion) throw new Error('Invalid response');
      return data;
    })
    .catch(function(e) {
      clearTimeout(timeout);
      throw e;
    });
  }

  /* ── RENDER INSIGHT ──────────────────────────────────────────── */
  function renderInsight(insight) {
    if (!insight) return;
    // Always use textContent to prevent XSS
    if (el.insightReflexion) el.insightReflexion.textContent = insight.reflexion || '';
    if (el.insightInsight)   el.insightInsight.textContent   = insight.insight   || '';
    if (el.insightPregunta)  el.insightPregunta.textContent  = insight.pregunta  || '';
    if (el.resultZone)       el.resultZone.classList.add('show');
  }

  /* ── MAIN ANALYSIS FLOW ──────────────────────────────────────── */
  function analyze() {
    var text = el.decisionInput ? el.decisionInput.value.trim() : '';
    if (!text) {
      if (el.decisionInput) {
        el.decisionInput.focus();
        el.decisionInput.style.borderColor = 'var(--red)';
        setTimeout(function() { if (el.decisionInput) el.decisionInput.style.borderColor = ''; }, 1500);
      }
      return;
    }

    // Reset UI state
    if (el.resultZone)  el.resultZone.classList.remove('show');
    hideBanner(el.bannerPattern);

    // Detect patterns
    var flags   = HLEngine.detectFlags(text);
    var repeated = HLEngine.detectRepeatedPattern(flags);

    // Show pattern banner if needed
    if (repeated && HLEngine.PATTERN_MESSAGES[repeated]) {
      setBanner(el.bannerPattern, el.bannerPatternText, HLEngine.PATTERN_MESSAGES[repeated], 'amber');
    }

    // Show loading
    setBtn(true, 'Analizando...');
    if (el.loading) el.loading.classList.add('show');

    // Try AI, fall back to local
    callAI(text, flags)
      .catch(function() {
        // AI failed -- use local insight silently
        return HLEngine.getLocalInsight(flags);
      })
      .then(function(insight) {
        // Hide loading
        if (el.loading) el.loading.classList.remove('show');
        setBtn(false);

        // Render result
        renderInsight(insight);

        // Record in memory
        var entry = HLEngine.buildEntry(text, flags, {
          reflexion: insight.reflexion,
          insight:   insight.insight,
          pregunta:  insight.pregunta
        });
        HLEngine.saveEntry(entry);

        // Record habit / streak
        var newStreak = Habit.recordReflection();
        updateStreakUI();
        updateIdentityUI();

        // Scroll to result
        if (el.resultZone) el.resultZone.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
  }

  /* ── RESET ───────────────────────────────────────────────────── */
  function reset() {
    if (el.decisionInput) { el.decisionInput.value = ''; el.decisionInput.focus(); }
    if (el.resultZone)    el.resultZone.classList.remove('show');
    hideBanner(el.bannerPattern);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ── RENDER HISTORY ──────────────────────────────────────────── */
  function renderHistory() {
    var container = el.histList;
    if (!container) return;
    container.textContent = '';

    var history = HLEngine.getHistory();
    if (!history.length) {
      var empty = document.createElement('div');
      empty.className   = 'empty-state';
      empty.textContent = 'Aun no tienes reflexiones guardadas. Comparte tu primera decision.';
      container.appendChild(empty);
      return;
    }

    history.forEach(function(entry) {
      var item = document.createElement('div');
      item.className = 'hist-item';

      var title = document.createElement('div');
      title.className   = 'hist-item-title';
      title.textContent = entry.text || ''; // textContent is safe

      var meta = document.createElement('div');
      meta.className = 'hist-item-meta';

      if (entry.identity) {
        var tag = document.createElement('span');
        tag.className   = 'hist-tag ' + entry.identity;
        tag.textContent = entry.identity;
        meta.appendChild(tag);
      }

      var date = document.createElement('span');
      date.className   = 'hist-date';
      date.textContent = entry.ts ? new Date(entry.ts).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
      meta.appendChild(date);

      item.appendChild(title);
      item.appendChild(meta);
      container.appendChild(item);
    });
  }

  /* ── RENDER IDENTITY PROFILE ─────────────────────────────────── */
  function renderIdentityProfile() {
    var container = el.identityProfile;
    if (!container) return;
    container.textContent = '';

    var identity = HLEngine.getDominantIdentity();
    var history  = HLEngine.getHistory();
    var streak   = Habit.getStreak();

    if (!history.length) {
      var empty = document.createElement('div');
      empty.className   = 'empty-state';
      empty.textContent = 'Comparte al menos 3 decisiones para ver tu perfil.';
      container.appendChild(empty);
      return;
    }

    // Stats card
    var stats = document.createElement('div');
    stats.className = 'card';
    stats.innerHTML = ''; // clear first

    var statsTitle = document.createElement('div');
    statsTitle.className = 'card-title';
    statsTitle.textContent = 'Tu actividad';
    stats.appendChild(statsTitle);

    var statsBody = document.createElement('div');
    statsBody.style.cssText = 'display:flex;gap:20px;margin-top:14px';

    var stat1 = buildStat(String(history.length), 'reflexiones');
    var stat2 = buildStat(String(streak), 'dias seguidos');
    statsBody.appendChild(stat1);
    statsBody.appendChild(stat2);
    stats.appendChild(statsBody);
    container.appendChild(stats);

    // Identity card
    if (identity) {
      var idCard = document.createElement('div');
      idCard.className = 'card mt-12';

      var idTitle = document.createElement('div');
      idTitle.className   = 'card-title';
      idTitle.textContent = 'Tu patron: ' + identity.type;

      var idText = document.createElement('div');
      idText.className   = 'card-sub mt-8';
      idText.textContent = HLEngine.IDENTITY_TEXTS[identity.type] || '';

      var idRatio = document.createElement('div');
      idRatio.style.cssText = 'margin-top:12px;font-size:13px;color:var(--ink-3)';
      idRatio.textContent   = 'Presente en el ' + Math.round(identity.ratio * 100) + '% de tus reflexiones';

      idCard.appendChild(idTitle);
      idCard.appendChild(idText);
      idCard.appendChild(idRatio);
      container.appendChild(idCard);
    } else {
      var moreCard = document.createElement('div');
      moreCard.className   = 'card mt-12';
      moreCard.textContent = 'Agrega mas reflexiones para ver tu patron dominante.';
      container.appendChild(moreCard);
    }
  }

  function buildStat(value, label) {
    var wrap = document.createElement('div');
    var num  = document.createElement('div');
    num.style.cssText   = 'font-size:32px;font-weight:700;line-height:1;color:var(--green)';
    num.textContent     = value;
    var lbl = document.createElement('div');
    lbl.style.cssText   = 'font-size:12px;color:var(--ink-3);margin-top:3px';
    lbl.textContent     = label;
    wrap.appendChild(num);
    wrap.appendChild(lbl);
    return wrap;
  }

  /* ── INIT ────────────────────────────────────────────────────── */
  function init() {
    cacheDOM();
    updateStreakUI();
    updateIdentityUI();
    checkCoach();
  }

  /* ── BOOT ────────────────────────────────────────────────────── */
  // Called on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', function() {
    OB.start(); // Onboarding decides which screen to show
  });

  return {
    init:     init,
    analyze:  analyze,
    reset:    reset,
    showView: showView
  };

})();
