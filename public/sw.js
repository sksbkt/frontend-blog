const CACHE_NAME = 'ali-portfolio-v4';
const OFFLINE_URL = '/offline.html';

const PRECACHE_ASSETS = [
  OFFLINE_URL,
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png',
  '/fonts/Vazirmatn-Regular.ttf'
];

// Embedded fail-safe offline HTML in case cache was cleared or unavailable
function createOfflineHtml(lang, targetUrl) {
  const isFa = lang === 'fa';
  const target = targetUrl || (isFa ? '/fa' : '/en');

  return `<!DOCTYPE html>
<html lang="${isFa ? 'fa' : 'en'}" dir="${isFa ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isFa ? 'شما آفلاین هستید' : "You're Offline"}</title>
  <link rel="icon" href="/favicon.ico">
  <meta name="theme-color" content="#090d16">
  <style>
    @font-face {
      font-family: 'Vazirmatn';
      src: url('/fonts/Vazirmatn-Regular.ttf') format('truetype');
      font-weight: normal;
      font-display: swap;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ${isFa ? "'Vazirmatn', " : ""}-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: radial-gradient(circle at 50% 20%, #1e1b4b 0%, #090d16 65%, #030712 100%);
      color: #f3f4f6;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      text-align: center;
      direction: ${isFa ? 'rtl' : 'ltr'};
    }
    .card {
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 1.5rem;
      padding: 3.25rem 2rem 2.25rem;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(99, 102, 241, 0.15);
      position: relative;
      transition: all 0.5s ease;
    }
    .card.connected {
      border-color: rgba(16, 185, 129, 0.4);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 50px rgba(16, 185, 129, 0.25);
    }
    .icon-wrapper {
      position: relative;
      width: 80px;
      height: 80px;
      margin: 0 auto 1.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icon-pulse {
      position: absolute;
      inset: -6px;
      border-radius: 50%;
      background: rgba(239, 68, 68, 0.15);
      animation: pulse 2.5s infinite;
      transition: all 0.5s ease;
    }
    .card.connected .icon-pulse {
      background: rgba(16, 185, 129, 0.2);
    }
    .icon-bg {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #f87171;
      transition: all 0.5s ease;
    }
    .card.connected .icon-bg {
      background: rgba(16, 185, 129, 0.15);
      border-color: rgba(16, 185, 129, 0.4);
      color: #34d399;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(0.95); opacity: 0.8; }
      50% { transform: scale(1.15); opacity: 0.3; }
    }
    h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 0.75rem; color: #fff; }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(239, 68, 68, 0.15);
      color: #fca5a5;
      border: 1px solid rgba(239, 68, 68, 0.3);
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.8125rem;
      margin-bottom: 1.25rem;
      transition: all 0.5s ease;
    }
    .card.connected .badge {
      background: rgba(16, 185, 129, 0.15);
      color: #6ee7b7;
      border-color: rgba(16, 185, 129, 0.4);
    }
    .badge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #ef4444;
      display: inline-block;
      transition: background 0.5s ease;
    }
    .card.connected .badge-dot {
      background: #10b981;
    }
    p { color: #94a3b8; font-size: 0.95rem; line-height: 1.8; margin-bottom: 1.5rem; }
    .target-box {
      display: inline-block;
      direction: ltr;
      unicode-bidi: embed;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 0.5rem;
      padding: 0.25rem 0.6rem;
      font-family: monospace;
      font-size: 0.8rem;
      color: #38bdf8;
      margin-bottom: 1.5rem;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      background: linear-gradient(135deg, #38bdf8, #6366f1);
      color: #ffffff;
      font-weight: 600;
      font-size: 0.9375rem;
      padding: 0.75rem 1.75rem;
      border-radius: 0.75rem;
      border: none;
      cursor: pointer;
      width: 100%;
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.39);
      transition: all 0.3s ease;
    }
    .card.connected .btn {
      background: linear-gradient(135deg, #10b981, #059669);
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
    }
    .status-msg { font-size: 0.825rem; color: #64748b; margin-top: 1rem; min-height: 1.25rem; }
    .card.connected .status-msg { color: #34d399; font-weight: 500; }
  </style>
</head>
<body>
  <div id="main-card" class="card">
    <div class="icon-wrapper">
      <div class="icon-pulse"></div>
      <div id="icon-bg" class="icon-bg">
        <svg id="icon-wifioff" xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="2" x2="22" y1="2" y2="22"></line>
          <path d="M8.5 16.5a5 5 0 0 1 7 0"></path>
          <path d="M2 8.82a15 15 0 0 1 4.17-2.65"></path>
          <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76"></path>
          <path d="M16.85 11.25a10 10 0 0 1 2.22 1.68"></path>
          <path d="M5 13a10 10 0 0 1 5.24-2.76"></path>
          <line x1="12" x2="12.01" y1="20" y2="20"></line>
        </svg>
        <svg id="icon-wifion" style="display:none;" xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 6 9 17l-5-5"></path>
        </svg>
      </div>
    </div>
    <div class="badge">
      <span class="badge-dot"></span>
      <span id="badge-text">${isFa ? 'عدم اتصال به اینترنت' : 'No Internet Connection'}</span>
    </div>
    <h1 id="title-text">${isFa ? 'شما آفلاین هستید' : "You're Offline"}</h1>
    <p id="desc-text">${isFa ? 'ارتباط با اینترنت قطع شده است. به محض وصل شدن اینترنت، به صورت خودکار به صفحه مورد نظر منتقل خواهید شد.' : "Connection was interrupted. As soon as you are reconnected, you will be automatically redirected to your page."}</p>
    <div class="target-box">${target}</div>
    <button id="retry-btn" class="btn" type="button" onclick="checkConn(true)">
      <span id="btn-text">${isFa ? 'تلاش برای اتصال مجدد' : 'Try Reconnecting'}</span>
    </button>
    <div id="status-text" class="status-msg"></div>
  </div>
  <script>
    var isConnected = false;
    var target = "${target}";
    var isFa = ${isFa};

    function onConnected() {
      if (isConnected) return;
      isConnected = true;
      document.getElementById("main-card").classList.add("connected");
      document.getElementById("icon-wifioff").style.display = "none";
      document.getElementById("icon-wifion").style.display = "block";
      document.getElementById("badge-text").textContent = isFa ? "اتصال برقرار شد!" : "Connection Restored!";
      document.getElementById("title-text").textContent = isFa ? "دوباره آنلاین شدید!" : "Back Online!";
      document.getElementById("desc-text").textContent = isFa ? "ارتباط اینترنت با موفقیت بازیابی شد. در حال انتقال..." : "Connection restored. Redirecting now...";
      document.getElementById("btn-text").textContent = isFa ? "در حال انتقال..." : "Redirecting...";
      document.getElementById("status-text").textContent = isFa ? "در حال انتقال به " + target + "..." : "Redirecting to " + target + "...";
      document.getElementById("retry-btn").disabled = true;

      setTimeout(function() {
        window.location.href = target;
      }, 700);
    }

    function checkConn(isManual) {
      if (isConnected) return;
      if (isManual) {
        document.getElementById("btn-text").textContent = isFa ? "در حال بررسی..." : "Checking...";
      }
      fetch("/manifest.json?_t=" + Date.now(), { method: "HEAD", cache: "no-store" })
        .then(function(res) {
          if (res.ok) { onConnected(); }
        })
        .catch(function() {
          if (isManual) {
            setTimeout(function() {
              document.getElementById("btn-text").textContent = isFa ? "تلاش مجدد" : "Try Again";
              document.getElementById("status-text").textContent = isFa ? "هنوز به اینترنت وصل نیستید." : "Still offline.";
            }, 500);
          }
        });
    }

    window.addEventListener("online", onConnected);
    setInterval(function() { if (!isConnected) checkConn(false); }, 2200);
  </script>
</body>
</html>`;
}

