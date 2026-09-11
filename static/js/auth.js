/* ==========================================================================
   AUREON — Sign in ⇄ Create account
   Intro:   black screen → gold line of light → the panel unfolds from it.
   Desktop: the gold-lit overlay slides across in 3D, a light sweep crosses the
            glass, the old form dissolves and the new one flows in.
   Mobile:  the tab pill slides and the card turns like a cube face.
   Switch links are real links to /login and /register, so without JS (or with
   reduced motion) everything still works as normal page navigation.
   ========================================================================== */
(() => {
  "use strict";

  const auth = document.querySelector("[data-auth]");
  if (!auth) return;

  const { gsap } = window;
  const animate = Boolean(window.aureon && window.aureon.animate && gsap);
  const desktop = window.matchMedia("(min-width: 861px)");
  const urls = { login: auth.dataset.loginUrl, register: auth.dataset.registerUrl };
  const titles = { login: "Sign in · AUREON", register: "Create account · AUREON" };

  const $ = (sel, ctx = auth) => ctx.querySelector(sel);
  const $$ = (sel, ctx = auth) => Array.from(ctx.querySelectorAll(sel));

  const shell = $(".auth-shell");
  const forms = $(".auth-forms");
  const overlay = $(".auth-overlay");
  const overlayBg = $(".auth-overlay-bg");
  const blade = $(".auth-blade");
  const sweep = $(".auth-sweep");
  const glow = $(".auth-glow");
  const intro = document.querySelector(".auth-intro");
  const panes = { login: $('[data-pane="login"]'), register: $('[data-pane="register"]') };
  const copies = { login: $('[data-overlay="login"]'), register: $('[data-overlay="register"]') };
  const itemsOf = (el) => $$("[data-auth-item]", el);

  let mode = auth.dataset.mode === "register" ? "register" : "login";
  let busy = false;

  /* ---------- State ---------- */
  const applyState = (next) => {
    mode = next;
    auth.dataset.mode = next;
    auth.dataset.target = next;
    Object.keys(panes).forEach((key) => {
      panes[key].inert = key !== next;
      copies[key].inert = key !== next;
    });
    $$(".auth-tab").forEach((tab) => {
      if (tab.dataset.authSwitch === next) tab.setAttribute("aria-current", "page");
      else tab.removeAttribute("aria-current");
    });
    document.title = titles[next];
  };

  // Gold light positions follow the overlay: right side for "login", left for "register".
  const lightFor = (m) => ({
    glowX: desktop.matches ? (m === "login" ? "14vw" : "-14vw") : "0vw",
    bladeRotation: m === "login" ? -16 : 16,
    bladeX: m === "login" ? 0 : 24,
  });
  const placeLight = (m) => {
    if (!gsap) return;
    const l = lightFor(m);
    gsap.set(glow, { x: l.glowX });
    gsap.set(blade, { rotation: l.bladeRotation, xPercent: l.bladeX });
  };

  const modeFromPath = () => {
    if (location.pathname === urls.register) return "register";
    if (location.pathname === urls.login) return "login";
    return null;
  };

  const finish = (next, cleanup) => {
    applyState(next);
    cleanup();
    busy = false;
    if (desktop.matches) {
      const first = panes[next].querySelector("input");
      if (first) first.focus({ preventScroll: true });
    }
    // The URL may have changed (back/forward) while we were animating.
    const wanted = modeFromPath();
    if (wanted && wanted !== mode) switchTo(wanted, { push: false });
  };

  /* ---------- Desktop: sliding 3D overlay ---------- */
  const desktopSwitch = (from, next) => {
    const toRegister = next === "register";
    const dir = toRegister ? -1 : 1; // the overlay travels left when opening "register"
    const outItems = itemsOf(panes[from]);
    const inItems = itemsOf(panes[next]);
    const outCopy = itemsOf(copies[from]);
    const inCopy = itemsOf(copies[next]);
    const light = lightFor(next);

    gsap.set(copies[next], { autoAlpha: 1 });
    gsap.set([...inCopy, ...inItems], { autoAlpha: 0 });

    const tl = gsap.timeline({
      defaults: { ease: "power3.inOut" },
      onComplete: () => finish(next, () => {
        gsap.set([...outItems, ...inItems, ...outCopy, ...inCopy], { clearProps: "all" });
        gsap.set([copies.login, copies.register], { clearProps: "opacity,visibility" });
        gsap.set([shell, overlay, overlayBg], { clearProps: "transform" });
        gsap.set(sweep, { clearProps: "opacity,transform" });
      }),
    });

    tl
      // the whole panel leans into the motion, then settles
      .to(shell, { rotationY: dir * 4, scale: 0.985, duration: 0.5, ease: "power2.out" }, 0)
      .to(shell, { rotationY: 0, scale: 1, duration: 0.9, ease: "power3.out" }, 0.55)
      // outgoing content dissolves in the direction of travel
      .to(outItems, { autoAlpha: 0, x: dir * 36, filter: "blur(6px)", duration: 0.42, stagger: 0.03, ease: "power2.in" }, 0)
      .to(outCopy, { autoAlpha: 0, x: dir * 50, filter: "blur(8px)", duration: 0.4, stagger: 0.03, ease: "power2.in" }, 0)
      // the gold-lit panel travels, turning slightly in 3D and stretching like liquid metal
      .fromTo(overlay, { x: 0, xPercent: toRegister ? 0 : -100 }, { xPercent: toRegister ? -100 : 0, duration: 1.05, ease: "expo.inOut" }, 0.08)
      .to(overlay, { keyframes: { rotationY: [0, dir * 9, 0], z: [0, 40, 0] }, duration: 1.05, ease: "sine.inOut" }, 0.08)
      .to(overlayBg, {
        keyframes: { scaleX: [1, 1.12, 1] }, transformOrigin: toRegister ? "100% 50%" : "0% 50%",
        duration: 1.05, ease: "sine.inOut",
      }, 0.08)
      .to(blade, { rotation: light.bladeRotation, xPercent: light.bladeX, duration: 1.25, ease: "power3.inOut" }, 0.05)
      .to(glow, { x: light.glowX, duration: 1.5, ease: "power3.inOut" }, 0)
      // a band of light crosses the glass with the panel
      .fromTo(sweep, { xPercent: toRegister ? 190 : -110 }, { xPercent: toRegister ? -110 : 190, duration: 1.15, ease: "power2.inOut" }, 0.1)
      .to(sweep, { keyframes: { opacity: [0, 1, 0] }, duration: 1.15, ease: "none" }, 0.1)
      // incoming content flows in behind the panel, blur to sharp
      .fromTo(inCopy, { autoAlpha: 0, x: -dir * 50, filter: "blur(8px)" },
        { autoAlpha: 1, x: 0, filter: "blur(0px)", duration: 0.8, stagger: 0.06, ease: "power3.out" }, 0.62)
      .fromTo(inItems, { autoAlpha: 0, x: -dir * 36, filter: "blur(8px)" },
        { autoAlpha: 1, x: 0, filter: "blur(0px)", duration: 0.8, stagger: 0.05, ease: "power3.out" }, 0.7);
  };

  /* ---------- Mobile: card turns between the two forms ---------- */
  const mobileSwitch = (from, next) => {
    const toRegister = next === "register";
    const dir = toRegister ? -1 : 1; // content travels left when opening "register" (right-hand tab)
    const outPane = panes[from];
    const inPane = panes[next];
    const inItems = itemsOf(inPane);
    const startHeight = forms.offsetHeight;

    gsap.set(inPane, { autoAlpha: 1 });
    const endHeight = inPane.offsetHeight;
    gsap.set(inItems, { autoAlpha: 0 });
    gsap.set(forms, { height: startHeight });

    const tl = gsap.timeline({
      onComplete: () => finish(next, () => {
        gsap.set([outPane, inPane, ...inItems], { clearProps: "all" });
        gsap.set(forms, { clearProps: "height" });
        gsap.set(sweep, { clearProps: "opacity,transform" });
      }),
    });

    tl.to(outPane, { rotationY: dir * 22, xPercent: dir * 18, autoAlpha: 0, filter: "blur(6px)", duration: 0.55, ease: "power2.in" }, 0)
      .to(forms, { height: endHeight, duration: 0.85, ease: "power3.inOut" }, 0.1)
      .fromTo(sweep, { xPercent: toRegister ? 190 : -110 }, { xPercent: toRegister ? -110 : 190, duration: 1, ease: "power2.inOut" }, 0.05)
      .to(sweep, { keyframes: { opacity: [0, 1, 0] }, duration: 1, ease: "none" }, 0.05)
      .fromTo(inPane, { rotationY: -dir * 22, xPercent: -dir * 18, filter: "blur(6px)" },
        { rotationY: 0, xPercent: 0, filter: "blur(0px)", duration: 0.85, ease: "power3.out" }, 0.38)
      .fromTo(inItems, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.65, stagger: 0.05, ease: "power3.out" }, 0.48);
  };

  /* ---------- Public switch ---------- */
  function switchTo(next, { push = true } = {}) {
    if (next === mode || busy || !panes[next]) return;
    if (push && urls[next] && location.pathname !== urls[next]) history.pushState({ auth: next }, "", urls[next]);
    if (!animate) {
      applyState(next);
      return;
    }
    busy = true;
    auth.dataset.target = next; // tab pill starts moving right away
    (desktop.matches ? desktopSwitch : mobileSwitch)(mode, next);
  }

  auth.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-auth-switch]");
    if (!trigger) return;
    e.preventDefault(); // also tells the page-transition handler to stay out
    switchTo(trigger.dataset.authSwitch);
  });

  window.addEventListener("popstate", () => {
    const m = modeFromPath();
    if (m) switchTo(m, { push: false });
  });

  desktop.addEventListener("change", () => {
    if (!gsap) return;
    gsap.set([forms, panes.login, panes.register], { clearProps: "all" });
    placeLight(mode);
  });

  /* ---------- Intro: black → gold light → panel ---------- */
  const playIntro = () => {
    const full = auth.dataset.intro === "full" && intro;
    const line = intro && intro.querySelector(".auth-intro-line");
    const items = itemsOf(panes[mode]);
    const copyItems = desktop.matches ? itemsOf(copies[mode]) : [];
    const content = [...copyItems, ...items];

    gsap.set(content, { autoAlpha: 0, y: 26, filter: "blur(8px)" });
    const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

    if (full) {
      // Put the line exactly where the panel's centre will be, at the panel's width.
      const rect = shell.getBoundingClientRect();
      gsap.set(line, { width: rect.width, y: rect.top + rect.height / 2 - window.innerHeight / 2 });

      tl.fromTo(line, { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 1.05, ease: "expo.inOut" }, 0.2)
        .set(shell, { opacity: 1 })
        .fromTo(shell,
          { clipPath: "inset(49.7% 0% 49.7% 0% round 32px)", rotationX: 28, scale: 0.95 },
          { clipPath: "inset(0% 0% 0% 0% round 32px)", rotationX: 0, scale: 1, duration: 1.5, ease: "expo.inOut" }, ">-0.1")
        .to(line, { opacity: 0, duration: 0.7, ease: "power2.out" }, "<0.15")
        .to(intro, { autoAlpha: 0, duration: 1.1, ease: "power2.inOut" }, "<")
        .fromTo(glow, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 2.4, ease: "power2.out" }, "<");
    } else {
      if (intro) gsap.set(intro, { autoAlpha: 0 });
      tl.fromTo(shell, { opacity: 0, y: 40, rotationX: 10 }, { opacity: 1, y: 0, rotationX: 0, duration: 1.2 });
    }

    tl.to(content, { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 1.05, stagger: 0.06 }, full ? "-=0.85" : "-=0.8")
      .add(() => {
        gsap.set(content, { clearProps: "all" });
        gsap.set(shell, { clearProps: "clipPath,transform" });
        if (intro) intro.style.display = "none";
      });
  };

  /* ---------- Init ---------- */
  history.replaceState({ auth: mode }, "", location.href);
  applyState(mode);
  placeLight(mode);

  if (animate) playIntro();
})();
