/**
 * openreel-effects.js
 * Advanced effects layer for the OpenReel Design System.
 *
 * Provides GSAP scroll animations, Canvas 2D particle fields,
 * WebGL animated gradients, and scroll parallax.
 *
 * All effects activate via data-or-* HTML attributes and
 * lazy-load their dependencies from CDN where required.
 *
 * Usage: add this script to any page that needs advanced effects.
 * No build step required.
 */

(() => {
  "use strict";

  /* ─────────────────────────────────────────────
   * 1. SETUP
   * ───────────────────────────────────────────── */

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const CDNS = {
    gsap: "https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js",
    scrollTrigger:
      "https://cdn.jsdelivr.net/npm/gsap@3/dist/ScrollTrigger.min.js",
    three:
      "https://cdn.jsdelivr.net/npm/three@0.170/build/three.module.min.js",
  };

  const loaded = {};

  function loadScript(url) {
    if (loaded[url]) return loaded[url];
    loaded[url] = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = url;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return loaded[url];
  }

  /* ─────────────────────────────────────────────
   * 2. GSAP SCROLL ANIMATIONS
   * ───────────────────────────────────────────── */

  async function initScrollAnimations() {
    const els = Array.from(document.querySelectorAll("[data-or-animate]"));
    if (!els.length) return;

    // Lazy-load GSAP and ScrollTrigger
    await loadScript(CDNS.gsap);
    await loadScript(CDNS.scrollTrigger);

    const gsap = window.gsap;
    if (!gsap) return;

    const ScrollTrigger = window.ScrollTrigger;
    if (ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
    }

    const duration = reducedMotion ? 0.01 : 0.7;

    els.forEach((el) => {
      const type = el.dataset.orAnimate || "fade-up";
      const delay = parseFloat(el.dataset.orDelay || "0");

      const triggerConfig = ScrollTrigger
        ? {
            scrollTrigger: {
              trigger: el,
              start: "top 85%",
              once: true,
            },
          }
        : {};

      // Build "from" vars based on animation type
      let fromVars = { opacity: 0, delay, duration, ...triggerConfig };

      switch (type) {
        case "fade-up":
          fromVars.y = 24;
          break;
        case "fade-down":
          fromVars.y = -24;
          break;
        case "fade-left":
          fromVars.x = -24;
          break;
        case "fade-right":
          fromVars.x = 24;
          break;
        case "fade-in":
          // opacity only — nothing extra
          break;
        case "scale-up":
          fromVars.scale = 0.9;
          break;

        case "stagger": {
          const children = Array.from(el.children);
          if (children.length) {
            gsap.from(children, {
              opacity: 0,
              y: 24,
              duration,
              delay,
              stagger: reducedMotion ? 0 : 0.08,
              ...triggerConfig,
            });
          }
          return; // handled, skip default fromTo below
        }

        case "split-chars": {
          const text = el.textContent || "";
          el.innerHTML = text
            .split("")
            .map((ch) =>
              ch === " "
                ? `<span style="display:inline-block">&nbsp;</span>`
                : `<span style="display:inline-block">${ch}</span>`
            )
            .join("");
          const charSpans = Array.from(el.querySelectorAll("span"));
          gsap.from(charSpans, {
            opacity: 0,
            y: 16,
            duration,
            delay,
            stagger: reducedMotion ? 0 : 0.03,
            ...triggerConfig,
          });
          return; // handled
        }

        default:
          fromVars.y = 24; // fall back to fade-up
          break;
      }

      gsap.from(el, fromVars);
    });
  }

  /* ─────────────────────────────────────────────
   * 3. CANVAS 2D PARTICLE FIELD
   * ───────────────────────────────────────────── */

  function initParticles() {
    const containers = Array.from(
      document.querySelectorAll("[data-or-particles]")
    );
    if (!containers.length) return;

    containers.forEach((container) => {
      // Config from attributes
      const count = parseInt(container.dataset.orParticleCount || "60", 10);
      const color = container.dataset.orParticleColor || "#1F12DE";
      const size = parseFloat(container.dataset.orParticleSize || "2");
      const speed = parseFloat(container.dataset.orParticleSpeed || "0.5");
      const opacity = parseFloat(container.dataset.orParticleOpacity || "0.4");
      const lines =
        (container.dataset.orParticleLines || "false").toLowerCase() === "true";

      // Container must be relative so the canvas sits behind content
      const existingPosition = getComputedStyle(container).position;
      if (existingPosition === "static") {
        container.style.position = "relative";
      }

      // Create canvas
      const canvas = document.createElement("canvas");
      Object.assign(canvas.style, {
        position: "absolute",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: "0",
      });
      container.insertBefore(canvas, container.firstChild);

      const ctx = canvas.getContext("2d");

      // Size canvas to container
      function resize() {
        canvas.width = container.offsetWidth;
        canvas.height = container.offsetHeight;
      }
      resize();

      const resizeObs = new ResizeObserver(resize);
      resizeObs.observe(container);

      // Parse hex color to rgb components
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      const rgba = `rgba(${r},${g},${b},${opacity})`;
      const rgbaLine = `rgba(${r},${g},${b},`;

      // Build particles
      const particles = Array.from({ length: count }, () => ({
        x: Math.random() * (canvas.width || 400),
        y: Math.random() * (canvas.height || 300),
        vx: (Math.random() - 0.5) * speed * 2,
        vy: (Math.random() - 0.5) * speed * 2,
        r: size * (0.5 + Math.random() * 0.5),
      }));

      // Mouse tracking for subtle interaction
      let mouseX = -9999;
      let mouseY = -9999;

      function onMouseMove(e) {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
      }
      container.addEventListener("mousemove", onMouseMove, { passive: true });
      container.addEventListener(
        "mouseleave",
        () => {
          mouseX = -9999;
          mouseY = -9999;
        },
        { passive: true }
      );

      let animId = null;
      let visible = true;

      function draw() {
        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);

        if (reducedMotion) {
          // Static: just draw dots, no movement
          particles.forEach((p) => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = rgba;
            ctx.fill();
          });
          return;
        }

        // Move + wrap
        particles.forEach((p) => {
          // Subtle mouse repulsion
          const dx = p.x - mouseX;
          const dy = p.y - mouseY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 80 && dist > 0) {
            const force = (80 - dist) / 80;
            p.vx += (dx / dist) * force * 0.3;
            p.vy += (dy / dist) * force * 0.3;
          }

          // Dampen velocity so it doesn't explode
          p.vx *= 0.99;
          p.vy *= 0.99;

          // Clamp velocity
          const maxV = speed * 2;
          const mag = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          if (mag > maxV) {
            p.vx = (p.vx / mag) * maxV;
            p.vy = (p.vy / mag) * maxV;
          }

          p.x += p.vx;
          p.y += p.vy;

          // Wrap around edges
          if (p.x < -p.r) p.x = w + p.r;
          else if (p.x > w + p.r) p.x = -p.r;
          if (p.y < -p.r) p.y = h + p.r;
          else if (p.y > h + p.r) p.y = -p.r;
        });

        // Draw connection lines when enabled
        if (lines) {
          const threshold = 100;
          const thresholdSq = threshold * threshold;
          for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
              const dx = particles[i].x - particles[j].x;
              const dy = particles[i].y - particles[j].y;
              const distSq = dx * dx + dy * dy;
              if (distSq < thresholdSq) {
                const alpha = opacity * (1 - Math.sqrt(distSq) / threshold);
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.strokeStyle = rgbaLine + alpha + ")";
                ctx.lineWidth = 0.8;
                ctx.stroke();
              }
            }
          }
        }

        // Draw dots
        particles.forEach((p) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = rgba;
          ctx.fill();
        });
      }

      function loop() {
        if (visible) {
          draw();
        }
        animId = requestAnimationFrame(loop);
      }

      // If reducedMotion, draw once statically
      if (reducedMotion) {
        // Wait for canvas to have dimensions, then draw once
        requestAnimationFrame(() => {
          // Re-initialize x/y now that we have real dimensions
          particles.forEach((p) => {
            p.x = Math.random() * canvas.width;
            p.y = Math.random() * canvas.height;
          });
          draw();
        });
        return;
      }

      // Pause when off-screen
      const ioOpts = { threshold: 0 };
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          visible = e.isIntersecting;
        });
      }, ioOpts);
      io.observe(container);

      // Start animation
      requestAnimationFrame(() => {
        particles.forEach((p) => {
          p.x = Math.random() * canvas.width;
          p.y = Math.random() * canvas.height;
        });
        loop();
      });
    });
  }

  /* ─────────────────────────────────────────────
   * 4. WEBGL ANIMATED GRADIENT
   * ───────────────────────────────────────────── */

  function hexToVec3(hex) {
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    return [r, g, b];
  }

  function initGradient() {
    const containers = Array.from(
      document.querySelectorAll("[data-or-gradient]")
    );
    if (!containers.length) return;

    const VS = `
      attribute vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const FS = `
      precision mediump float;

      uniform float u_time;
      uniform vec2  u_resolution;
      uniform vec3  u_color0;
      uniform vec3  u_color1;
      uniform vec3  u_color2;

      float noise(vec2 p) {
        return sin(p.x * 1.3 + u_time * 0.4)
             * sin(p.y * 1.7 + u_time * 0.3)
             * 0.5 + 0.5;
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;

        float n0 = noise(uv * 2.0);
        float n1 = noise(uv * 1.5 + vec2(3.7, 1.2));

        vec3 col = mix(u_color0, u_color1, n0);
        col = mix(col, u_color2, n1 * 0.5);

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    function compileShader(gl, type, src) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn("Shader compile error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    containers.forEach((container) => {
      const colorsAttr =
        container.dataset.orGradientColors || "#1F12DE,#2970FF,#17B26A";
      const speed = parseFloat(container.dataset.orGradientSpeed || "1");

      const hexColors = colorsAttr
        .split(",")
        .map((c) => c.trim())
        .slice(0, 3);
      // Pad to 3 if fewer provided
      while (hexColors.length < 3) hexColors.push(hexColors[hexColors.length - 1]);

      const existingPosition = getComputedStyle(container).position;
      if (existingPosition === "static") {
        container.style.position = "relative";
      }

      // Create canvas
      const canvas = document.createElement("canvas");
      Object.assign(canvas.style, {
        position: "absolute",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: "0",
      });
      container.insertBefore(canvas, container.firstChild);

      // Try WebGL
      let gl = null;
      try {
        gl =
          canvas.getContext("webgl") ||
          canvas.getContext("experimental-webgl");
      } catch (_) {
        gl = null;
      }

      // Fallback: CSS gradient
      if (!gl) {
        const cssColors = hexColors.join(", ");
        container.style.background = `linear-gradient(135deg, ${cssColors})`;
        canvas.remove();
        return;
      }

      // Compile shaders
      const vs = compileShader(gl, gl.VERTEX_SHADER, VS);
      const fs = compileShader(gl, gl.FRAGMENT_SHADER, FS);
      if (!vs || !fs) {
        // Fallback
        const cssColors = hexColors.join(", ");
        container.style.background = `linear-gradient(135deg, ${cssColors})`;
        canvas.remove();
        return;
      }

      const program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.warn("Program link error:", gl.getProgramInfoLog(program));
        const cssColors = hexColors.join(", ");
        container.style.background = `linear-gradient(135deg, ${cssColors})`;
        canvas.remove();
        return;
      }
      gl.useProgram(program);

      // Fullscreen quad
      const verts = new Float32Array([
        -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1,
      ]);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

      const aPos = gl.getAttribLocation(program, "a_position");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      // Uniforms
      const uTime = gl.getUniformLocation(program, "u_time");
      const uRes = gl.getUniformLocation(program, "u_resolution");
      const uC0 = gl.getUniformLocation(program, "u_color0");
      const uC1 = gl.getUniformLocation(program, "u_color1");
      const uC2 = gl.getUniformLocation(program, "u_color2");

      const [c0, c1, c2] = hexColors.map(hexToVec3);
      gl.uniform3fv(uC0, c0);
      gl.uniform3fv(uC1, c1);
      gl.uniform3fv(uC2, c2);

      // Resize
      function resize() {
        canvas.width = container.offsetWidth;
        canvas.height = container.offsetHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(uRes, canvas.width, canvas.height);
      }
      resize();

      const resizeObs = new ResizeObserver(resize);
      resizeObs.observe(container);

      let start = null;
      let animId = null;
      let visible = true;

      // Static gradient for reducedMotion
      if (reducedMotion) {
        gl.uniform1f(uTime, 0.0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        return;
      }

      function render(ts) {
        if (!start) start = ts;
        const elapsed = ((ts - start) / 1000) * speed;
        if (visible) {
          gl.uniform1f(uTime, elapsed);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
        animId = requestAnimationFrame(render);
      }

      // Pause when off-screen
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          visible = e.isIntersecting;
        });
      }, { threshold: 0 });
      io.observe(container);

      animId = requestAnimationFrame(render);
    });
  }

  /* ─────────────────────────────────────────────
   * 5. PARALLAX
   * ───────────────────────────────────────────── */

  function initParallax() {
    if (reducedMotion) return;

    const els = Array.from(document.querySelectorAll("[data-or-parallax]"));
    if (!els.length) return;

    const factors = els.map((el) =>
      parseFloat(el.dataset.orParallax || "0.3")
    );

    let ticking = false;

    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(() => {
          const vh = window.innerHeight;
          els.forEach((el, i) => {
            const rect = el.getBoundingClientRect();
            const elCenter = rect.top + rect.height / 2;
            const viewportCenter = vh / 2;
            const offset = (elCenter - viewportCenter) * factors[i];
            el.style.transform = `translate3d(0, ${offset}px, 0)`;
          });
          ticking = false;
        });
        ticking = true;
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    // Run once on init
    onScroll();
  }

  /* ─────────────────────────────────────────────
   * 6. INIT
   * ───────────────────────────────────────────── */

  function init() {
    initScrollAnimations();
    initParticles();
    initGradient();
    initParallax();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
