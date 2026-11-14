"use client";

import { useEffect, useRef } from "react";

/**
 * The home page's 3D background: a sheet of ivory silk with soft folds and a
 * satin sheen, with fine gold dust floating in front at different depths.
 * Scrolling glides the camera along the silk (the light turns warmer further
 * down) and carries the dust past, near grains faster than far ones.
 *
 * Plain WebGL, no library. Colours come from the theme tokens. It starts after
 * the page has loaded, draws at reduced resolution (the silk is soft anyway),
 * uses fewer grains and 30 fps on phones, and stops while the tab or page is
 * hidden. With "reduce motion" it draws one still frame that doesn't follow
 * the scroll; without WebGL the
 * canvas keeps the plain surface colour. Content sits above it (z-index -1).
 */

const SILK_VS = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const SILK_FS = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime, uScroll, uIntro;
uniform vec3 cSurface, cShade, cChampagne, cGold;

float silk(vec2 p, float t) {
  vec2 q = p;
  q.x += 0.35 * sin(q.y * 1.3 + t * 1.7);
  q.y += 0.25 * sin(q.x * 0.9 - t * 1.3);
  return sin(q.x * 1.6 + q.y * 0.6 + t) * 0.55
       + sin(q.x * 0.7 - q.y * 1.1 - t * 0.8) * 0.35
       + sin(q.x * 2.9 + q.y * 1.9 + t * 1.3) * 0.12;
}

