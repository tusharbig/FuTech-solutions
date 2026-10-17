/* ===== FuTech settings: edit these ===== */
const CONFIG = {
  WHATSAPP_NUMBER: "91XXXXXXXXXX",   // country code + number, digits only, e.g. 919876543210
  NEWSLETTER_URL: "",                 // optional endpoint for the newsletter box. Empty = not connected.
  FORMSPREE_URL: "",                  // e.g. "https://formspree.io/f/yourFormId". Leave empty until connected.
};

document.documentElement.classList.add("js");
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const fine = matchMedia("(pointer: fine)").matches;
const lite = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 2; // low-power devices skip heavy motion
if (lite) document.documentElement.classList.add("lite");

/* WhatsApp links */
const waLink = (text) => `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
$$("[data-wa]").forEach(a => a.href = waLink("Hi FuTech, I’d like a website for my business."));
$("#yr").textContent = new Date().getFullYear();

/* Hero headline: split into words for staggered reveal */
$$("[data-split]").forEach(el => {
  const text = el.textContent.trim();
  el.setAttribute("aria-label", text);
  let n = 0;
  el.innerHTML = text.split(" ").map(w =>
    `<span class="w" aria-hidden="true">${[...w].map(c => `<span style="--i:${n++}">${c}</span>`).join("")}</span>`).join(" ");
});

/* Mobile menu */
const burger = $(".burger"), menu = $("#menu");
const setMenu = (open) => {
  burger.setAttribute("aria-expanded", open);
  burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  menu.classList.toggle("open", open);
  document.body.style.overflow = open ? "hidden" : "";
};
burger.addEventListener("click", () => setMenu(burger.getAttribute("aria-expanded") !== "true"));
$$("a", menu).forEach(a => a.addEventListener("click", () => setMenu(false)));
addEventListener("keydown", e => { if (e.key === "Escape") setMenu(false); });

/* Scroll state: nav background, back-to-top, parallax */
const nav = $(".nav"), topBtn = $(".to-top"), pars = $$("[data-par]");
let ticking = false;
const onScroll = () => {
  const y = scrollY;
  nav.classList.toggle("scrolled", y > 20);
  topBtn.classList.toggle("show", y > 700);
  if (!reduce && !lite && innerWidth > 960) pars.forEach(p => p.style.translate = `0 ${y * p.dataset.par}px`);
  ticking = false;
};
addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
onScroll();
topBtn.addEventListener("click", () => scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }));

/* Reveal on scroll + counters */
const countUp = (el) => {
  const to = +el.dataset.to;
  if (reduce || to === 0) { el.textContent = to; return; }
  const t0 = performance.now(), dur = 1400;
  const tick = (t) => {
    const p = Math.min((t - t0) / dur, 1);
    el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};
const io = new IntersectionObserver((entries) => entries.forEach(en => {
  if (!en.isIntersecting) return;
  en.target.classList.add("show");
  $$("[data-to]", en.target).forEach(countUp);
  io.unobserve(en.target);
}), { threshold: .15 });
$$(".rv").forEach(el => io.observe(el));
$$(".stats").forEach(el => io.observe(el));

/* Active nav link */
const links = $$("#menu a[href^='#']:not(.btn)");
const spy = new IntersectionObserver((entries) => entries.forEach(en => {
  if (!en.isIntersecting) return;
  links.forEach(a => a.toggleAttribute("aria-current", a.getAttribute("href") === "#" + en.target.id));
}), { rootMargin: "-45% 0px -50% 0px" });
links.forEach(a => { const s = $(a.getAttribute("href")); if (s) spy.observe(s); });

/* Magnetic hover */
if (!reduce && !lite && fine) {
  $$(".mag").forEach(el => {
    el.addEventListener("pointermove", e => {
      const r = el.getBoundingClientRect();
      el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .22}px,${(e.clientY - r.top - r.height / 2) * .3}px)`;
    });
    el.addEventListener("pointerleave", () => el.style.transform = "");
  });
}

