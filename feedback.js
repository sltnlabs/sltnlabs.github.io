/*! SLTN Labs feedback widget.
 * A floating "Feedback" button that opens a short survey + comment form.
 * Submissions go to the feedback relay (a Cloudflare Worker that files a private GitHub issue).
 * If no relay is configured, or it can't be reached, the user's email app opens with the message ready.
 *
 * Usage: <script src="/feedback.js" data-app="video-lab" data-version="0.3.0" defer></script>
 * Apps: "rookie-track" | "video-lab" | "website". Optional: window.SLTNFeedback.open()
 */
(function () {
  "use strict";
  var ENDPOINT = "https://sltn-feedback.mosoultan.workers.dev/"; // Cloudflare Worker: rookie-track/infra/feedback-worker
  var FALLBACK_EMAIL = "mosoultan@icloud.com";
  var HIDE_ON = [/\/rookie-track\/app\/live\//]; // keep the live tracker screen clear

  var script = document.currentScript || document.querySelector('script[src*="feedback.js"]');
  var cfg = window.SLTN_FEEDBACK || {};
  var APP = cfg.app || (script && script.dataset.app) || "website";
  var VERSION = cfg.version || (script && script.dataset.version) || "";
  var APP_NAME = { "rookie-track": "Rookie Track", "video-lab": "Rookie Track Video Lab", website: "SLTN Labs website" }[APP] || APP;

  var S = {
    en: {
      btn: "Feedback", title: "Share your feedback", sub: "Two quick questions and a comment. It takes under a minute.",
      q1: "How useful is it so far?", r1: "Not useful", r5: "Very useful",
      q2: "What is this about?", t_bug: "Something's broken", t_idea: "An idea", t_question: "A question", t_other: "Other",
      q3: "Tell us more", ph3: "What happened, or what would make it better?",
      q4: "Email (optional, only if you'd like a reply)",
      tech: "Include technical details (app version, page, device type)",
      note: "Your message goes to the SLTN Labs team as a private ticket. Please don't include your child's full name.",
      send: "Send feedback", sending: "Sending…", cancel: "Close",
      need: "Choose a rating or write a comment first.", thanks: "Thank you! Your feedback was sent.",
      mailed: "Your email app should open with your message ready. Press send there to finish.",
      fail: "Couldn't send right now. Your email app will open instead."
    },
    ar: {
      btn: "ملاحظات", title: "شاركنا رأيك", sub: "سؤالان سريعان وتعليق. يستغرق أقل من دقيقة.",
      q1: "ما مدى فائدته حتى الآن؟", r1: "غير مفيد", r5: "مفيد جداً",
      q2: "بماذا يتعلق الأمر؟", t_bug: "شيء لا يعمل", t_idea: "فكرة", t_question: "سؤال", t_other: "أخرى",
      q3: "أخبرنا المزيد", ph3: "ماذا حدث، أو ما الذي سيجعله أفضل؟",
      q4: "البريد الإلكتروني (اختياري، فقط إذا أردت رداً)",
      tech: "أرفق التفاصيل التقنية (إصدار التطبيق، الصفحة، نوع الجهاز)",
      note: "تصل رسالتك إلى فريق SLTN Labs كتذكرة خاصة. يُرجى عدم كتابة الاسم الكامل لطفلك.",
      send: "إرسال", sending: "جارٍ الإرسال…", cancel: "إغلاق",
      need: "اختر تقييماً أو اكتب تعليقاً أولاً.", thanks: "شكراً لك! تم إرسال ملاحظاتك.",
      mailed: "سيُفتح تطبيق البريد ورسالتك جاهزة. اضغط إرسال هناك لإتمامها.",
      fail: "تعذّر الإرسال الآن. سيُفتح تطبيق البريد بدلاً من ذلك."
    }
  };
  var lang = function () { return (document.documentElement.lang || "").slice(0, 2) === "ar" ? "ar" : "en"; };
  var t = function (k) { return S[lang()][k] || S.en[k]; };

  var host = document.createElement("div");
  host.id = "sltn-feedback";
  var root = host.attachShadow({ mode: "open" });
  root.innerHTML =
    '<style>' +
    ':host{all:initial}' +
    '.w{--bg:#FFFFFF;--ink:#0F1B2D;--muted:#566174;--line:#DCE2EA;--chip:#F1F4F8;--accent:#C2410C;--on:#FFFFFF;--ok:#15803D;--bad:#B91C1C;font:400 16px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;color:var(--ink)}' +
    '@media (prefers-color-scheme:dark){.w{--bg:#141E2E;--ink:#E8EDF4;--muted:#9AA7BA;--line:#2A3850;--chip:#1E2A3D;--accent:#FB923C;--on:#1A0D04;--ok:#4ADE80;--bad:#F87171}}' +
    '.fab{position:fixed;z-index:2147483000;bottom:calc(16px + env(safe-area-inset-bottom,0px));right:16px;display:flex;align-items:center;gap:8px;height:44px;padding:0 16px;border-radius:22px;border:0;background:var(--accent);color:var(--on);font-weight:600;font-size:15px;font-family:inherit;box-shadow:0 4px 14px rgba(0,0,0,.25);cursor:pointer}' +
    '.rtl .fab{right:auto;left:16px}' +
    '.fab[hidden]{display:none}' +
    '.back{position:fixed;inset:0;z-index:2147483001;background:rgba(5,10,20,.55);display:flex;align-items:flex-end;justify-content:center}' +
    '.back[hidden]{display:none}' +
    '@media (min-width:640px){.back{align-items:center}}' +
    '.card{background:var(--bg);width:100%;max-width:520px;max-height:92vh;overflow:auto;border-radius:18px 18px 0 0;padding:20px 18px calc(18px + env(safe-area-inset-bottom,0px));box-sizing:border-box}' +
    '@media (min-width:640px){.card{border-radius:18px}}' +
    'h2{font-size:20px;margin:0 0 4px} .sub{color:var(--muted);font-size:14px;margin:0 0 16px}' +
    'fieldset{border:0;margin:0 0 16px;padding:0} legend,label.l{display:block;font-weight:600;font-size:15px;margin:0 0 8px}' +
    '.rate{display:flex;gap:8px} .rate button{flex:1;height:44px;border-radius:10px;border:1px solid var(--line);background:var(--chip);color:var(--ink);font-weight:600;font-size:16px;font-family:inherit;cursor:pointer}' +
    '.ends{display:flex;justify-content:space-between;color:var(--muted);font-size:13px;margin-top:4px}' +
    '.chips{display:flex;flex-wrap:wrap;gap:8px} .chips button{min-height:40px;padding:0 14px;border-radius:20px;border:1px solid var(--line);background:var(--chip);color:var(--ink);font-weight:500;font-size:14px;font-family:inherit;cursor:pointer}' +
    'button[aria-pressed=true]{background:var(--ink)!important;color:var(--bg)!important;border-color:var(--ink)!important}' +
    'textarea,input[type=email]{width:100%;box-sizing:border-box;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--ink);font-weight:400;font-size:16px;font-family:inherit;padding:10px 12px}' +
    'textarea{min-height:104px;resize:vertical} input[type=email]{height:44px}' +
    '.tech{display:flex;gap:8px;align-items:flex-start;font-size:14px;margin:0 0 12px} .tech input{width:18px;height:18px;margin:1px 0 0;accent-color:var(--accent)}' +
    '.note{font-size:13px;color:var(--muted);margin:0 0 14px}' +
    '.row{display:flex;gap:10px} .row button{flex:1;height:48px;border-radius:12px;font-weight:600;font-size:16px;font-family:inherit;cursor:pointer}' +
    '.send{background:var(--accent);color:var(--on);border:0} .send:disabled{opacity:.6} .close{background:transparent;color:var(--ink);border:1px solid var(--line)}' +
    '.msg{font-size:14px;font-weight:600;margin:10px 0 0} .msg.ok{color:var(--ok)} .msg.bad{color:var(--bad)}' +
    '.hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}' +
    ':focus-visible{outline:3px solid var(--accent);outline-offset:2px}' +
    '</style>' +
    '<div class="w">' +
    '<button class="fab" type="button" part="fab"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg><span class="fabt"></span></button>' +
    '<div class="back" hidden><div class="card" role="dialog" aria-modal="true" aria-labelledby="fbh">' +
    '<h2 id="fbh"></h2><p class="sub"></p>' +
    '<fieldset><legend class="q1"></legend><div class="rate"></div><div class="ends"><span class="r1"></span><span class="r5"></span></div></fieldset>' +
    '<fieldset><legend class="q2"></legend><div class="chips"></div></fieldset>' +
    '<label class="l q3" for="fbc"></label><textarea id="fbc" maxlength="4000"></textarea>' +
    '<div style="height:14px"></div><label class="l q4" for="fbe"></label><input id="fbe" type="email" maxlength="200" autocomplete="email" inputmode="email">' +
    '<input class="hp" tabindex="-1" autocomplete="off" aria-hidden="true" name="website">' +
    '<div style="height:14px"></div><label class="tech"><input type="checkbox" checked><span class="techt"></span></label>' +
    '<p class="note"></p>' +
    '<div class="row"><button class="close" type="button"></button><button class="send" type="button"></button></div>' +
    '<p class="msg" role="status" aria-live="polite"></p>' +
    '</div></div></div>';

  var $ = function (s) { return root.querySelector(s); };
  var state = { rating: 0, topic: "" }, opened = 0, lastFocus = null;
  var TOPICS = ["bug", "idea", "question", "other"];

  function render() {
    var ar = lang() === "ar";
    $(".w").classList.toggle("rtl", ar); $(".card").setAttribute("dir", ar ? "rtl" : "ltr");
    $(".fabt").textContent = t("btn"); $("#fbh").textContent = t("title"); $(".sub").textContent = t("sub");
    $(".q1").textContent = t("q1"); $(".r1").textContent = "1 · " + t("r1"); $(".r5").textContent = t("r5") + " · 5";
    $(".q2").textContent = t("q2"); $(".q3").textContent = t("q3"); $("#fbc").placeholder = t("ph3"); $(".q4").textContent = t("q4");
    $(".techt").textContent = t("tech"); $(".note").textContent = t("note"); $(".close").textContent = t("cancel"); $(".send").textContent = t("send");
    $(".rate").innerHTML = [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" data-n="' + n + '" aria-pressed="' + (state.rating === n) + '" aria-label="' + n + ' / 5">' + n + "</button>"; }).join("");
    $(".chips").innerHTML = TOPICS.map(function (k) { return '<button type="button" data-k="' + k + '" aria-pressed="' + (state.topic === k) + '">' + t("t_" + k) + "</button>"; }).join("");
    $(".rate").querySelectorAll("button").forEach(function (b) { b.onclick = function () { state.rating = +b.dataset.n; render(); }; });
    $(".chips").querySelectorAll("button").forEach(function (b) { b.onclick = function () { state.topic = b.dataset.k; render(); }; });
  }
  function msg(text, ok) { var m = $(".msg"); m.textContent = text || ""; m.className = "msg " + (ok ? "ok" : "bad"); }
  function open() { lastFocus = document.activeElement; render(); msg(""); $(".back").hidden = false; opened = Date.now(); setTimeout(function () { $(".rate button").focus(); }, 30); }
  function close() { $(".back").hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  function reset() { state = { rating: 0, topic: "" }; $("#fbc").value = ""; $("#fbe").value = ""; render(); }

  function payload() {
    var tech = $(".tech input").checked;
    return {
      app: APP, version: VERSION, rating: state.rating || null, topic: state.topic || "other",
      comment: $("#fbc").value.trim(), email: $("#fbe").value.trim(), lang: lang(),
      page: tech ? location.pathname : "", device: tech ? (navigator.userAgent || "").slice(0, 200) : "",
      screen: tech ? (window.innerWidth + "×" + window.innerHeight) : "", website: $(".hp").value, ms: Date.now() - opened
    };
  }
  function mailto(d) {
    var lines = [
      "App: " + APP_NAME + (d.version ? " v" + d.version : ""), "Rating: " + (d.rating ? d.rating + "/5" : "-"), "Topic: " + d.topic, "",
      d.comment || "(no comment)", "", d.page ? "Page: " + d.page : "", d.device ? "Device: " + d.device : ""
    ].filter(function (x, i, a) { return x !== "" || (a[i - 1] !== "" && i < a.length - 1); });
    var subj = "[" + APP_NAME + "] Feedback" + (d.rating ? " · " + d.rating + "/5" : "");
    location.href = "mailto:" + FALLBACK_EMAIL + "?subject=" + encodeURIComponent(subj) + "&body=" + encodeURIComponent(lines.join("\n"));
  }
  function send() {
    var d = payload();
    if (!d.rating && !d.comment) { msg(t("need"), false); return; }
    if (d.website) { msg(t("thanks"), true); return; } // bot filled the hidden field
    if (!ENDPOINT) { mailto(d); msg(t("mailed"), true); reset(); return; }
    var b = $(".send"); b.disabled = true; b.textContent = t("sending");
    fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || !j.ok) throw new Error(j.error || r.status); }); })
      .then(function () { msg(t("thanks"), true); reset(); setTimeout(close, 1800); })
      .catch(function () { msg(t("fail"), false); setTimeout(function () { mailto(d); }, 900); })
      .then(function () { b.disabled = false; b.textContent = t("send"); });
  }

  $(".fab").onclick = open; $(".close").onclick = close; $(".send").onclick = send;
  $(".back").addEventListener("click", function (e) { if (e.target === $(".back")) close(); });
  root.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  function syncVisibility() { var hide = HIDE_ON.some(function (re) { return re.test(location.pathname); }); $(".fab").hidden = hide; if (hide && !$(".back").hidden) close(); }
  function mount() { document.body.appendChild(host); render(); syncVisibility(); setInterval(syncVisibility, 800); new MutationObserver(function () { render(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] }); }
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);
  window.SLTNFeedback = { open: open };
})();
