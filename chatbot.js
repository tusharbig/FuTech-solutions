/* FuTech chat widget. Include on every page after script.js.
   AI mode needs the backend in /worker (see README below). Without API_URL it runs a clearly labelled guided mode. */
(() => {
  const CHAT = { API_URL: "" /* e.g. https://futech-chat.YOURNAME.workers.dev */ };
  const PRICES = { Starter: 4999, Business: 14999, Premium: 29999 }; // keep in sync with pricing section
  const inr = n => "₹" + n.toLocaleString("en-IN");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const number = () => (typeof CONFIG !== "undefined" ? CONFIG.WHATSAPP_NUMBER : "");
  const wa = t => `https://wa.me/${number()}?text=${encodeURIComponent(t)}`;

  const root = document.createElement("div");
  root.innerHTML = `
  <button class="cb-fab" type="button" aria-expanded="false" aria-controls="cb"><svg class="ic"><use href="#i-wa"/></svg><span>Ask FuTech</span></button>
  <section class="cb" id="cb" role="dialog" aria-label="FuTech assistant">
    <div class="cb-h"><div class="cb-av" aria-hidden="true">Fu</div><div><b>FuTech Assistant</b><small id="cb-mode"></small></div>
      <button type="button" data-reset aria-label="Restart conversation">↺</button><button type="button" data-close aria-label="Close chat">✕</button></div>
    <div class="cb-log" role="log" aria-live="polite"></div>
    <form class="cb-f"><label class="sr" for="cb-in">Message</label><input id="cb-in" maxlength="500" autocomplete="off" placeholder="Ask about prices, timelines…"><button type="submit" aria-label="Send"><svg class="ic"><use href="#i-arrow"/></svg></button></form>
  </section>`;
  document.body.append(...root.children);
  const $ = s => document.querySelector(s);
  const fab = $(".cb-fab"), box = $("#cb"), log = $(".cb-log"), form = $(".cb-f"), input = $("#cb-in"), mode = $("#cb-mode");
  let hist = [], flow = null, aiDown = false, busy = false, started = false;
  const setMode = () => mode.textContent = CHAT.API_URL && !aiDown ? "AI assistant · answers may need checking" : "Guided mode · AI not connected";

  const time = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const scroll = () => { log.scrollTop = log.scrollHeight; };
  const clearChips = () => log.querySelectorAll(".cb-q").forEach(n => n.remove());
  function add(role, text) {
    const m = document.createElement("div"); m.className = "cb-m " + role;
    m.append(document.createTextNode(text));
    const t = document.createElement("time"); t.textContent = time(); m.append(t);
    log.append(m); scroll(); return m;
  }
  function chips(list) {
    const c = document.createElement("div"); c.className = "cb-q";
    list.forEach(it => {
      let el;
      if (it.href) { el = document.createElement("a"); el.href = it.href; el.target = it.href.startsWith("http") ? "_blank" : "_self"; el.rel = "noopener"; }
      else { el = document.createElement("button"); el.type = "button"; el.addEventListener("click", () => { clearChips(); user(it.label); it.go(); }); }
      el.textContent = it.label; c.append(el);
    });
    log.append(c); scroll();
  }
  const wait = ms => new Promise(r => setTimeout(r, reduce ? 0 : ms));
  async function say(text, list) {
    const ty = document.createElement("div"); ty.className = "cb-typing"; ty.innerHTML = "<i></i><i></i><i></i>"; ty.setAttribute("aria-label", "Assistant is typing");
    log.append(ty); scroll(); await wait(550); ty.remove();
    add("bot", text); hist.push({ role: "assistant", content: text }); save();
    if (list) chips(list);
  }
  function user(text) { add("user", text); hist.push({ role: "user", content: text }); save(); }
  function save() { try { sessionStorage.setItem("ft-chat", JSON.stringify(hist.slice(-30))); } catch (_) {} }

  /* ---------- guided lead flow (rule-based, no AI) ---------- */
  const ask = (key, q, opts, next) => say(q, opts.map(o => ({ label: o, go: () => { flow[key] = o; next(); } })));
  function startFlow() {
    flow = {};
    ask("biz", "Great, let’s find your package. What kind of business do you run?", ["Shop", "Restaurant", "Coaching class", "Clinic", "Freelancer", "Startup", "Other"],
      () => ask("need", "What do you need?", ["New website", "Redesign", "Online store", "Web application"],
        () => ask("feat", "Which feature matters most?", ["Just information", "Enquiry or booking form", "Online payments"],
          () => ask("budget", "Roughly what budget do you have?", ["Under ₹5,000", "₹5,000 to ₹15,000", "₹15,000 to ₹30,000", "Above ₹30,000"],
            () => ask("time", "How soon do you want to launch?", ["Within 2 weeks", "Within a month", "No rush"], recommend)))));
  }
  function recommend() {
    const f = flow;
    let plan = "Starter";
    if (f.need === "Online store" || f.need === "Web application" || f.feat === "Online payments" || f.budget === "Above ₹30,000") plan = "Premium";
    else if (f.feat === "Enquiry or booking form" || f.need === "Redesign" || f.budget === "₹15,000 to ₹30,000" || f.budget === "₹5,000 to ₹15,000") plan = "Business";
    const sum = `Business: ${f.biz}\nNeed: ${f.need}\nKey feature: ${f.feat}\nBudget: ${f.budget}\nTimeline: ${f.time}\nSuggested package: ${plan} (from ${inr(PRICES[plan])}, placeholder price)`;
    const msg = `Hi FuTech! Here is what I need:\n${sum}`;
    say(`Based on your answers, I’d suggest the ${plan} package, from ${inr(PRICES[plan])}. This is a guide only. We confirm price and timeline after a short conversation.\n\nYour summary:\n${sum}\n\nI don’t collect your details in this chat. Choose how to continue:`, [
      { label: "Fill the quote form", go: () => {}, href: "#contact" },
      { label: "Send on WhatsApp", go: () => {}, href: wa(msg) },
      { label: "Start over", go: startFlow },
    ]);
    const m = document.querySelector("#lead [name=message]"); if (m && !m.value) m.value = "Chat summary:\n" + sum;
    flow = null;
  }

  /* ---------- offline answers (rule-based) ---------- */
  const FAQ = [
    [/price|cost|₹|rupee|charge|how much|package/i, () => `Placeholder packages: Starter ${inr(PRICES.Starter)} (one page), Business ${inr(PRICES.Business)} (up to 6 pages), Premium ${inr(PRICES.Premium)} (store or custom). The estimator on this site gives a closer figure.`],
    [/how long|days|time|deliver|launch/i, () => "Starter sites take about 7 days after we get your content. Larger sites take 2 to 4 weeks. We confirm dates before starting."],
    [/maintain|update|support|backup/i, () => "Business includes 1 month of support and Premium 3 months. Ongoing maintenance for updates and backups is available as a separate service."],
    [/domain|hosting|host/i, () => "Domain and hosting are not included by default. We help you buy them in your name or add them as a clearly priced extra."],
    [/own|ownership|copyright/i, () => "You own your content and domain. We confirm ownership terms in writing before starting."],
    [/redesign|old|outdated/i, () => "Yes, we redesign old sites, keeping your content while improving design, speed and mobile experience."],
    [/contact|whatsapp|call|phone|email/i, () => "Use the quote form on this page or tap the WhatsApp button. We aim to reply within 24 hours."],
  ];
  const fallback = t => { const h = FAQ.find(([re]) => re.test(t)); return h ? h[1]() : "I can help with pricing, timelines and choosing a package. Tap an option below, or use the quote form for anything else."; };
  const menu = () => [
    { label: "Find my package", go: startFlow },
    { label: "Pricing", go: () => say(fallback("price"), menu()) },
    { label: "How long does it take?", go: () => say(fallback("how long"), menu()) },
    { label: "WhatsApp us", go: () => {}, href: wa("Hi FuTech, I have a question about a website.") },
  ];

  /* ---------- free text: real AI when configured ---------- */
  async function ask_ai() {
    const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 20000);
    const ty = document.createElement("div"); ty.className = "cb-typing"; ty.innerHTML = "<i></i><i></i><i></i>"; log.append(ty); scroll();
    try {
      const r = await fetch(CHAT.API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: hist.slice(-10) }), signal: ctl.signal });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.reply) throw new Error(d.error || "bad response");
      ty.remove(); add("bot", d.reply); hist.push({ role: "assistant", content: d.reply }); save(); chips(menu());
    } catch (_) {
      ty.remove(); aiDown = true; setMode();
      await say("Sorry, the AI service isn’t available right now, so I’m switching to guided mode.\n\n" + fallback(hist[hist.length - 1].content), menu());
    } finally { clearTimeout(to); }
  }
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const t = input.value.trim(); if (!t || busy) return;
    input.value = ""; clearChips(); flow = null; user(t); busy = true;
    if (CHAT.API_URL && !aiDown) await ask_ai(); else await say(fallback(t), menu());
    busy = false;
  });

  /* ---------- open / close / reset ---------- */
  function open(v) {
    box.classList.toggle("open", v); fab.setAttribute("aria-expanded", v);
    if (v) { if (!started) { started = true; greet(); } input.focus({ preventScroll: true }); } else fab.focus();
  }
  function greet() {
    setMode();
    say("Hi, I’m the FuTech assistant. I can explain packages and pricing, or help you find the right website for your business.", menu());
  }
  fab.addEventListener("click", () => open(!box.classList.contains("open")));
  $("[data-close]").addEventListener("click", () => open(false));
  $("[data-reset]").addEventListener("click", () => { log.innerHTML = ""; hist = []; flow = null; save(); greet(); });
  addEventListener("keydown", e => { if (e.key === "Escape" && box.classList.contains("open")) open(false); });
})();

/* README: AI setup
   1. cd worker && npm i -g wrangler && wrangler login
   2. wrangler secret put ANTHROPIC_API_KEY      (never put the key in this file)
   3. wrangler deploy                            -> copy the *.workers.dev URL
   4. Paste the URL into CHAT.API_URL above and set ALLOWED_ORIGIN in worker/wrangler.toml to your site origin. */
