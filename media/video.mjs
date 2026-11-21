// Rakit video bersuara: adegan HTML + klip aplikasi + narasi edge-tts + takarir ASS
// Hasil: docs/video/RANTANG_alur_kerja_dan_IoT.mp4
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { serve, browser, ROOT, sleep } from './lib.mjs'
import { SCENES, VOICE } from './scenes.js'

const M = path.join(ROOT, 'media')
const W = path.join(M, '_video')
fs.mkdirSync(W, { recursive: true })
const FF = execFileSync('python', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim()
const ff = (args) => execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { cwd: M, stdio: ['ignore', 'inherit', 'inherit'] })
const durOf = (f) => {
  let out = ''
  try { execFileSync(FF, ['-i', f], { stdio: 'pipe' }) } catch (e) { out = e.stderr.toString() }
  const m = out.match(/Duration: (\d+):(\d+):([\d.]+)/)
  return +m[1] * 3600 + +m[2] * 60 + +m[3]
}

// 1) render latar adegan
const srv = await serve(ROOT, 4325)
const b = await browser()
const page = await b.newPage({ viewport: { width: 1920, height: 1080 } })
await page.goto('http://localhost:4325/media/scene.html')
await page.evaluate(() => document.fonts.ready)
const slots = {}
for (const s of SCENES) {
  slots[s.id] = await page.evaluate((sc) => window.render(sc), s)
  await page.evaluate(() => Promise.all([...document.images].map((i) => i.complete || new Promise((r) => { i.onload = i.onerror = r }))))
  await sleep(150)
  await page.screenshot({ path: path.join(W, `${s.id}.png`) })
}
await b.close()
srv.close()
console.log('✓ latar adegan')

// 2) narasi
for (const s of SCENES) {
  const mp3 = path.join(W, `${s.id}.mp3`)
  if (!fs.existsSync(mp3) || process.env.REVOICE) {
    execFileSync('python', ['-m', 'edge_tts', '--voice', VOICE, '--rate', '-4%', '--text', s.say, '--write-media', mp3], { stdio: 'ignore' })
  }
  s.dur = durOf(mp3)
}
console.log('✓ narasi', SCENES.map((s) => s.dur.toFixed(1)).join(' '))

// 3) segmen per adegan
const LEAD = 0.5, TAIL = 0.9, FADE = 0.35
const list = []
for (const s of SCENES) {
  const D = +(s.dur + LEAD + TAIL).toFixed(2)
  s.D = D
  const out = `_video/${s.id}.mp4`
  const slot = slots[s.id]
  const args = ['-loop', '1', '-t', `${D}`, '-i', `_video/${s.id}.png`]
  let fc
  if (s.clip && slot) {
    args.push('-ss', `${s.clipStart || 0}`, '-i', `_clips/${s.clip}.webm`)
    args.push('-i', `_video/${s.id}.mp3`)
    fc = `[1:v]scale=${slot.w}:${slot.h}:flags=lanczos,setpts=PTS-STARTPTS,fps=30,tpad=stop_mode=clone:stop_duration=${D}[c];` +
      `[0:v][c]overlay=${slot.x}:${slot.y}:shortest=0,trim=duration=${D},fade=in:st=0:d=${FADE},fade=out:st=${(D - FADE).toFixed(2)}:d=${FADE},format=yuv420p[v];` +
      `[2:a]adelay=${LEAD * 1000}:all=1,apad,atrim=duration=${D},aresample=48000[a]`
  } else {
    args.push('-i', `_video/${s.id}.mp3`)
    fc = `[0:v]fps=30,trim=duration=${D},fade=in:st=0:d=${FADE},fade=out:st=${(D - FADE).toFixed(2)}:d=${FADE},format=yuv420p[v];` +
      `[1:a]adelay=${LEAD * 1000}:all=1,apad,atrim=duration=${D},aresample=48000[a]`
  }
  ff([...args, '-filter_complex', fc, '-map', '[v]', '-map', '[a]', '-t', `${D}`, '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-r', '30', '-c:a', 'aac', '-b:a', '160k', '-ac', '2', out])
  list.push(`file '${s.id}.mp4'`)
  console.log('✓ segmen', s.id, D)
}
fs.writeFileSync(path.join(W, 'list.txt'), list.join('\n'))
ff(['-f', 'concat', '-safe', '0', '-i', '_video/list.txt', '-c', 'copy', '_video/joined.mp4'])

// 4) takarir
const ts = (t) => {
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sec = (t % 60).toFixed(2).padStart(5, '0')
  return `${h}:${String(m).padStart(2, '0')}:${sec}`
}
function chunks(text) {
  const out = []
  for (const sent of text.match(/[^.?!]+[.?!]?/g).map((x) => x.trim()).filter(Boolean)) {
    if (sent.length <= 95) { out.push(sent); continue }
    let cur = ''
    for (const part of sent.split(/(?<=,)\s/)) {
      if ((cur + ' ' + part).trim().length > 95 && cur) { out.push(cur.trim()); cur = part } else cur = (cur + ' ' + part).trim()
    }
    if (cur) out.push(cur)
  }
  return out
}
const MARGIN_R = { phone: 640, twophones: 960, laptop: 1240 }
let ass = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Segoe UI Semibold,36,&H00FFFFFF,&H00FFFFFF,&H18383B0A,&H00000000,0,0,0,0,100,100,0,0,3,16,0,1,110,110,44,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`
let off = 0
for (const s of SCENES) {
  const cs = chunks(s.say)
  const total = cs.reduce((a, c) => a + c.length, 0)
  let t = off + LEAD
  for (const c of cs) {
    const d = (c.length / total) * s.dur
    ass += `Dialogue: 0,${ts(t)},${ts(t + d - 0.05)},Cap,,110,${MARGIN_R[s.layout] || 110},44,,${c}\n`
    t += d
  }
  off += s.D
}
fs.writeFileSync(path.join(W, 'captions.ass'), ass, 'utf8')

const outDir = path.join(ROOT, 'docs', 'video')
fs.mkdirSync(outDir, { recursive: true })
ff(['-i', '_video/joined.mp4', '-vf', 'ass=_video/captions.ass', '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-c:a', 'copy', '-movflags', '+faststart', '../docs/video/RANTANG_alur_kerja_dan_IoT.mp4'])
ff(['-i', '_video/joined.mp4', '-c', 'copy', '-movflags', '+faststart', '../docs/video/RANTANG_alur_kerja_dan_IoT_tanpa_takarir.mp4'])
fs.copyFileSync(path.join(W, 'captions.ass'), path.join(outDir, 'takarir.ass'))
console.log('✓ video', (off / 60).toFixed(2), 'menit')
