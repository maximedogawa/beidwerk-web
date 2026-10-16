/* Beidwerk · small, dependency-free behaviour: the theme toggle (dark stage / light receipt, remembered per
   zone), the hero's crossfade, the split-flap title, the album player with its music video stage, reveal on scroll. Everything works without JavaScript; with reduced motion nothing moves. */
(function () {
  "use strict";
  var root = document.documentElement;
  var still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* theme: the inline script in <head> already set data-theme before paint */
  function setTheme(t, remember) {
    root.setAttribute("data-theme", t);
    // remembered per zone: the work pages (light by default) and the band's stage (dark by default) separately
    var zone = (document.body.className.match(/zone-(\w+)/) || [])[1] || "work";
    if (remember) try { localStorage.setItem("bw-theme-" + zone, t); } catch (e) {}  // only a visitor's own choice is kept
  }
  document.querySelectorAll("[data-theme-toggle]").forEach(function (b) {
    b.addEventListener("click", function () {
      setTheme(root.getAttribute("data-theme") === "light" ? "dark" : "light", true);
    });
  });
  setTheme(root.getAttribute("data-theme") || "light", false);

  /* the menu on small screens: open and closed, said to screen readers too */
  document.querySelectorAll(".menu-btn").forEach(function (b) {
    b.setAttribute("aria-expanded", "false");
    b.addEventListener("click", function () {
      var h = b.closest(".site-h"), open = h.classList.toggle("open");
      b.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });

  /* header: solid once the page scrolls */
  var head = document.querySelector(".site-h");
  function onScroll() { if (head) head.classList.toggle("solid", window.scrollY > 40); }
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

  /* hero: the pictures crossfade with a slow push-in, the label follows */
  var slides = document.querySelectorAll(".hero .slide");
  if (slides.length > 1 && !still) {
    var i = 0;
    var held = false, hero = document.querySelector(".hero");
    ["mouseenter", "focusin"].forEach(function (ev) { hero.addEventListener(ev, function () { held = true; }); });
    ["mouseleave", "focusout"].forEach(function (ev) { hero.addEventListener(ev, function () { held = false; }); });
    setInterval(function () {
      if (document.hidden || held) return;
      slides[i].classList.remove("on");
      i = (i + 1) % slides.length;
      slides[i].classList.add("on");
      var lab = document.querySelector(".hero [data-slide-label]"), id = document.querySelector(".hero [data-slide-id]");
      if (lab) lab.textContent = slides[i].getAttribute("data-label") || "";
      if (id) id.textContent = slides[i].getAttribute("data-id") || "";
      document.querySelectorAll(".hero-dashes i").forEach(function (d, k) { d.classList.toggle("on", k === i); });
    }, 6500);
  }

  /* split-flap title: letters flick through the alphabet and settle, one after the other */
  var ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ0123456789";
  document.querySelectorAll(".flaps[data-word]").forEach(function (box) {
    var word = box.getAttribute("data-word");
    var flaps = box.querySelectorAll(".flap");
    if (still) return;
    flaps.forEach(function (f, k) {
      var target = word[k] || " ";
      if (target === " ") return;
      var n = 6 + k * 3;
      var t = setInterval(function () {
        f.textContent = n-- > 0 ? ABC[Math.floor(Math.random() * ABC.length)] : target;
        f.classList.remove("tick"); void f.offsetWidth; f.classList.add("tick");
        if (n < 0) clearInterval(t);
      }, 55);
    });
  });

  /* album: one audio element, rows play and pause, a thin progress line */
  var tracks = document.querySelectorAll(".track[data-src], .film[data-src]");  // album rows and the film rows (band page)
  if (tracks.length) {
    var audio = new Audio(); audio.preload = "none";
    var current = null;
    function mark(row, playing) {
      tracks.forEach(function (r) { r.classList.remove("playing", "paused"); });
      if (row) row.classList.add(playing ? "playing" : "paused");
    }
    var de = document.documentElement.lang === "de", stage = null, video = null;
    /* a song with a music video plays on the stage: the video large, with the song in it. "Audio only" goes on with
       the song from the same second; closing (×, Escape, a click beside the video) stops it; the end goes on to the
       next song */
    function buildStage() {
      stage = document.createElement("div"); stage.className = "stage"; stage.hidden = true;
      stage.setAttribute("role", "dialog"); stage.setAttribute("aria-modal", "true"); stage.setAttribute("aria-labelledby", "stage-title");
      stage.innerHTML = '<div class="stage-in"><div class="stage-frame"><video playsinline preload="auto"></video><i class="stage-p"></i></div>' +
        '<div class="stage-meta"><p class="lab stage-n"></p><h2 class="cond stage-t" id="stage-title"></h2><p class="stage-en"></p>' +
        '<div class="stage-btns"><button type="button" class="tool stage-pp"></button>' +
        '<button type="button" class="tool stage-audio">' + (de ? "Nur Ton" : "Audio only") + '</button>' +
        '<button type="button" class="tool stage-x" aria-label="' + (de ? "Schließen" : "Close") + '">×</button></div></div></div>';
      document.body.appendChild(stage);
      video = stage.querySelector("video");
      var pp = stage.querySelector(".stage-pp");
      function ppLabel() { pp.textContent = video.paused ? (de ? "Abspielen" : "Play") : "Pause"; }
      video.addEventListener("play", function () { ppLabel(); mark(current, true); });
      video.addEventListener("pause", function () { ppLabel(); if (!stage.hidden) mark(current, false); });
      video.addEventListener("timeupdate", function () {
        if (!video.duration) return;
        var p = (video.currentTime / video.duration * 100).toFixed(2) + "%";
        stage.querySelector(".stage-p").style.width = p;
        if (current) current.style.setProperty("--p", p);
      });
      video.addEventListener("ended", function () { closeStage(false); next(); });
      // the video cannot be played (missing on the server, not supported): the song goes on as sound
      video.addEventListener("error", function () { if (video.getAttribute("src") && !stage.hidden) closeStage(true); });
      pp.addEventListener("click", function () { video.paused ? video.play() : video.pause(); });
      stage.querySelector(".stage-audio").addEventListener("click", function () { closeStage(true); });
      stage.querySelector(".stage-x").addEventListener("click", function () { closeStage(false); });
      stage.addEventListener("click", function (ev) { if (ev.target === stage) closeStage(false); });
      document.addEventListener("keydown", function (ev) {
        if (stage.hidden) return;
        if (ev.key === "Escape") closeStage(false);
        if (ev.key === "Tab") {  // the focus stays inside the stage while it is open
          var f = stage.querySelectorAll("button"), first = f[0], last = f[f.length - 1];
          if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
          else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
        }
        if (ev.key === " " && ev.target.tagName !== "BUTTON") { ev.preventDefault(); pp.click(); }
      });
    }
    var hideTimer = null, opener = null;
    function openStage(row) {
      if (!stage) buildStage();
      clearTimeout(hideTimer);  // a stage closing just now (the end of the last video) stays open for the next
      opener = document.activeElement;
      audio.pause();
      var t = row.querySelector(".t"), at = current === row ? audio.currentTime : 0;
      stage.querySelector(".stage-n").textContent = row.querySelector(".n").textContent + " · " + (de ? "Musikvideo" : "Music video");
      stage.querySelector(".stage-t").textContent = t.childNodes[0].textContent.trim();
      stage.querySelector(".stage-en").textContent = row.getAttribute("data-en") || "";
      if (video.getAttribute("src") !== row.getAttribute("data-video")) video.src = row.getAttribute("data-video");
      current = row;
      video.currentTime = at;
      stage.hidden = false; document.documentElement.classList.add("stage-open");
      requestAnimationFrame(function () { stage.classList.add("on"); });
      video.play().catch(function () {});
      stage.querySelector(".stage-pp").textContent = "Pause";
      stage.querySelector(".stage-x").focus({ preventScroll: true });
    }
    function closeStage(keepSong) {
      var at = video.currentTime, playing = !video.paused;
      video.pause(); stage.classList.remove("on");
      video.removeAttribute("src"); video.load();  // a closed video downloads nothing more
      hideTimer = setTimeout(function () { stage.hidden = true; }, 350);
      document.documentElement.classList.remove("stage-open");
      if (opener && opener.focus) opener.focus({ preventScroll: true });  // back where the visitor was
      if (keepSong && current) {  // the song goes on as sound, from the same second
        audio.src = current.getAttribute("data-src");
        audio.addEventListener("loadedmetadata", function seek() { audio.removeEventListener("loadedmetadata", seek); audio.currentTime = at; }, { once: true });
        if (playing) { audio.play(); mark(current, true); } else mark(current, false);
      }
    }
    function next() {
      var list = Array.prototype.slice.call(tracks), n = list[list.indexOf(current) + 1];
      if (current) current.style.setProperty("--p", "0%");
      if (n) n.querySelector("button").click(); else mark(null);
    }
    tracks.forEach(function (row) {
      row.querySelector("button").addEventListener("click", function () {
        if (row.hasAttribute("data-video") && !(current === row && !audio.paused)) { openStage(row); return; }
        if (current === row && !audio.paused) { audio.pause(); mark(row, false); return; }
        if (current !== row) { audio.src = row.getAttribute("data-src"); current = row; }
        audio.play(); mark(row, true);
      });
    });
    audio.addEventListener("timeupdate", function () {
      if (!current || !audio.duration) return;
      current.style.setProperty("--p", (audio.currentTime / audio.duration * 100).toFixed(2) + "%");
    });
    audio.addEventListener("ended", next);
  }

  /* preview videos (data-inview) play only while on screen; not with reduced motion or data saving */
  var save = navigator.connection && navigator.connection.saveData;
  document.querySelectorAll("video[data-inview]").forEach(function (v) {
    if (still || save || !("IntersectionObserver" in window)) return;  // the poster stays
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { v.play().catch(function () {}); } else { v.pause(); } });
    }, { rootMargin: "0px 0px -10% 0px" }).observe(v);
  });

  /* reveal sections as they come in */
  if ("IntersectionObserver" in window && !still) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); });
  }
})();
/* copy buttons (lyrics, prompts) */
/* navigator.clipboard only exists on https and localhost; over plain http (and in some iOS Safari cases)
   copy through a selected textarea instead, inside the same tap */
function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
  return new Promise(function (ok, fail) {
    var ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px";
    document.body.appendChild(ta);
    ta.focus(); ta.select(); ta.setSelectionRange(0, text.length);  // iOS needs the range
    var done = false;
    try { done = document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
    done ? ok() : fail();
  });
}
document.querySelectorAll("[data-copy]").forEach(function (b) {
  b.addEventListener("click", function () {
    var pre = b.parentNode.querySelector("pre"), t = b.textContent;
    if (!pre) return;
    copyText(pre.textContent).then(function () {
      b.textContent = "✓"; setTimeout(function () { b.textContent = t; }, 1200);
    }, function () {  // last resort: select the prompt so a long press can copy it
      pre.hidden = false;
      var r = document.createRange(); r.selectNodeContents(pre);
      var sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
    });
  });
});
