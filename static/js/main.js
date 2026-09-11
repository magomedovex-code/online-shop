/* ==========================================================================
   AUREON — global interactions & scroll choreography
   GSAP + ScrollTrigger + Lenis. Everything degrades to a static page when
   the libraries are missing or the visitor prefers reduced motion.
   ========================================================================== */
(() => {
  "use strict";

  const doc = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const { gsap, ScrollTrigger, Lenis } = window;
  const animate = Boolean(gsap && ScrollTrigger) && !reduceMotion;

  if (!animate) doc.classList.add("no-anim");
  if (gsap && ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  window.__aureonReady = true;

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const formatNumber = (n) => Number(n || 0).toLocaleString("ru-RU");

  /* ---------- Smooth scrolling ---------- */
  let lenis = null;
  if (animate && Lenis) {
    lenis = new Lenis({ duration: 1.1, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  window.aureon = { lenis, animate, formatNumber };

  /* ---------- Page transitions (gold-edged veil) ---------- */
  const veil = $(".page-veil");
  if (doc.classList.contains("pt-enter")) {
    // The auth page runs its own black-screen intro, so it skips the veil.
    if (!animate || $("[data-auth]")) {
      doc.classList.remove("pt-enter");
    } else {
      requestAnimationFrame(() => {
        veil.classList.add("is-entering");
        doc.classList.remove("pt-enter");
        veil.addEventListener("transitionend", () => veil.classList.remove("is-entering"), { once: true });
      });
    }
  }

  document.addEventListener("click", (e) => {
    const link = e.target.closest("a[href]");
    if (!link || e.defaultPrevented || !animate) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if ((link.target && link.target !== "_self") || link.hasAttribute("download")) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || (url.pathname === location.pathname && url.hash)) return;
    e.preventDefault();
    try { sessionStorage.setItem("aureon:pt", "1"); } catch (_) { /* storage blocked */ }
    veil.classList.add("is-leaving");
    setTimeout(() => { location.href = url.href; }, 560);
  });

  window.addEventListener("pageshow", (e) => {
    if (!e.persisted) return;
    veil.classList.remove("is-leaving", "is-entering");
    $$(".btn.is-loading").forEach((b) => b.classList.remove("is-loading"));
    $$("form[data-submitted]").forEach((f) => delete f.dataset.submitted);
  });

  /* ---------- Header: glass on scroll, hide on the way down ---------- */
  const header = $("[data-header]");
  let lastY = window.scrollY;
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle("is-scrolled", y > 24);
    if (Math.abs(y - lastY) > 6 && !header.classList.contains("menu-open")) {
      header.classList.toggle("is-hidden", y > lastY && y > 420);
      lastY = y;
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  const menuToggle = $("[data-menu-toggle]");
  const setMenu = (open) => {
    header.classList.toggle("menu-open", open);
    header.classList.remove("is-hidden");
    menuToggle.setAttribute("aria-expanded", String(open));
    if (lenis) open ? lenis.stop() : lenis.start();
    else document.body.style.overflow = open ? "hidden" : "";
  };
  if (menuToggle) {
    menuToggle.addEventListener("click", () => setMenu(!header.classList.contains("menu-open")));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });
    window.matchMedia("(min-width: 901px)").addEventListener("change", (e) => { if (e.matches) setMenu(false); });
  }

  /* ---------- Forms: password reveal, loading state, no double submit ---------- */
  $$("[data-toggle-password]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = btn.parentElement.querySelector("input");
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.setAttribute("aria-pressed", String(show));
      btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
    });
  });

  $$("form[data-loading]").forEach((form) => {
    form.addEventListener("submit", (e) => {
      if (form.dataset.submitted) { e.preventDefault(); return; }
      form.dataset.submitted = "1";
      const btn = form.querySelector('[type="submit"]');
      if (btn) btn.classList.add("is-loading");
    });
  });

  /* ---------- Add-product live preview ---------- */
  const productForm = $("[data-product-form]");
  const preview = $("[data-preview]");
  if (productForm && preview) {
    const media = $(".product-media", preview);
    const img = $("img", media);
    const set = (sel, value) => { $(sel, preview).textContent = value; };
    const bind = (name, render) => {
      const input = productForm.elements[name];
      if (!input) return;
      input.addEventListener("input", () => render(input.value.trim()));
      render(input.value.trim());
    };
    img.addEventListener("load", () => media.classList.remove("is-empty"));
    img.addEventListener("error", () => media.classList.add("is-empty"));
    bind("product", (v) => set("[data-preview-name]", v || "Product name"));
    bind("description", (v) => set("[data-preview-desc]", v || "A short, elegant description of the piece."));
    bind("price", (v) => set("[data-preview-price]", formatNumber(v)));
    bind("amount", (v) => set("[data-preview-stock]", `${v || 0} in stock`));
    bind("pic", (v) => {
      if (v) img.src = v;
      else { img.removeAttribute("src"); media.classList.add("is-empty"); }
    });
  }

  /* ---------- Card spotlight + tilt, member-card sheen ---------- */
  if (finePointer && !reduceMotion) {
    $$("[data-tilt]").forEach((card) => {
      const max = parseFloat(card.dataset.tilt) || 6;
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        card.style.setProperty("--mx", `${px * 100}%`);
        card.style.setProperty("--my", `${py * 100}%`);
        card.style.setProperty("--sheen", `${(px - 0.5) * 60}%`);
        if (gsap) {
          gsap.to(card, {
            rotationY: (px - 0.5) * max, rotationX: (0.5 - py) * max,
            transformPerspective: 1000, duration: 0.6, ease: "power3.out", overwrite: "auto",
          });
        }
      });
      card.addEventListener("pointerleave", () => {
        card.style.setProperty("--sheen", "-20%");
        if (gsap) gsap.to(card, { rotationX: 0, rotationY: 0, duration: 1, ease: "elastic.out(1, 0.6)" });
      });
    });
  }

  /* ---------- Pillars: swap the sticky image as each text block becomes active ---------- */
  const pillars = $$("[data-pillar]");
  if (pillars.length) {
    const images = $$("[data-pillar-img]");
    const activate = (index) => {
      pillars.forEach((p, i) => p.classList.toggle("is-active", i === index));
      images.forEach((img, i) => img.classList.toggle("is-active", i === index));
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) activate(pillars.indexOf(entry.target)); });
    }, { rootMargin: "-45% 0px -45% 0px" });
    pillars.forEach((p) => io.observe(p));
  }

  if (!animate) return;

  /* ======================================================================
     Motion below this line only
     ====================================================================== */

  /* Wraps every word in a mask so it can rise into view; keeps <em> etc. */
  const splitWords = (el, masked = true) => {
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const word = document.createElement("span");
            word.className = masked ? "w" : "wo";
            if (masked) {
              const inner = document.createElement("span");
              inner.className = "w-in";
              inner.textContent = part;
              word.appendChild(inner);
            } else {
              word.textContent = part;
            }
            frag.appendChild(word);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== "BR") {
          if (masked && child.tagName === "EM") child.classList.add("is-split");
          walk(child);
        }
      });
    };
    walk(el);
    el.style.visibility = "visible";
    return $$(masked ? ".w-in" : ".wo", el);
  };

  /* ---------- Hero: cinematic entrance + scroll-away ---------- */
  const hero = $("[data-hero]");
  if (hero) {
    const title = $("[data-split]", hero);
    const words = title ? splitWords(title) : [];
    const tl = gsap.timeline({ defaults: { ease: "expo.out" }, delay: 0.15 });
    tl.fromTo($(".hero-media", hero), { scale: 1.22, opacity: 0 }, { scale: 1, opacity: 1, duration: 2.6, ease: "power3.out" })
      .fromTo($$(".hero-lines span", hero), { scaleY: 0 }, { scaleY: 1, duration: 1.8, stagger: 0.12, ease: "expo.inOut" }, 0.1)
      .fromTo(words, { yPercent: 118, rotate: 3 }, { yPercent: 0, rotate: 0, duration: 1.5, stagger: 0.07 }, 0.55)
      .fromTo($$("[data-hero-in]", hero), { opacity: 0, y: 34, filter: "blur(8px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.4, stagger: 0.12, clearProps: "filter" }, 0.45);

    gsap.to($(".hero-inner", hero), {
      yPercent: -14, opacity: 0.1, ease: "none",
      scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true },
    });
    gsap.to($(".hero-media img", hero), {
      yPercent: 10, scale: 1.08, ease: "none",
      scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true },
    });
  }

  /* ---------- Headlines outside the hero ---------- */
  $$("[data-split]").forEach((el) => {
    if (el.closest("[data-hero]")) return;
    const words = splitWords(el);
    gsap.fromTo(words, { yPercent: 118, rotate: 3 }, {
      yPercent: 0, rotate: 0, duration: 1.4, ease: "expo.out", stagger: 0.06,
      scrollTrigger: { trigger: el, start: "top 86%", once: true },
    });
  });

  /* ---------- Generic reveals: data-reveal="up|blur|scale|left|right" ---------- */
  const revealFrom = {
    up: { y: 50 },
    blur: { y: 26, filter: "blur(14px)" },
    scale: { y: 30, scale: 0.93 },
    left: { x: -60 },
    right: { x: 60 },
  };
  $$("[data-reveal]").forEach((el) => {
    const from = { opacity: 0, ...(revealFrom[el.dataset.reveal] || revealFrom.up) };
    gsap.fromTo(el, from, {
      opacity: 1, x: 0, y: 0, scale: 1, filter: "blur(0px)",
      duration: 1.3, ease: "power3.out", delay: parseFloat(el.dataset.delay || 0),
      clearProps: "filter",
      scrollTrigger: { trigger: el, start: "top 88%", once: true },
    });
  });

  /* ---------- Staggered groups (cards, tiles, rows) ---------- */
  $$("[data-stagger]").forEach((group) => {
    gsap.fromTo(group.children, { opacity: 0, y: 60 }, {
      opacity: 1, y: 0, duration: 1.2, ease: "power3.out", stagger: 0.1,
      scrollTrigger: { trigger: group, start: "top 86%", once: true },
    });
  });

  /* ---------- Manifesto: words light up as you read ---------- */
  $$("[data-words]").forEach((el) => {
    const words = splitWords(el, false);
    gsap.fromTo(words, { opacity: 0.12 }, {
      opacity: 1, ease: "none", stagger: 0.1,
      scrollTrigger: { trigger: el, start: "top 78%", end: "bottom 45%", scrub: true },
    });
  });

  /* ---------- Parallax images ---------- */
  $$("[data-parallax]").forEach((el) => {
    const amount = parseFloat(el.dataset.parallax) || 8;
    gsap.fromTo(el, { yPercent: -amount }, {
      yPercent: amount, ease: "none",
      scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true },
    });
  });

  /* ---------- Gold rules draw across the page ---------- */
  $$("[data-line]").forEach((el) => {
    gsap.fromTo(el, { scaleX: 0 }, {
      scaleX: 1, ease: "none",
      scrollTrigger: { trigger: el, start: "top 92%", end: "top 55%", scrub: true },
    });
  });

  /* ---------- Count-up numbers (real values rendered by the server) ---------- */
  $$("[data-count]").forEach((el) => {
    const end = parseInt(el.dataset.count, 10) || 0;
    const counter = { value: 0 };
    el.textContent = "0";
    gsap.to(counter, {
      value: end, duration: 2.2, ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 90%", once: true },
      onUpdate: () => { el.textContent = formatNumber(Math.round(counter.value)); },
    });
  });

  /* ---------- Closing CTA: frame opens to full bleed while scrolling ---------- */
  const cta = $("[data-cta]");
  if (cta) {
    gsap.fromTo($(".cta-frame", cta), { clipPath: "inset(8% 7% 8% 7% round 36px)" }, {
      clipPath: "inset(0% 0% 0% 0% round 0px)", ease: "none",
      scrollTrigger: { trigger: cta, start: "top 95%", end: "top 15%", scrub: true },
    });
    gsap.fromTo($(".cta-media img", cta), { scale: 1.3 }, {
      scale: 1, ease: "none",
      scrollTrigger: { trigger: cta, start: "top bottom", end: "bottom top", scrub: true },
    });
  }

  /* ---------- Footer wordmark fills with gold as the page ends ---------- */
  const footerFill = $("[data-footer-fill]");
  if (footerFill) {
    gsap.fromTo(footerFill, { clipPath: "inset(100% 0 0 0)" }, {
      clipPath: "inset(0% 0 0 0)", ease: "none",
      scrollTrigger: { trigger: footerFill, start: "top bottom", end: "bottom bottom", scrub: true },
    });
  }

  /* ---------- Cursor ring + magnetic buttons ---------- */
  if (finePointer) {
    const cursor = $(".cursor");
    const moveX = gsap.quickTo(cursor, "x", { duration: 0.35, ease: "power3.out" });
    const moveY = gsap.quickTo(cursor, "y", { duration: 0.35, ease: "power3.out" });
    window.addEventListener("pointermove", (e) => {
      cursor.classList.add("is-visible");
      moveX(e.clientX);
      moveY(e.clientY);
    }, { passive: true });
    document.addEventListener("pointerover", (e) => {
      cursor.classList.toggle("is-hover", Boolean(e.target.closest("a, button, [data-tilt], .secret")));
      cursor.classList.toggle("is-text", Boolean(e.target.closest("input, textarea, select")));
    });
    doc.addEventListener("pointerleave", () => cursor.classList.remove("is-visible"));

    $$("[data-magnetic]").forEach((el) => {
      const toX = gsap.quickTo(el, "x", { duration: 0.6, ease: "power3.out" });
      const toY = gsap.quickTo(el, "y", { duration: 0.6, ease: "power3.out" });
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        toX((e.clientX - r.left - r.width / 2) * 0.25);
        toY((e.clientY - r.top - r.height / 2) * 0.35);
      });
      el.addEventListener("pointerleave", () => { toX(0); toY(0); });
    });
  }

  window.addEventListener("load", () => ScrollTrigger.refresh());
})();