/* Portfolio filter + search */
const fbtns = $$(".filters button"), cards = $$(".pf"), q = $("#q"), none = $("#none");
let cat = "all";
const applyPf = () => {
  const s = q.value.trim().toLowerCase(); let n = 0;
  cards.forEach(c => {
    const show = (cat === "all" || c.dataset.c === cat) && (!s || (c.textContent + " " + c.dataset.c).toLowerCase().includes(s));
    const was = !c.hidden; c.hidden = !show;
    if (show) { n++; if (!was) { c.classList.remove("in-anim"); void c.offsetWidth; c.classList.add("in-anim"); } }
  });
  none.hidden = n > 0;
};
fbtns.forEach(b => b.addEventListener("click", () => { cat = b.dataset.f; fbtns.forEach(x => x.setAttribute("aria-pressed", x === b)); applyPf(); }));
q.addEventListener("input", applyPf);

/* FAQ accordion */
$$(".faq button").forEach(b => b.addEventListener("click", () => {
  const open = b.getAttribute("aria-expanded") === "true";
  $$(".faq button").forEach(x => x.setAttribute("aria-expanded", "false"));
  b.setAttribute("aria-expanded", String(!open));
}));

/* Before/after slider */
const ba = $(".ba"), range = $("input", ba);
range.addEventListener("input", () => ba.style.setProperty("--p", range.value + "%"));

/* Pricing buttons pre-fill the form */
$$("[data-plan]").forEach(a => a.addEventListener("click", () => {
  const m = $("#lead [name=message]");
  if (!m.value) m.value = `I’m interested in the ${a.dataset.plan} package. `;
}));

/* Lead form: validates, then sends via Formspree if configured, otherwise opens WhatsApp. Never fakes a send. */
const form = $("#lead"), status = $("#status");
const rules = {
  name: v => v.trim().length >= 2 || "Please enter your name.",
  type: v => !!v || "Please choose a business type.",
  phone: v => /^[+()\d\s-]{10,15}$/.test(v.trim()) || "Enter a valid phone number (10 to 15 digits).",
  email: v => !v.trim() || /^\S+@\S+\.\S+$/.test(v.trim()) || "Enter a valid email address.",
  message: v => v.trim().length >= 10 || "Tell us a little more (at least 10 characters).",
};
const check = (name) => {
  const f = form.elements[name], lab = f.closest("label"), res = rules[name](f.value);
  lab.classList.toggle("err", res !== true);
  $("small", lab).textContent = res === true ? "" : res;
  f.setAttribute("aria-invalid", res !== true);
  return res === true;
};
Object.keys(rules).forEach(n => form.elements[n].addEventListener("blur", () => check(n)));

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  status.className = ""; status.textContent = "";
  const ok = Object.keys(rules).map(check).every(Boolean);
  if (!ok) { const bad = $("label.err input, label.err select, label.err textarea", form); bad && bad.focus(); status.className = "bad"; status.textContent = "Please fix the highlighted fields."; return; }
  const d = Object.fromEntries(new FormData(form));
  if (CONFIG.FORMSPREE_URL) {
    try {
      const r = await fetch(CONFIG.FORMSPREE_URL, { method: "POST", headers: { Accept: "application/json" }, body: new FormData(form) });
      if (!r.ok) throw new Error();
      form.reset(); status.className = "ok"; status.textContent = "Thank you! Your enquiry was sent. We will reply soon.";
    } catch (_) { status.className = "bad"; status.textContent = "Sorry, sending failed. Please try again or use WhatsApp."; }
    return;
  }
  const msg = `Hi FuTech! New enquiry:\nName: ${d.name}\nBusiness: ${d.type}\nPhone: ${d.phone}\nEmail: ${d.email || "-"}\nBudget: ${d.budget || "Not sure"}\nNeeds: ${d.message}`;
  status.className = "ok";
  status.textContent = "The enquiry form isn’t connected to a server yet, so nothing has been sent. WhatsApp will open with your details. Press send there to reach us.";
  window.open(waLink(msg), "_blank", "noopener");
});

/* ===== v2 upgrade ===== */

/* Loader */
const loader = $(".loader"), hideLoader = () => loader.classList.add("done");
if (reduce) hideLoader(); else addEventListener("load", () => setTimeout(hideLoader, 650));
setTimeout(hideLoader, 2500);

/* Scroll progress */
const prog = $(".prog");
addEventListener("scroll", () => {
  const max = document.documentElement.scrollHeight - innerHeight;
  prog.style.setProperty("--s", max > 0 ? Math.min(scrollY / max, 1) : 0);
}, { passive: true });

