# Be U – Human Layer

> Decide desde tu mejor version.

Una web app de reflexion de decisiones basada en el motor Human Layer (HL).  
Mobile-first. Sin frameworks. Funciona aunque la IA falle.

---

## Estructura del proyecto

```
/
├── index.html          # UI completa
├── app.js              # Logica principal de la app
├── hl-engine.js        # Motor HL: patrones, identidad, memoria
├── onboarding.js       # Logica del onboarding
├── habit.js            # Sistema de streak (dias consecutivos)
├── manifest.json       # PWA manifest
├── sw.js               # Service Worker (cache offline)
├── /api/
│   └── hl-insight.js   # Endpoint Vercel para IA (Anthropic)
└── /icons/
    ├── icon-192.png    # Icono PWA (debes crearlo)
    └── icon-512.png    # Icono PWA grande
```

---

## Correr en local

### Opcion 1: Vercel CLI (recomendado)

```bash
npm install -g vercel
vercel dev
```

Esto levanta el proyecto en `http://localhost:3000` con el endpoint `/api/hl-insight` funcionando.

### Opcion 2: Servidor estatico simple (sin IA)

```bash
npx serve .
```

La app funciona completa con fallback local. La IA no estara activa sin la API key.

### Opcion 3: Live Server (VS Code)

Instala la extension **Live Server** y haz click en "Go Live".  
El endpoint `/api` no funcionara, pero el fallback local si.

---

## Configurar la IA (Anthropic)

1. Crea una cuenta en [anthropic.com](https://anthropic.com)
2. Genera una API key
3. En Vercel, ve a **Settings > Environment Variables** y agrega:
   ```
   ANTHROPIC_API_KEY = sk-ant-xxxxxxxxxxxxxxxx
   ```
4. O en local, crea un archivo `.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxx
   ```

> **Importante:** Si `ANTHROPIC_API_KEY` no esta configurada, el endpoint devuelve un fallback local. La app nunca se rompe.

---

## Desplegar en Vercel

```bash
# Instalar Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

Vercel detecta automaticamente los archivos en `/api/` como serverless functions.

---

## PWA: iconos

Para que la app sea instalable en movil, crea los iconos:

```
/icons/icon-192.png   (192x192 px)
/icons/icon-512.png   (512x512 px)
```

Puedes generarlos con [realfavicongenerator.net](https://realfavicongenerator.net) o cualquier editor de imagen.

---

## Registrar el Service Worker

Agrega este script al final de `index.html` (antes de `</body>`) para activar el SW:

```html
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(console.error);
  }
</script>
```

---

## Funcionalidades

| Feature | Descripcion |
|---|---|
| Onboarding | 3 pantallas intro, se muestra solo una vez |
| Motor HL | Detecta patrones: evitacion, confusion, ambicion |
| Memoria | Guarda las ultimas 20 decisiones en localStorage |
| Identidad | Calcula tu patron dominante (evitador / protector / constructor) |
| Streak | Contador de dias consecutivos de reflexion |
| Coach silencioso | Mensaje reflexivo, maximo 1 vez cada 24h |
| Notificaciones | Banner si patron se repite o streak activo |
| IA | Endpoint Anthropic con fallback local automatico |
| PWA | Instalable en movil (manifest + SW) |
| Offline | Service Worker cachea el app shell |

---

## Tecnologias

- HTML / CSS / JavaScript vanilla
- Vercel Serverless Functions (Node.js)
- Anthropic SDK (`@anthropic-ai/sdk`)
- localStorage para persistencia
- Service Worker para offline

---

## Variables de entorno

| Variable | Descripcion | Obligatoria |
|---|---|---|
| `ANTHROPIC_API_KEY` | API key de Anthropic | No (hay fallback local) |

---

## Notas de diseno

- Todo el texto del usuario se renderiza con `textContent`, nunca `innerHTML` (proteccion XSS)
- La app funciona al 100% sin conexion a internet (con SW activo)
- La IA nunca bloquea la app: siempre hay fallback local
- El streak se mantiene aunque la app se cierre
