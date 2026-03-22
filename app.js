'use strict';

var APP = (function () {

  async function analyze() {
    const input = document.getElementById('decisionInput');
    const text = input.value.trim();

    if (!text) {
      alert("Escribe algo primero");
      return;
    }

    try {
      const res = await fetch('https://beu-human-layer.vercel.app/api/hl-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contexto: text })
      });

      const data = await res.json();

      alert(
        "REFLEXIÓN:\n" + data.reflexion + "\n\n" +
        "INSIGHT:\n" + data.insight + "\n\n" +
        "PREGUNTA:\n" + data.pregunta
      );

    } catch (err) {
      console.error(err);
      alert("Error conectando con IA");
    }
  }

  function init() {
    console.log("APP lista");
  }

  return {
    analyze: analyze,
    init: init
  };

})();
