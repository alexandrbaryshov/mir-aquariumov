import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const VERT = `
attribute vec2 p;
varying vec2 uv;
void main() {
  uv = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5);
  gl_Position = vec4(p, 0.0, 1.0);
}`

// Green-screen key: alpha from "greenness" (g - max(r, b)), then despill so
// semi-transparent fin edges don't keep a green fringe. Output is premultiplied.
const FRAG = `
precision mediump float;
uniform sampler2D tex;
varying vec2 uv;
void main() {
  vec4 c = texture2D(tex, uv);
  float m = max(c.r, c.b);
  float k = c.g - m;
  float a = 1.0 - smoothstep(0.07, 0.30, k);
  c.g = min(c.g, m + 0.03);
  gl_FragColor = vec4(c.rgb * a, a);
}`

/**
 * Calls render(video) on every animation frame in which the active video shows a new
 * frame. A render that returns false is retried on the next animation frame.
 */
function frameLoop(getVideo, render) {
  let raf = 0
  let last = null
  let lastTime = -1
  const tick = () => {
    const video = getVideo()
    if (video && video.readyState >= 2 && (video !== last || video.currentTime !== lastTime)) {
      if (render(video) !== false) {
        last = video
        lastTime = video.currentTime
      }
    }
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(raf)
}

/*
 * Frame check. Right after play() starts or resumes, phone decoders hand WebGL a black
 * or empty texture for a few frames; the key turns it into an opaque black box that
 * flashes over the whole hero. Every clip keeps clean green screen along its top and
 * bottom edges, so a real frame always comes out transparent there: frames that don't
 * are dropped until VERIFY_FRAMES good ones have been shown in a row.
 */
const PROBE_ROWS = [0.04, 0.96]
const PROBE_COLS = 16
const VERIFY_FRAMES = 15

/** True when the probe rows of a raw RGBA frame (mostly) key out as transparent. */
function keyedEdges(readRow, w, h) {
  let opaque = 0
  for (const fy of PROBE_ROWS) {
    const row = readRow(Math.round(fy * (h - 1)))
    for (let i = 0; i < PROBE_COLS; i++) {
      const p = Math.round(((i + 0.5) / PROBE_COLS) * (w - 1)) * 4
      // Same key as the shader: alpha drops below 0.5 once g - max(r, b) passes 0.185.
      if ((row[p + 1] - Math.max(row[p], row[p + 2])) / 255 < 0.185) opaque++
    }
  }
  return opaque < PROBE_ROWS.length * PROBE_COLS * 0.5
}

/**
 * Plays green-screen clips through a chroma key (WebGL, or a 2D-canvas fallback)
 * so the subject can be layered over the page.
 *
 * - `sources`: clip URLs, all preloaded as hidden <video> elements (null = not loaded yet);
 * - `active` + `token`: which clip to play; bump `token` to (re)start it from 0;
 * - `seek`: QA hook, show a frozen frame at this time instead of playing;
 * - `onEnded`: fires when the active clip finishes (clips don't loop);
 * - `onFrame`: fires after every frame that made it to the canvas.
 */
export default function ChromaVideo({ sources, active = 0, token = 0, seek = null, paused = false, className, onEnded, onFrame }) {
  const canvasRef = useRef(null)
  const canvas2dRef = useRef(null)
  const videoRefs = useRef([])
  const activeRef = useRef(active)
  const tokenRef = useRef(token)
  const onFrameRef = useRef(onFrame)
  const startedRef = useRef(null) // token whose clip has been (re)started
  const verifyRef = useRef(VERIFY_FRAMES) // good frames still to see before checks stop
  const clearRef = useRef(null)
  const [mode, setMode] = useState('webgl')
  activeRef.current = active
  tokenRef.current = token
  onFrameRef.current = onFrame

  useEffect(() => {
    // A new pass draws nothing until its clip has actually been restarted.
    const getVideo = () => (startedRef.current === tokenRef.current ? videoRefs.current[activeRef.current] : null)
    let failingSince = 0
    let unchecked = false
    /** Runs probe() while a check is due; false = drop this frame. */
    const accept = (probe) => {
      if (unchecked || verifyRef.current <= 0) return true
      const ok = probe()
      if (ok) {
        failingSince = 0
        verifyRef.current -= 1
        return true
      }
      verifyRef.current = VERIFY_FRAMES
      failingSince ||= performance.now()
      // No good frame for this long (or no way to read one): the check itself can't
      // work here, so stop checking rather than hide the fish for good.
      if (ok === null || performance.now() - failingSince > 1500) unchecked = true
      return unchecked
    }
    const drawn = (video) => onFrameRef.current?.(video.currentTime)

    const canvas = canvasRef.current
    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false })
    const prog = gl && makeProgram(gl)
    if (!prog) {
      setMode('2d')
      return run2d(canvas2dRef.current, getVideo, accept, drawn, clearRef)
    }
    gl.useProgram(prog)
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    clearRef.current = () => gl.clear(gl.COLOR_BUFFER_BIT)

    // The uploaded frame is checked through a framebuffer before it is drawn, so a
    // bad one never reaches the canvas: it keeps showing the last good frame.
    const fbo = gl.createFramebuffer()
    let row = new Uint8Array(0)
    const probe = (vw, vh) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
      let ok = null
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE) {
        if (row.length !== vw * 4) row = new Uint8Array(vw * 4)
        ok = keyedEdges((y) => {
          row.fill(0)
          gl.readPixels(0, y, vw, 1, gl.RGBA, gl.UNSIGNED_BYTE, row)
          return row
        }, vw, vh)
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      return ok
    }

    const stop = frameLoop(getVideo, (video) => {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video)
      if (!accept(() => probe(video.videoWidth, video.videoHeight))) return false
      // Draw at most ~1280px wide: plenty for an overlay, and kinder to phones.
      const scale = Math.min(1, 1280 / video.videoWidth)
      const w = Math.round(video.videoWidth * scale)
      const h = Math.round(video.videoHeight * scale)
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        gl.viewport(0, 0, w, h)
      }
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      drawn(video)
    })
    // Don't call loseContext() here: StrictMode re-runs this effect on the same
    // canvas, which would then hand back a dead context.
    return stop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Start / restart / freeze the active clip.
  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return
      if (i !== active) {
        v.pause()
        return
      }
      if (seek != null) {
        v.pause()
        const go = () => (v.currentTime = Math.min(seek, (v.duration || 8) - 0.05))
        v.readyState >= 1 ? go() : v.addEventListener('loadedmetadata', go, { once: true })
        return
      }
      v.currentTime = 0
      if (!paused) v.play().catch(() => {})
    })
    // Every pass starts from an empty canvas and from checked frames.
    clearRef.current?.()
    verifyRef.current = VERIFY_FRAMES
    startedRef.current = token
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, token, seek])

  useEffect(() => {
    const v = videoRefs.current[active]
    if (!v || seek != null) return
    if (paused) v.pause()
    else if (!v.ended && v.currentTime > 0) {
      verifyRef.current = VERIFY_FRAMES // decoders can hand out a bad frame on resume too
      v.play().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused])

  return (
    <>
      {/* A canvas that already holds a WebGL context can't hand out a 2D one. */}
      <canvas ref={canvasRef} className={className} aria-hidden data-chroma={mode} hidden={mode !== 'webgl'} />
      <canvas ref={canvas2dRef} className={className} aria-hidden data-chroma={mode} hidden={mode !== '2d'} />
      {/* Source videos live in a tiny fixed box that is always "on screen":
          Chrome pauses muted autoplay videos it considers invisible/offscreen. */}
      {createPortal(
        sources.map((src, i) => src && (
          <video
            key={src}
            ref={(el) => (videoRefs.current[i] = el)}
            src={src}
            muted
            playsInline
            preload="auto"
            className="chroma-source"
            aria-hidden
            tabIndex={-1}
            onEnded={() => i === activeRef.current && onEnded?.()}
          />
        )),
        document.body,
      )}
    </>
  )
}

