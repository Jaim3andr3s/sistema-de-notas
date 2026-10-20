// Service worker de la app instalable: guarda la "cáscara" del sitio para que abra rápido
// y sin conexión muestre la última versión. Los datos (/api) nunca se guardan: son privados.
const VERSION = 'iemm-v1'
const ESENCIALES = ['/', '/index.html', '/escudo.jpeg', '/manifest.webmanifest', '/iconos/icono-192.png']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ESENCIALES)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api')) return

  // Páginas: primero la red; sin conexión, la última versión guardada
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('/index.html')))
    return
  }
  // Archivos de la compilación (llevan un hash en el nombre): primero la caché
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/iconos/')) {
    e.respondWith(
      caches.match(e.request).then((guardada) => guardada || fetch(e.request).then((resp) => {
        const copia = resp.clone()
        caches.open(VERSION).then((c) => c.put(e.request, copia))
        return resp
      }))
    )
  }
})
