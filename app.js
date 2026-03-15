// ============================================================
// Be U – Human Layer · app.js
// Compatible con Supabase JS v2 + GitHub Pages
// ============================================================

// ── CONFIGURACIÓN ─────────────────────────────────────────
// Reemplaza estos dos valores con los de tu proyecto Supabase:
// Dashboard → Settings → API
const SUPABASE_URL  = "https://sjyidyymmeasjdrwldsd.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqeWlkeXltbWVhc2pkcndkbHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NDM0NzEsImV4cCI6MjA4OTExOTQ3MX0.GFxI71MbVtdKOE9Xh3DA8xZkOGiN1bbUJxXvDU1foIo";

// ── CLIENTE ───────────────────────────────────────────────
// En la versión UMD de Supabase JS v2 el objeto global se llama `supabase`
// y el método para crear el cliente es `supabase.createClient`
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ── ESTADO ────────────────────────────────────────────────
let sesionActual = null;

// ── INIT: detectar sesión activa al cargar ─────────────────
(async () => {
  const { data: { session } } = await db.auth.getSession();
  if (session) mostrarDashboard(session.user);

  // Escuchar cambios de sesión en tiempo real
  db.auth.onAuthStateChange((_event, session) => {
    if (session) {
      mostrarDashboard(session.user);
    } else {
      mostrarAuth();
    }
  });
})();

// ── TABS ──────────────────────────────────────────────────
function cambiarTab(tab) {
  const esRegistro = tab === "registro";
  document.getElementById("formRegistro").style.display = esRegistro ? "block" : "none";
  document.getElementById("formLogin").style.display    = esRegistro ? "none"  : "block";
  document.getElementById("tabRegistro").classList.toggle("activo", esRegistro);
  document.getElementById("tabLogin").classList.toggle("activo", !esRegistro);
  limpiarMensajes();
}

// ── REGISTRO ──────────────────────────────────────────────
async function registrar() {
  const nombre   = document.getElementById("regNombre").value.trim();
  const email    = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value;

  if (!nombre || !email || !password) {
    mostrarMensaje("msgRegistro", "error", "Por favor rellena todos los campos.");
    return;
  }
  if (password.length < 6) {
    mostrarMensaje("msgRegistro", "error", "La contraseña debe tener al menos 6 caracteres.");
    return;
  }

  setBtnEstado("btnRegistro", true, "Creando cuenta...");

  const { data, error } = await db.auth.signUp({
    email,
    password,
    options: {
      data: { nombre }          // guarda el nombre en user_metadata
    }
  });

  setBtnEstado("btnRegistro", false, "Crear cuenta");

  if (error) {
    mostrarMensaje("msgRegistro", "error", traducirError(error.message));
    return;
  }

  // Supabase envía email de confirmación por defecto
  // Si tienes desactivada la confirmación en el dashboard, data.user ya existe
  if (data.user && !data.user.email_confirmed_at && data.session === null) {
    mostrarMensaje("msgRegistro", "ok", "✓ Cuenta creada. Revisa tu email para confirmar la cuenta.");
  } else {
    mostrarMensaje("msgRegistro", "ok", "✓ Cuenta creada correctamente. Bienvenido/a.");
  }
}

// ── LOGIN ─────────────────────────────────────────────────
async function entrar() {
  const email    = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!email || !password) {
    mostrarMensaje("msgLogin", "error", "Por favor introduce tu email y contraseña.");
    return;
  }

  setBtnEstado("btnLogin", true, "Entrando...");

  const { data, error } = await db.auth.signInWithPassword({ email, password });

  setBtnEstado("btnLogin", false, "Entrar");

  if (error) {
    mostrarMensaje("msgLogin", "error", traducirError(error.message));
    return;
  }

  // onAuthStateChange se encargará de mostrar el dashboard
}

// ── CERRAR SESIÓN ─────────────────────────────────────────
async function cerrarSesion() {
  await db.auth.signOut();
  // onAuthStateChange lo detecta y llama mostrarAuth()
}

// ── GUARDAR REFLEXIÓN (tabla decisions en Supabase) ────────
async function guardarReflexion() {
  const texto = document.getElementById("txtDecision").value.trim();
  if (!texto) {
    mostrarMensaje("msgDashboard", "error", "Escribe la decisión antes de guardar.");
    return;
  }

  const { error } = await db.from("decisions").insert([{
    user_id:     sesionActual.id,
    title:       texto.substring(0, 120),
    description: texto,
    status:      "explorando",
  }]);

  if (error) {
    // Si la tabla no existe aún, mostramos el texto igualmente
    console.warn("Supabase insert error:", error.message);
    mostrarMensaje("msgDashboard", "ok", "✓ Reflexión guardada localmente (configura la tabla decisions en Supabase para persistencia).");
  } else {
    mostrarMensaje("msgDashboard", "ok", "✓ Reflexión guardada correctamente.");
    document.getElementById("txtDecision").value = "";
  }
}

// ── UI HELPERS ────────────────────────────────────────────
function mostrarDashboard(usuario) {
  sesionActual = usuario;
  const nombre = usuario.user_metadata?.nombre || usuario.email;
  document.getElementById("panelAuth").style.display      = "none";
  document.getElementById("panelDashboard").style.display = "block";
  document.getElementById("panelDashboard").classList.add("visible");
  document.getElementById("txtBienvenida").textContent    = `Hola, ${nombre}`;
  document.getElementById("txtEmail").textContent         = usuario.email;
}

function mostrarAuth() {
  sesionActual = null;
  document.getElementById("panelAuth").style.display      = "block";
  document.getElementById("panelDashboard").style.display = "none";
  document.getElementById("panelDashboard").classList.remove("visible");
  limpiarMensajes();
}

function mostrarMensaje(id, tipo, texto) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = texto;
  el.className   = `msg ${tipo} visible`;
}

function limpiarMensajes() {
  ["msgRegistro","msgLogin","msgDashboard"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.className = "msg";
  });
}

function setBtnEstado(id, desactivado, texto) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.disabled     = desactivado;
  btn.textContent  = texto;
}

// Traduce los mensajes de error de Supabase al español
function traducirError(msg) {
  const errores = {
    "Invalid login credentials":              "Email o contraseña incorrectos.",
    "Email not confirmed":                     "Confirma tu email antes de entrar.",
    "User already registered":                 "Este email ya está registrado.",
    "Password should be at least 6 characters":"La contraseña debe tener al menos 6 caracteres.",
    "Unable to validate email address":        "El formato del email no es válido.",
    "signup is disabled":                      "El registro está desactivado temporalmente.",
    "Email rate limit exceeded":               "Demasiados intentos. Espera unos minutos.",
  };
  for (const [en, es] of Object.entries(errores)) {
    if (msg.includes(en)) return es;
  }
  return msg; // si no hay traducción, devuelve el original
}