void main() {
  float s = uScroll;
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y * 2.4;
  // The camera glides down the sheet as the page scrolls, turning a little.
  float a = 0.35 + 0.25 * s;
  p = mat2(cos(a), -sin(a), sin(a), cos(a)) * p;
  p.y -= s * 6.0;
  float t = uTime * 0.06;

  float e = 0.01;
  float h = silk(p, t);
  float dx = silk(p + vec2(e, 0.0), t) - h;
  float dy = silk(p + vec2(0.0, e), t) - h;
  vec3 n = normalize(vec3(-dx / e * 0.55, -dy / e * 0.55, 1.0));

  vec3 L = normalize(vec3(-0.45 + 0.4 * s, 0.6, 0.75));
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  float diff = clamp(dot(n, L), 0.0, 1.0);
  float satin = pow(max(dot(n, H), 0.0), 18.0);
  float glint = pow(max(dot(n, H), 0.0), 140.0);

  // Light ivory at the top of the page, warmer champagne further down.
  vec3 light = mix(cSurface, mix(cSurface, cChampagne, 0.35), smoothstep(0.15, 0.9, s));
  vec3 shade = mix(cSurface, cShade, 0.68 + 0.15 * s);
  vec3 col = mix(shade, light, smoothstep(0.15, 0.95, diff));
  col += cChampagne * satin * 0.2;
  col = mix(col, cGold, glint * (0.18 + 0.2 * s));

  // A little grain against colour banding.
  float g = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  col += (g - 0.5) / 255.0;

  gl_FragColor = vec4(mix(cSurface, col, uIntro), 1.0);
}`;

const DUST_VS = `
attribute vec4 seed; // x, y, depth, size
uniform vec2 uRes;
uniform float uTime, uScroll, uScale;
varying float vAlpha, vSpark;
void main() {
  // Depth runs from far (0) to near (1); scrolling carries the grains towards the viewer.
  float z = fract(seed.z + uScroll * 1.6 + uTime * 0.004);
  float depth = mix(3.2, 0.35, z);
  vec2 xy = seed.xy * vec2(1.7, 1.05) + 0.04 * vec2(sin(uTime * 0.3 + seed.w * 9.0), cos(uTime * 0.25 + seed.z * 7.0));
  vec2 screen = xy / depth;
  gl_Position = vec4(screen.x * uRes.y / uRes.x, screen.y, 0.0, 1.0);
  gl_PointSize = (1.0 + seed.w * 2.6) / depth * 2.2 * uScale;
  vAlpha = smoothstep(0.0, 0.25, z) * (1.0 - smoothstep(0.82, 1.0, z));
  vSpark = 0.6 + 0.4 * sin(uTime * 2.0 + seed.w * 40.0);
}`;

const DUST_FS = `
precision mediump float;
uniform vec3 cGold, cShade, cChampagne;
uniform float uIntro;
varying float vAlpha, vSpark;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = pow(smoothstep(0.5, 0.0, d), 1.4) * vAlpha * vSpark * 0.6 * uIntro;
  // Warm gold, catching the light (champagne) as each grain twinkles; never a dark speck.
  vec3 gold = mix(cShade, cGold, 0.3);
  gl_FragColor = vec4(mix(gold, cChampagne * 1.04, (vSpark - 0.6) * 1.6), a);
}`;

function compile(gl: WebGLRenderingContext, vs: string, fs: string) {
  const make = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, make(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, make(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? "link");
  return prog;
}

/** A theme token (e.g. --color-surface) as 0–1 RGB. */
function token(name: string): [number, number, number] {
  const probe = document.createElement("span");
  probe.style.color = `var(${name})`;
  document.body.appendChild(probe);
  const m = getComputedStyle(probe).color.match(/[\d.]+/g)?.map(Number) ?? [251, 249, 246];
  probe.remove();
  return [m[0] / 255, m[1] / 255, m[2] / 255];
}

export default function SilkBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    // Let the page show the backdrop while it is on screen (removed again when the page is hidden or left).
    const main = canvas.closest("main");
    main?.classList.add("has-backdrop");
    const unmark = () => main?.classList.remove("has-backdrop");
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) return unmark; // no WebGL: the page keeps its plain surface colour

    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const phone = matchMedia("(max-width: 767px)").matches || navigator.maxTouchPoints > 0;
    const scale = (phone ? 0.5 : 0.7) * Math.min(window.devicePixelRatio || 1, 2);

    let silk: WebGLProgram, dust: WebGLProgram;
    try {
      silk = compile(gl, SILK_VS, SILK_FS);
      dust = compile(gl, DUST_VS, DUST_FS);
    } catch {
      return unmark;
    }

    // Full-screen triangle for the silk.
    const tri = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tri);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    // Gold dust: x, y, depth, size per grain.
    const count = phone ? 180 : 460;
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      seeds[i * 4] = Math.random() * 2 - 1;
      seeds[i * 4 + 1] = Math.random() * 2 - 1;
      seeds[i * 4 + 2] = Math.random();
      seeds[i * 4 + 3] = Math.random() ** 3; // mostly fine grains, a few larger flecks
    }
    const grains = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, grains);
    gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);

    const colours = {
      cSurface: token("--color-surface"),
      cShade: token("--color-secondary-fixed-dim"),
      cChampagne: token("--color-secondary-fixed"),
      cGold: token("--color-secondary"),
    };
    const u = (prog: WebGLProgram, name: string) => gl.getUniformLocation(prog, name);
    for (const prog of [silk, dust]) {
      gl.useProgram(prog);
      for (const [name, c] of Object.entries(colours)) gl.uniform3fv(u(prog, name), c);
    }

    const resize = () => {
      const w = Math.max(1, Math.round(canvas.clientWidth * scale));
      const h = Math.max(1, Math.round(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
    };

    const progress = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      return max > 0 ? Math.min(1, window.scrollY / max) : 0;
    };

    let scroll = progress();
    let intro = still ? 1 : 0;
    const t0 = performance.now();

    const draw = (now: number) => {
      resize();
      const time = still ? 20 : (now - t0) / 1000;
      // Ease the camera towards the scroll position, so it glides rather than jumps.
      scroll += (progress() - scroll) * (still ? 1 : 0.07);
      if (intro < 1) intro = Math.min(1, intro + 0.025);

      gl.disable(gl.BLEND);
      gl.useProgram(silk);
      gl.bindBuffer(gl.ARRAY_BUFFER, tri);
      const sp = gl.getAttribLocation(silk, "p");
      gl.enableVertexAttribArray(sp);
      gl.vertexAttribPointer(sp, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(u(silk, "uRes"), canvas.width, canvas.height);
      gl.uniform1f(u(silk, "uTime"), time);
      gl.uniform1f(u(silk, "uScroll"), scroll);
      gl.uniform1f(u(silk, "uIntro"), intro);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disableVertexAttribArray(sp);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(dust);
      gl.bindBuffer(gl.ARRAY_BUFFER, grains);
      const ds = gl.getAttribLocation(dust, "seed");
      gl.enableVertexAttribArray(ds);
      gl.vertexAttribPointer(ds, 4, gl.FLOAT, false, 0, 0);
      gl.uniform2f(u(dust, "uRes"), canvas.width, canvas.height);
      gl.uniform1f(u(dust, "uTime"), time);
      gl.uniform1f(u(dust, "uScroll"), scroll);
      gl.uniform1f(u(dust, "uScale"), scale);
      gl.uniform1f(u(dust, "uIntro"), intro);
      gl.drawArrays(gl.POINTS, 0, count);
      gl.disableVertexAttribArray(ds);
    };

    let frame = 0;
    let last = 0;
    let running = false;
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      if (phone && now - last < 32) return; // about 30 fps on phones, for battery
      last = now;
      draw(now);
    };
    const start = () => {
      if (running || document.hidden) return;
      running = true;
      frame = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(frame);
    };
    const redrawStill = () => requestAnimationFrame(draw);
    const onVisibility = () => (document.hidden ? stop() : start());
    const onLost = (e: Event) => {
      e.preventDefault();
      stop();
    };

    // Start once the page itself has loaded, so the backdrop never slows the first view.
    let begin = 0;
    const go = () => {
      begin = window.setTimeout(() => {
        if (still) {
          redrawStill();
          window.addEventListener("resize", redrawStill);
        } else {
          start();
          document.addEventListener("visibilitychange", onVisibility);
        }
      }, 120);
    };
    if (document.readyState === "complete") go();
    else window.addEventListener("load", go, { once: true });
    canvas.addEventListener("webglcontextlost", onLost);

    return () => {
      unmark();
      clearTimeout(begin);
      stop();
      window.removeEventListener("load", go);
      window.removeEventListener("resize", redrawStill);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onLost);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="fixed inset-0 -z-10 w-full h-dvh pointer-events-none bg-surface"
      id="home-backdrop"
    />
  );
}
