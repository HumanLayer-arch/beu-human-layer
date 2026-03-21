'use strict';

/* ================================================================
   APP.JS - Be U Human Layer v3
   Lógica principal. Conecta HLEngine, Habit, Onboarding.
   ================================================================ */

var APP = (function () {

  var AI_ENDPOINT = '/api/hl-insight';
  var AI_TIMEOUT  = 8000;

  /* ── DOM CACHE ──────────────────────────────────────────────── */
  var el = {};
  var DOM_IDS = [
    'decisionInput', 'btnAnalyze', 'loading', 'resultZone',
    'insightReflexion', 'insightInsight', 'insightImpacto',
    'insightCoherencia', 'insightPregunta',
    'identityCard', 'identityText',
    'bannerCoach',     'bannerCoachText',
    'bannerPattern',   'bannerPatternText',
    'bannerStreak',    'bannerStreakText',
    'bannerCoherence', 'bannerCoherenceText',
    'streakBadge', 'streakCount',
    'histList', 'identityProfile', 'directionContent',
    'navReflect', 'navHistory', 'navIdentity', 'navDirection'
  ];

  function cacheDOM() {
    DOM_IDS.forEach(function (id) { el[id] = document.getElementById(id); });
  }

  /* ── SECURITY ───────────────────────────────────────────────── */
  /* Siempre usar textContent para datos del usuario — nunca innerHTML */
  function sanitize(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  /* ── HELPERS ────────────────────────────────────────────────── */
  function show(elem) { if (elem) elem.style.display = ''; }
  function hide(elem) { if (elem) elem.style.display = 'none'; }
  function mk(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }

  function setBanner(bEl, tEl, msg, color) {
    if (!bEl || !tEl) return;
    tEl.textContent = msg;
    bEl.className   = 'banner show ' + (color || 'neutral');
  }
  function hideBanner(bEl) { if (bEl) bEl.classList.remove('show'); }

  function setBtn(disabled, text) {
    if (!el.btnAnalyze) return;
    el.btnAnalyze.disabled    = disabled;
    el.btnAnalyze.textContent = text || 'Ver lo que pasa';
  }

  /* ── NAVEGACIÓN ─────────────────────────────────────────────── */
  var VIEWS = ['reflect', 'history', 'identity', 'direction'];

  function showView(view) {
    VIEWS.forEach(function (v) {
      var vEl  = document.getElementById('view-' + v);
      var nKey = 'nav' + v.charAt(0).toUpperCase() + v.slice(1);
      if (vEl) vEl.classList.toggle('active', v === view);
      if (el[nKey]) el[nKey].classList.toggle('active', v === view);
    });
    if (view === 'history')   renderHistory();
    if (view === 'identity')  renderIdentityProfile();
    if (view === 'direction') renderDirection();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ── STREAK UI ──────────────────────────────────────────────── */
  function updateStreakUI() {
    var streak = Habit.getStreak();
    if (streak >= 2 && el.streakBadge && el.streakCount) {
      el.streakBadge.style.display = 'flex';
      el.streakCount.textContent   = String(streak);
    }
    var msg = Habit.getStreakMessage(streak);
    if (msg) setBanner(el.bannerStreak, el.bannerStreakText, msg, 'green');
    else     hideBanner(el.bannerStreak);
  }

  /* ── IDENTITY UI ────────────────────────────────────────────── */
  function updateIdentityUI() {
    var identity = HLEngine.getDominantIdentity();
    if (!identity || !el.identityCard || !el.identityText) return;
    if (identity.ratio >= 0.35) {
      el.identityText.textContent = HLEngine.IDENTITY_TEXTS[identity.type] || '';
      el.identityCard.classList.add('show');
    }
  }

  /* ── COHERENCE BANNER ───────────────────────────────────────── */
  function updateCoherenceBanner(coherence, relationship) {
    var msg = HLEngine.getCoherenciaTexto(coherence, relationship);
    if (!msg) { hideBanner(el.bannerCoherence); return; }
    var colorMap = { alineado: 'green', tension: 'amber', ruptura: 'purple' };
    setBanner(el.bannerCoherence, el.bannerCoherenceText, msg, colorMap[coherence] || 'neutral');
  }

  /* ── COACH ──────────────────────────────────────────────────── */
  function checkCoach() {
    var msg = HLEngine.getCoachMessage();
    if (msg) setBanner(el.bannerCoach, el.bannerCoachText, msg, 'neutral');
    else     hideBanner(el.bannerCoach);
  }

  /* ── AI CALL ────────────────────────────────────────────────── */
  function callAI(text, flags, history) {
    var ctrl    = new AbortController();
    var timeout = setTimeout(function () { ctrl.abort(); }, AI_TIMEOUT);

    var recentDirs = (history || []).slice(0, 3).map(function (e) {
      return e.lifeDirection || 'proteccion';
    });

    return fetch(AI_ENDPOINT, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        contexto:       text.substring(0, 2000),
        flags:          flags,
        recentDirections: recentDirs
      }),
      signal: ctrl.signal
    })
      .then(function (res) {
        clearTimeout(timeout);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        clearTimeout(timeout);
        if (!data || !data.reflexion) throw new Error('Invalid response');
        return data;
      })
      .catch(function (e) {
        clearTimeout(timeout);
        throw e;
      });
  }

  /* ── RENDER INSIGHT ─────────────────────────────────────────── */
  function renderInsight(insight) {
    if (!insight) return;
    /* textContent previene XSS siempre */
    if (el.insightReflexion) el.insightReflexion.textContent = insight.reflexion  || '';
    if (el.insightInsight)   el.insightInsight.textContent   = insight.insight    || '';
    if (el.insightImpacto)   el.insightImpacto.textContent   = insight.impacto    || '';
    if (el.insightCoherencia) el.insightCoherencia.textContent = insight.coherencia || '';
    if (el.insightPregunta)  el.insightPregunta.textContent  = insight.pregunta   || '';
    if (el.resultZone)       el.resultZone.classList.add('show');
  }

  /* ── FLUJO PRINCIPAL ────────────────────────────────────────── */
  function analyze() {
    var text = el.decisionInput ? el.decisionInput.value.trim() : '';
    if (!text) {
      if (el.decisionInput) {
        el.decisionInput.focus();
        el.decisionInput.style.borderColor = 'var(--red)';
        setTimeout(function () {
          if (el.decisionInput) el.decisionInput.style.borderColor = '';
        }, 1500);
      }
      return;
    }

    /* Reset estado visual */
    if (el.resultZone) el.resultZone.classList.remove('show');
    hideBanner(el.bannerPattern);
    hideBanner(el.bannerCoherence);

    /* Detección HL */
    var flags         = HLEngine.detectFlags(text);
    var lifeDirection = HLEngine.detectLifeDirection(text, flags);
    var history       = HLEngine.getHistory();
    var coherence     = HLEngine.detectLifeCoherence(lifeDirection, history);
    var relationship  = HLEngine.detectDecisionRelationship(lifeDirection, history);
    var repeated      = HLEngine.detectRepeatedPattern(flags);

    /* Banner patrón repetido */
    if (repeated && HLEngine.PATTERN_MESSAGES[repeated]) {
      setBanner(el.bannerPattern, el.bannerPatternText, HLEngine.PATTERN_MESSAGES[repeated], 'amber');
    }

    /* Banner coherencia (solo si hay suficiente historial) */
    if (history.length >= 2) {
      updateCoherenceBanner(coherence, relationship);
    }

    /* Loading */
    setBtn(true, 'Analizando...');
    if (el.loading) el.loading.classList.add('show');

    callAI(text, flags, history)
      .catch(function () {
        /* IA falló — fallback local silencioso */
        var local = HLEngine.getLocalInsight(flags);
        /* Añadir coherencia local al fallback */
        local.coherencia = HLEngine.getCoherenciaTexto(coherence, relationship);
        return local;
      })
      .then(function (insight) {
        if (el.loading) el.loading.classList.remove('show');
        setBtn(false);

        renderInsight(insight);

        /* Guardar en memoria con metadatos v3 */
        var entry = HLEngine.buildEntry(
          text, flags,
          { reflexion: insight.reflexion, insight: insight.insight, impacto: insight.impacto, coherencia: insight.coherencia, pregunta: insight.pregunta },
          lifeDirection, coherence, relationship
        );
        HLEngine.saveEntry(entry);

        /* Actualizar UI */
        Habit.recordReflection();
        updateStreakUI();
        updateIdentityUI();

        if (el.resultZone) el.resultZone.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
  }

  /* ── RESET ──────────────────────────────────────────────────── */
  function reset() {
    if (el.decisionInput) { el.decisionInput.value = ''; el.decisionInput.focus(); }
    if (el.resultZone)    el.resultZone.classList.remove('show');
    hideBanner(el.bannerPattern);
    hideBanner(el.bannerCoherence);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ── RENDER HISTORIAL ───────────────────────────────────────── */
  function renderHistory() {
    var c = el.histList;
    if (!c) return;
    c.textContent = '';

    var history = HLEngine.getHistory();
    if (!history.length) {
      var emp = mk('div', 'empty-state');
      emp.textContent = 'Aun no tienes reflexiones guardadas. Comparte tu primera decision.';
      c.appendChild(emp); return;
    }

    history.forEach(function (entry) {
      var item  = mk('div', 'hist-item');
      var title = mk('div', 'hist-title');
      title.textContent = entry.text || ''; /* textContent = seguro */

      var meta = mk('div', 'hist-meta');

      if (entry.identity) {
        var tag = mk('span', 'hist-tag ' + entry.identity);
        tag.textContent = entry.identity;
        meta.appendChild(tag);
      }

      if (entry.lifeDirection) {
        var dir = mk('span', 'hist-dir ' + entry.lifeDirection);
        dir.textContent = entry.lifeDirection;
        meta.appendChild(dir);
      }

      var date = mk('span', 'hist-date');
      date.textContent = entry.ts
        ? new Date(entry.ts).toLocaleDateString('es', { day: 'numeric', month: 'short' })
        : '';
      meta.appendChild(date);

      item.appendChild(title);
      item.appendChild(meta);
      c.appendChild(item);
    });
  }

  /* ── RENDER PERFIL ──────────────────────────────────────────── */
  function renderIdentityProfile() {
    var c = el.identityProfile;
    if (!c) return;
    c.textContent = '';

    var identity = HLEngine.getDominantIdentity();
    var history  = HLEngine.getHistory();
    var streak   = Habit.getStreak();

    if (!history.length) {
      var emp = mk('div', 'empty-state');
      emp.textContent = 'Comparte al menos 3 decisiones para ver tu perfil.';
      c.appendChild(emp); return;
    }

    /* Stats */
    var stats = mk('div', 'card');
    var stTitle = mk('div', 'card-title');
    stTitle.textContent = 'Tu actividad';
    var stRow = mk('div', 'stat-row');
    stRow.appendChild(buildStat(String(history.length), 'reflexiones'));
    stRow.appendChild(buildStat(String(streak), 'dias seguidos'));
    stats.appendChild(stTitle);
    stats.appendChild(stRow);
    c.appendChild(stats);

    /* Identidad */
    if (identity) {
      var idCard = mk('div', 'card mt-12');
      var idTitle = mk('div', 'card-title');
      idTitle.textContent = 'Tu patron: ' + identity.type;
      var idText = mk('div', 'card-sub mt-8');
      idText.textContent = HLEngine.IDENTITY_TEXTS[identity.type] || '';
      var idRatio = mk('div');
      idRatio.style.cssText = 'margin-top:10px;font-size:13px;color:var(--ink-3)';
      idRatio.textContent   = 'Presente en el ' + Math.round(identity.ratio * 100) + '% de tus reflexiones';
      idCard.appendChild(idTitle);
      idCard.appendChild(idText);
      idCard.appendChild(idRatio);
      c.appendChild(idCard);
    }
  }

  function buildStat(value, label) {
    var w = mk('div');
    var n = mk('div', 'stat-num'); n.textContent = value;
    var l = mk('div', 'stat-lbl'); l.textContent = label;
    w.appendChild(n); w.appendChild(l);
    return w;
  }

  /* ── RENDER DIRECCIÓN VITAL ─────────────────────────────────── */
  function renderDirection() {
    var c = el.directionContent;
    if (!c) return;
    c.textContent = '';

    var stats = HLEngine.getLifeDirectionStats();

    if (!stats || !stats.total) {
      var emp = mk('div', 'empty-state');
      emp.textContent = 'Agrega al menos 2 decisiones para ver tu direccion vital.';
      c.appendChild(emp); return;
    }

    /* Hero: dirección dominante */
    var hero = mk('div', 'dir-hero');
    var heroLabel = mk('div', 'dir-hero-label'); heroLabel.textContent = 'Direccion dominante';
    var heroValue = mk('div', 'dir-hero-value'); heroValue.textContent = stats.dominant;
    var heroPct   = mk('div', 'dir-hero-pct');   heroPct.textContent   = stats.percentages[stats.dominant] + '% de tus decisiones';
    var heroMsg   = mk('div', 'dir-hero-msg');   heroMsg.textContent   = HLEngine.DIRECTION_TEXTS[stats.dominant] || '';
    hero.appendChild(heroLabel);
    hero.appendChild(heroValue);
    hero.appendChild(heroPct);
    hero.appendChild(heroMsg);
    c.appendChild(hero);

    /* Barras de distribución */
    var barsCard = mk('div', 'card dir-bars');
    var barsTitle = mk('div', 'card-title'); barsTitle.textContent = 'Distribucion';
    barsCard.appendChild(barsTitle);

    var dirs = [
      { key: 'expansion',  label: 'Expansion' },
      { key: 'proteccion', label: 'Proteccion' },
      { key: 'cambio',     label: 'Cambio' }
    ];

    dirs.forEach(function (d) {
      var pct = stats.percentages[d.key] || 0;
      var row = mk('div', 'dir-bar-row');

      var lbl = mk('div', 'dir-bar-label'); lbl.textContent = d.label;
      var trk = mk('div', 'dir-bar-track');
      var fill = mk('div', 'dir-bar-fill ' + d.key);
      fill.style.width = '0%';
      setTimeout(function () { fill.style.width = pct + '%'; }, 50); /* animate on mount */
      trk.appendChild(fill);

      var pctEl = mk('div', 'dir-bar-pct'); pctEl.textContent = pct + '%';

      row.appendChild(lbl);
      row.appendChild(trk);
      row.appendChild(pctEl);
      barsCard.appendChild(row);
    });
    c.appendChild(barsCard);

    /* Timeline: últimas 5 decisiones */
    if (stats.last5 && stats.last5.length) {
      var tlCard = mk('div', 'card');
      var tlTitle = mk('div', 'dir-timeline-title'); tlTitle.textContent = 'Ultimos movimientos';
      tlCard.appendChild(tlTitle);

      var tl = mk('div', 'dir-timeline');
      stats.last5.forEach(function (item) {
        var row = mk('div', 'dir-tl-item');

        /* Dot con inicial de dirección */
        var dot = mk('div', 'dir-tl-dot ' + item.lifeDirection);
        var initials = { expansion: 'E', proteccion: 'P', cambio: 'C' };
        dot.textContent = initials[item.lifeDirection] || '?';

        var body = mk('div', 'dir-tl-body');

        var text = mk('div', 'dir-tl-text');
        text.textContent = item.text || ''; /* textContent = seguro */

        var meta = mk('div', 'dir-tl-meta');
        var dirEl = mk('span', 'dir-tl-dir ' + item.lifeDirection);
        dirEl.textContent = item.lifeDirection;
        var dateEl = mk('span', 'dir-tl-date');
        dateEl.textContent = item.ts
          ? new Date(item.ts).toLocaleDateString('es', { day: 'numeric', month: 'short' })
          : '';
        meta.appendChild(dirEl);
        meta.appendChild(dateEl);

        body.appendChild(text);
        body.appendChild(meta);
        row.appendChild(dot);
        row.appendChild(body);
        tl.appendChild(row);
      });

      tlCard.appendChild(tl);
      c.appendChild(tlCard);
    }
  }

  /* ── INIT ───────────────────────────────────────────────────── */
  function init() {
    cacheDOM();
    updateStreakUI();
    updateIdentityUI();
    checkCoach();
  }

  /* ── BOOT ───────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    OB.start(); /* Onboarding decide qué pantalla mostrar */
  });

  return {
    init:     init,
    analyze:  analyze,
    reset:    reset,
    showView: showView
  };

})();
