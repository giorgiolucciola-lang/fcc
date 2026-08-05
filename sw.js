// ── Service Worker FCC ────────────────────────────────────────────────────────
// Incrementa CACHE_VERSION ad ogni deploy per forzare l'aggiornamento della PWA
const CACHE_VERSION = "fcc-v46";
const CACHE_FILES = [
  "/fcc/",
  "/fcc/index.html",
  "/fcc/manifest.json",
  "/fcc/icon.png",
  // Librerie locali: indispensabili per l'apertura offline
  "/fcc/vendor/react.production.min.js",
  "/fcc/vendor/react-dom.production.min.js",
  "/fcc/vendor/babel.min.js",
  "/fcc/vendor/firebase-app-compat.js",
  "/fcc/vendor/firebase-auth-compat.js",
  "/fcc/vendor/firebase-firestore-compat.js",
  "/fcc/vendor/firebase-messaging-compat.js",
];

// Installazione: pre-cacha i file principali
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then(c => c.addAll(CACHE_FILES))
  );
  self.skipWaiting(); // Attiva subito senza aspettare la chiusura delle tab
});

// Attivazione: elimina le cache vecchie
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    )
  );
  self.clients.claim(); // Prende il controllo di tutte le tab aperte
});

// Fetch: Network First — prova sempre la rete, fallback alla cache
self.addEventListener("fetch", e => {
  // Ignora richieste non-GET e richieste a Firebase/Google
  if (e.request.method !== "GET") return;
  if (e.request.url.includes("firebasejs") || e.request.url.includes("googleapis") || e.request.url.includes("gstatic")) return;

  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Aggiorna la cache con la risposta fresca
        if (response && response.status === 200 && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(c => c.put(e.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(e.request)) // Fallback cache se offline
  );
});

// ── NOTIFICHE PUSH (Firebase Cloud Messaging) ────────────────────────────────
// Questa sezione permette al service worker di mostrare le notifiche anche quando
// l'app FCC è chiusa: la Cloud Function manda un messaggio "silenzioso" a Firebase,
// che lo consegna qui, e qui viene trasformato in una notifica vera e propria che
// compare sullo schermo (con badge/icona dell'app).
importScripts("/fcc/vendor/firebase-app-compat.js");
importScripts("/fcc/vendor/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDWcRC7Zf8NX2OJU197UVvZ23Gy6_SWQtw",
  authDomain: "family-control-center-4ae38.firebaseapp.com",
  projectId: "family-control-center-4ae38",
  storageBucket: "family-control-center-4ae38.firebasestorage.app",
  messagingSenderId: "722999772560",
  appId: "1:722999772560:web:f06617ba41dee3f9ebdf15"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const titolo = (payload.notification && payload.notification.title) || "Family CC";
  const opzioni = {
    body: (payload.notification && payload.notification.body) || "",
    icon: "/fcc/icon.png",
    badge: "/fcc/icon.png",
    data: payload.data || {},
  };
  self.registration.showNotification(titolo, opzioni);
});