/* Dark / light mode */
const themeBtn = $(".theme");
const applyTheme = (t, persist) => {
  document.documentElement.dataset.theme = t;
  themeBtn.setAttribute("aria-label", t === "dark" ? "Switch to light mode" : "Switch to dark mode");
  $("use", themeBtn).setAttribute("href", t === "dark" ? "#i-sun" : "#i-moon");
  $("meta[name=theme-color]").content = t === "dark" ? "#04141A" : "#0E7C86";
  if (persist) { try { localStorage.setItem("ft-theme", t); } catch (_) {} }
};
applyTheme(document.documentElement.dataset.theme || "light", false);
themeBtn.addEventListener("click", () => applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark", true));

/* Tilt cards + hero spotlight */
if (!reduce && !lite && fine) {
  $$(".shot").forEach(s => {
    s.addEventListener("pointermove", e => {
      const r = s.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      s.style.transform = `perspective(700px) rotateX(${-y * 10}deg) rotateY(${x * 12}deg) translateY(-8px)`;
    });
    s.addEventListener("pointerleave", () => s.style.transform = "");
  });
  const hero = $(".hero"), bro = $(".bro");
  hero.addEventListener("pointermove", e => {
    const r = hero.getBoundingClientRect();
    hero.style.setProperty("--mx", e.clientX - r.left + "px"); hero.style.setProperty("--my", e.clientY - r.top + "px");
    const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5;
    bro.style.transform = `perspective(1000px) rotateY(${x * 10}deg) rotateX(${-y * 8}deg) rotate(-2.5deg)`;
  });
  hero.addEventListener("pointerleave", () => bro.style.transform = "");
}

/* Testimonial carousel */
const tm = $(".tm");
$$(".car").forEach(b => b.addEventListener("click", () =>
  tm.scrollBy({ left: +b.dataset.d * (tm.firstElementChild.offsetWidth + 24), behavior: reduce ? "auto" : "smooth" })));

/* Project cost estimator. Edit prices here (INR). */
const EST = {
  kinds: { landing: { base: 4999, pages: 1, days: 7 }, business: { base: 14999, pages: 6, days: 14 }, store: { base: 29999, pages: 8, days: 28 } },
  perPage: 1500, extras: { logo: 3000, copy: 2500, booking: 4000 }, rangePct: .15,
};
const ef = $("#est"), eo = $("#etotal"), inr = n => "₹" + Math.round(n).toLocaleString("en-IN");
let shown = 0, tid, last = {};
const tween = (to) => {
  if (reduce) { eo.textContent = inr(to); shown = to; return; }
  const from = shown, t0 = performance.now(); cancelAnimationFrame(tid);
  const f = (t) => { const p = Math.min((t - t0) / 450, 1); shown = from + (to - from) * (1 - Math.pow(1 - p, 3)); eo.textContent = inr(shown); if (p < 1) tid = requestAnimationFrame(f); };
  tid = requestAnimationFrame(f);
};
const calc = () => {
  const radio = $("input[name=kind]:checked", ef), k = EST.kinds[radio.value], pages = +ef.elements.pages.value;
  const extras = $$("input[name=extra]:checked", ef), more = Math.max(0, pages - k.pages);
  const total = k.base + more * EST.perPage + extras.reduce((s, c) => s + EST.extras[c.value], 0);
  const days = k.days + Math.ceil(more / 2) + extras.length * 2;
  $("#epv").textContent = pages;
  $("#erange").textContent = `Likely range: ${inr(total * (1 - EST.rangePct))} to ${inr(total * (1 + EST.rangePct))}`;
  $("#edays").textContent = `About ${days} days after we receive your content`;
  last = { total, days, pages, kind: radio.dataset.label, extras: extras.map(c => c.parentElement.textContent.trim()) };
  tween(total);
};
ef.addEventListener("input", calc);
ef.addEventListener("submit", e => e.preventDefault());
calc();
$("#ereq").addEventListener("click", () => {
  $("#lead [name=message]").value = `Project estimate: ${last.kind}, ${last.pages} page(s), extras: ${last.extras.join(", ") || "none"}. Estimated ${inr(last.total)} in about ${last.days} days. `;
  $("#contact").scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  setTimeout(() => $("#lead [name=name]").focus({ preventScroll: true }), reduce ? 0 : 600);
});

/* Newsletter: never pretends to subscribe when no endpoint is set */
const nf = $("#news"), ns = $("#nstat");
nf.addEventListener("submit", async (e) => {
  e.preventDefault(); ns.className = "";
  const em = $("#ne").value.trim();
  if (!/^\S+@\S+\.\S+$/.test(em)) { ns.className = "bad"; ns.textContent = "Enter a valid email address."; return; }
  if (!CONFIG.NEWSLETTER_URL) { ns.className = "ok"; ns.textContent = "The newsletter isn’t connected yet, so your email was not saved. Message us on WhatsApp for tips meanwhile."; return; }
  try {
    const r = await fetch(CONFIG.NEWSLETTER_URL, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ email: em }) });
    if (!r.ok) throw new Error();
    nf.reset(); ns.className = "ok"; ns.textContent = "Subscribed. Thank you!";
  } catch (_) { ns.className = "bad"; ns.textContent = "Sorry, that failed. Please try again."; }
});