function detectRequestLanguage(request) {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/fa')) return 'fa';
  if (url.pathname.startsWith('/en')) return 'en';

  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(/NEXT_LOCALE=(fa|en)/);
  if (match && match[1]) return match[1];

  const acceptLang = request.headers.get('accept-language') || '';
  if (acceptLang.startsWith('fa')) return 'fa';

  return 'fa';
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        PRECACHE_ASSETS.map((asset) => cache.add(asset).catch(() => {}))
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (!url.protocol.startsWith('http')) return;

  if (
    url.pathname.includes('/_next/webpack-hmr') ||
    url.pathname.includes('__turbopack__') ||
    url.pathname.startsWith('/api/') ||
    request.method !== 'GET'
  ) {
    return;
  }

  // Handle Page Navigations:
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          // 1. Check if the exact page is in cache
          const cachedPage = await caches.match(request);
          if (cachedPage) {
            return cachedPage;
          }

          // 2. Detect language & destination
          const lang = detectRequestLanguage(request);
          const targetUrl = url.pathname + url.search;

          // 3. Fallback with fail-safe generated HTML containing auto-redirect logic
          return new Response(createOfflineHtml(lang, targetUrl), {
            status: 200,
            headers: new Headers({
              'Content-Type': 'text/html; charset=utf-8',
              'X-Offline-Fallback': 'true'
            })
          });
        })
    );
    return;
  }

  // Handle Assets
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return networkResponse;
      })
      .catch(async () => {
        const cachedAsset = await caches.match(request);
        if (cachedAsset) {
          return cachedAsset;
        }
        return new Response('Offline asset unavailable', { status: 503 });
      })
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data === 'PURGE_CACHE') {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).then(() => {
      self.skipWaiting();
    });
  }
});
