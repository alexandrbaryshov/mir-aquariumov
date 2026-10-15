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

/** Calls render(video) on every animation frame in which the active video shows a new frame. */
function frameLoop(getVideo, render) {
  let raf = 0
  let last = null
  let lastTime = -1
  const tick = () => {
    const video = getVideo()
    if (video && video.readyState >= 2 && (video !== last || video.currentTime !== lastTime)) {
      last = video
      lastTime = video.currentTime
      render(video)
    }
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(raf)
}

/**
 * Plays green-screen clips through a chroma key (WebGL, or a 2D-canvas fallback)
 * so the subject can be layered over the page.
 *
 * - `sources`: clip URLs, all preloaded as hidden <video> elements;
 * - `active` + `token`: which clip to play; bump `token` to (re)start it from 0;
 * - `seek`: QA hook, show a frozen frame at this time instead of playing;
 * - `onEnded`: fires when the active clip finishes (clips don't loop).
 */
export default function ChromaVideo({ sources, active = 0, token = 0, seek = null, paused = false, className, onEnded, onFrame }) {
  const canvasRef = useRef(null)
  const canvas2dRef = useRef(null)
  const videoRefs = useRef([])
  const activeRef = useRef(active)
  const [mode, setMode] = useState('webgl')
  activeRef.current = active

  useEffect(() => {
    const getVideo = () => videoRefs.current[activeRef.current]
    const canvas = canvasRef.current
    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false })
    const prog = gl && makeProgram(gl)
    if (!prog) {
      setMode('2d')
      return run2d(canvas2dRef.current, getVideo, onFrame)
    }
    gl.useProgram(prog)
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

    const stop = frameLoop(getVideo, (video) => {
      // Draw at most ~1280px wide: plenty for an overlay, and kinder to phones.
      const scale = Math.min(1, 1280 / video.videoWidth)
      const w = Math.round(video.videoWidth * scale)
      const h = Math.round(video.videoHeight * scale)
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        gl.viewport(0, 0, w, h)
      }
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      onFrame?.(video.currentTime)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, token, seek])

  useEffect(() => {
    const v = videoRefs.current[active]
    if (!v || seek != null) return
    if (paused) v.pause()
    else if (!v.ended && v.currentTime > 0) v.play().catch(() => {})
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
        sources.map((src, i) => (
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
function run2d(canvas, getVideo, onFrame) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
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
    for (let i = 0; i < d.length; i += 4) {
      const g = d[i + 1]
      const m = d[i] > d[i + 2] ? d[i] : d[i + 2]
      const u = Math.min(1, Math.max(0, ((g - m) / 255 - 0.07) / 0.23))
      d[i + 3] = 255 * (1 - u * u * (3 - 2 * u))
      if (g > m + 8) d[i + 1] = m + 8
    }
    ctx.putImageData(img, 0, 0)
    onFrame?.(video.currentTime)
  })
}