/* ===== v3: live storefront preview, scroll-linked process line, masked project reveals ===== */
const SITES = [
  { n: "Sharma Sweets", u: "sharmasweets.example", h: "Fresh sweets,<br>delivered today", c: "Order on WhatsApp", a: "#E5336D", b: "#FFB422" },
  { n: "Tandoor Tales", u: "tandoortales.example", h: "Dinner tonight?<br>Book a table", c: "Reserve a table", a: "#0B6B4F", b: "#2BB673" },
  { n: "BrightPath Classes", u: "brightpath.example", h: "New batches open.<br>Fees on one page", c: "Enquire for admission", a: "#2F4BB8", b: "#7FD6D0" },
  { n: "Lotus Clinic", u: "lotusclinic.example", h: "Timings, doctors<br>and map in one place", c: "Call the clinic", a: "#0E7C86", b: "#9BE3D6" },
];
const site = $(".bro"), tabs = $$(".tabs [role=tab]");
let cur = 0, auto = null;
const showSite = (i) => {
  cur = i; const s = SITES[i];
  tabs.forEach((t, j) => { t.setAttribute("aria-selected", j === i); t.tabIndex = j === i ? 0 : -1; });
  site.style.setProperty("--a", s.a); site.style.setProperty("--b", s.b);
  $("#bro-name").textContent = s.n; $("#bro-url").textContent = s.u; $("#bro-h").innerHTML = s.h; $("#bro-cta").textContent = s.c;
  const p = $(".mhero"); p.classList.remove("swap"); void p.offsetWidth; p.classList.add("swap");
};
const stopAuto = () => { clearInterval(auto); auto = null; };
tabs.forEach((t, i) => {
  t.addEventListener("click", () => { stopAuto(); showSite(i); });
  t.addEventListener("keydown", e => {
    const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (!d) return;
    e.preventDefault(); stopAuto(); const n = (i + d + tabs.length) % tabs.length; showSite(n); tabs[n].focus();
  });
});
const heroV = $(".hero-v"); heroV.addEventListener("pointerenter", stopAuto); heroV.addEventListener("focusin", stopAuto);
if (!reduce && !lite) auto = setInterval(() => { if (!document.hidden) showSite((cur + 1) % SITES.length); }, 4500);

const stepsEl = $(".steps"), stepLis = $$("li", stepsEl);
const updSteps = () => {
  const r = stepsEl.getBoundingClientRect(), v = innerWidth <= 960;
  const pg = reduce ? 1 : Math.max(0, Math.min(1, v ? (innerHeight * .7 - r.top - 24) / (r.height - 48) : (innerHeight * .85 - r.top) / (innerHeight * .45)));
  stepsEl.style.setProperty("--pg", pg);
  stepLis.forEach(li => {
    const l = li.getBoundingClientRect(), f = v ? (l.top - r.top) / (r.height - 48) : (l.left - r.left) / (r.width - 48);
    li.classList.toggle("on", pg >= Math.max(0, f) - .001 && pg > 0);
  });
};
addEventListener("scroll", updSteps, { passive: true }); addEventListener("resize", updSteps); updSteps();