function makeProgram(gl) {
  const compile = (type, code) => {
    const s = gl.createShader(type)
    gl.shaderSource(s, code)
    gl.compileShader(s)
    return s
  }
  const prog = gl.createProgram()
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT))
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG))
  gl.linkProgram(prog)
  return gl.getProgramParameter(prog, gl.LINK_STATUS) ? prog : null
}

/** CPU fallback when WebGL is unavailable: same key, on a downscaled 2D canvas. */
function run2d(canvas, getVideo, accept, drawn, clearRef) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  let good = null // last keyed frame, put back when a bad one is dropped
  clearRef.current = () => {
    good = null
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }
  return frameLoop(getVideo, (video) => {
    const scale = Math.min(1, 640 / video.videoWidth)
    const w = Math.round(video.videoWidth * scale)
    const h = Math.round(video.videoHeight * scale)
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
    ctx.drawImage(video, 0, 0, w, h)
    const img = ctx.getImageData(0, 0, w, h)
    const d = img.data
    if (!accept(() => keyedEdges((y) => d.subarray(y * w * 4, (y + 1) * w * 4), w, h))) {
      if (good) ctx.putImageData(good, 0, 0)
      else ctx.clearRect(0, 0, w, h)
      return false
    }
    for (let i = 0; i < d.length; i += 4) {
      const g = d[i + 1]
      const m = d[i] > d[i + 2] ? d[i] : d[i + 2]
      const u = Math.min(1, Math.max(0, ((g - m) / 255 - 0.07) / 0.23))
      d[i + 3] = 255 * (1 - u * u * (3 - 2 * u))
      if (g > m + 8) d[i + 1] = m + 8
    }
    ctx.putImageData(img, 0, 0)
    good = img
    drawn(video)
  })
}
