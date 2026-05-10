'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import * as Tone from 'tone'

// ═══════════ 乐理 ═══════════
const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
const IS_BLACK = [false, true, false, true, false, false, true, false, true, false, true, false]
const BLACK_PREV_WHITE: Record<number, number> = { 1: 0, 3: 2, 6: 5, 8: 7, 10: 9 }

interface KeyDef {
  name: string
  isBlack: boolean
  chroma: number
  octave: number
  midi: number
}

const ALL_KEYS: KeyDef[] = []
for (let midi = 36; midi <= 108; midi++) {
  const chroma = midi % 12
  const octave = Math.floor(midi / 12) - 1
  ALL_KEYS.push({ name: `${CHROMATIC[chroma]}${octave}`, isBlack: IS_BLACK[chroma], chroma, octave, midi })
}
const WHITE_KEYS = ALL_KEYS.filter(k => !k.isBlack)

// ═══════════ 键盘映射 ─── AutoPiano 标准布局 ═══════════
// 连续音阶 C2→C7 横跨 4 排键盘按键，每排从上一排末尾继续
// 1排(1234567890) → C2..E3
// Q排(qwertyuiop) → F3..A4
// A排(asdfghjkl)  → B4..C6
// Z排(zxcvbnm)    → D6..C7
// 黑键 = 同排按键的 Shift 大写/符号
const KEY_TO_NOTE: Record<string, string> = {}
const NOTE_TO_KEY: Record<string, string> = {}

function addMapping(key: string, chroma: number, octave: number) {
  const k = ALL_KEYS.find(k => k.chroma === chroma && k.octave === octave)
  if (k) { KEY_TO_NOTE[key] = k.name; NOTE_TO_KEY[k.name] = key }
}

// ── 白键：连续 C2→C7，每排从上排末尾继续 ──
const WHITE_CHROMA = [0, 2, 4, 5, 7, 9, 11] // C D E F G A B
const WHITE_ROWS: { keys: string; startChroma: number; startOctave: number }[] = [
  { keys: '1234567890', startChroma: 0,  startOctave: 2 }, // C2→E3
  { keys: 'qwertyuiop', startChroma: 5,  startOctave: 3 }, // F3→A4
  { keys: 'asdfghjkl',  startChroma: 11, startOctave: 4 }, // B4→C6
  { keys: 'zxcvbnm',    startChroma: 2,  startOctave: 6 }, // D6→C7
]

for (const row of WHITE_ROWS) {
  const startIdx = WHITE_CHROMA.indexOf(row.startChroma)
  for (let i = 0; i < row.keys.length; i++) {
    const chroma = WHITE_CHROMA[(startIdx + i) % 7]
    const octave = row.startOctave + Math.floor((startIdx + i) / 7)
    addMapping(row.keys[i], chroma, octave)
  }
}

// ── 黑键：Shift+字母/数字 = 相邻白键之间的半音 ──
addMapping('!', 1, 2)   // C#2  Shift+1
addMapping('@', 3, 2)   // D#2  Shift+2
addMapping('$', 6, 2)   // F#2  Shift+4
addMapping('%', 8, 2)   // G#2  Shift+5
addMapping('^', 10, 2)  // A#2  Shift+6

addMapping('*', 1, 3)   // C#3  Shift+8
addMapping('(', 3, 3)   // D#3  Shift+9

addMapping('Q', 6, 3)   // F#3  Shift+q
addMapping('W', 8, 3)   // G#3  Shift+w
addMapping('E', 10, 3)  // A#3  Shift+e

addMapping('T', 1, 4)   // C#4  Shift+t
addMapping('Y', 3, 4)   // D#4  Shift+y
addMapping('I', 6, 4)   // F#4  Shift+i
addMapping('O', 8, 4)   // G#4  Shift+o
addMapping('P', 10, 4)  // A#4  Shift+p

addMapping('S', 1, 5)   // C#5  Shift+s
addMapping('D', 3, 5)   // D#5  Shift+d
addMapping('G', 6, 5)   // F#5  Shift+g
addMapping('H', 8, 5)   // G#5  Shift+h
addMapping('J', 10, 5)  // A#5  Shift+j

addMapping('L', 1, 6)   // C#6  Shift+l
addMapping('Z', 3, 6)   // D#6  Shift+z
addMapping('C', 6, 6)   // F#6  Shift+c
addMapping('V', 8, 6)   // G#6  Shift+v
addMapping('B', 10, 6)  // A#6  Shift+b

// ═══════════ 音色 ═══════════
const SF_BASE = 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/'
const SF_NOTES = ['C2','C3','C4','C5','C6','C7']
function sfUrls(instrument: string): Record<string, string> {
  const urls: Record<string, string> = {}
  for (const n of SF_NOTES) urls[n] = `${instrument}-mp3/${n}.mp3`
  return urls
}

interface VoiceDef {
  id: string; name: string; instrument: string; volume: number
}
const VOICES: VoiceDef[] = [
  { id: 'grand', name: '三角钢琴', instrument: 'acoustic_grand_piano', volume: -6 },
  { id: 'bright', name: '明亮钢琴', instrument: 'bright_acoustic_piano', volume: -6 },
  { id: 'epiano1', name: '电钢琴1', instrument: 'electric_piano_1', volume: -7 },
  { id: 'epiano2', name: '电钢琴2', instrument: 'electric_piano_2', volume: -7 },
  { id: 'honky', name: '酒吧钢琴', instrument: 'honkytonk_piano', volume: -6 },
  { id: 'organ', name: '教堂风琴', instrument: 'church_organ', volume: -8 },
  { id: 'strings', name: '弦乐合奏', instrument: 'string_ensemble_1', volume: -9 },
  { id: 'vibes', name: '颤音琴', instrument: 'vibraphone', volume: -8 },
  { id: 'musicbox', name: '八音盒', instrument: 'music_box', volume: -9 },
  { id: 'celesta', name: '钢片琴', instrument: 'celesta', volume: -8 },
]

// ═══════════ 曲谱 ═══════════
const SONGS: { name: string; author?: string; notes: [string, number][] }[] = [
  { name: '小星星', author: '传统儿歌', notes: [['C4',0.5],['C4',0.5],['G4',0.5],['G4',0.5],['A4',0.5],['A4',0.5],['G4',1],['F4',0.5],['F4',0.5],['E4',0.5],['E4',0.5],['D4',0.5],['D4',0.5],['C4',1]] },
  { name: '欢乐颂', author: '贝多芬', notes: [['E4',0.5],['E4',0.5],['F4',0.5],['G4',0.5],['G4',0.5],['F4',0.5],['E4',0.5],['D4',0.5],['C4',0.5],['C4',0.5],['D4',0.5],['E4',0.5],['E4',0.75],['D4',0.25],['D4',1]] },
  { name: '致爱丽丝', author: '贝多芬', notes: [['E4',0.5],['D#4',0.5],['E4',0.5],['D#4',0.5],['E4',0.5],['B3',0.5],['D4',0.5],['C4',0.5],['A3',1]] },
  { name: '月亮代表我的心', author: '邓丽君', notes: [['C4',1],['E4',1],['G4',1.5],['A4',0.5],['G4',1],['E4',1],['C4',0.5],['D4',0.5],['E4',2]] },
  { name: '卡农', author: '帕赫贝尔', notes: [['G3',1],['A3',0.5],['B3',0.5],['C4',1],['D4',0.5],['E4',0.5],['F4',0.5],['E4',0.5],['D4',0.5],['C4',0.5],['B3',0.5],['A3',0.5],['G3',2]] },
  { name: '两只老虎', author: '传统儿歌', notes: [['C4',0.5],['D4',0.5],['E4',0.5],['C4',0.5],['C4',0.5],['D4',0.5],['E4',0.5],['C4',0.5],['E4',0.5],['F4',0.5],['G4',1],['E4',0.5],['F4',0.5],['G4',1],['G4',0.5],['A4',0.5],['G4',0.5],['F4',0.5],['E4',0.5],['C4',0.5],['G4',0.5],['A4',0.5],['G4',0.5],['F4',0.5],['E4',0.5],['C4',0.5],['C4',0.5],['G4',0.5],['C4',1],['C4',0.5],['G4',0.5],['C4',1]] },
  { name: '生日快乐', author: '传统祝福', notes: [['G4',0.5],['G4',0.5],['A4',0.5],['G4',0.5],['C5',0.5],['B4',1],['G4',0.5],['G4',0.5],['A4',0.5],['G4',0.5],['D5',0.5],['C5',1],['G4',0.5],['G4',0.5],['G4',0.5],['E5',0.5],['C5',0.5],['B4',0.5],['A4',1],['F4',0.5],['F4',0.5],['E4',0.5],['C4',0.5],['D5',0.5],['C5',1]] },
  { name: '茉莉花', author: '江苏民歌', notes: [['E5',0.5],['G5',0.5],['A5',1],['G5',0.5],['A5',0.5],['C6',1],['A5',1],['G5',0.5],['E5',0.5],['G5',1],['E5',1],['D5',0.5],['G5',0.5],['E5',1]] },
  { name: '铃儿响叮当', author: '圣诞歌曲', notes: [['E4',0.5],['E4',0.5],['E4',1],['E4',0.5],['E4',0.5],['E4',1],['E4',0.5],['G4',0.5],['C4',0.5],['D4',0.5],['E4',2],['F4',0.5],['F4',0.5],['F4',0.5],['F4',0.5],['F4',0.5],['E4',0.5],['E4',0.5],['E4',0.5],['E4',0.5],['E4',0.5],['D4',0.5],['D4',0.5],['E4',0.5],['D4',1],['G4',1]] },
  { name: '天空之城', author: '久石让', notes: [['A4',0.5],['B4',0.5],['C5',1],['C5',0.5],['B4',0.5],['A4',1],['G4',0.5],['A4',0.5],['C5',1],['B4',1],['C5',0.5],['D5',0.5],['E5',1],['E5',0.5],['D5',0.5],['C5',1],['B4',0.5],['C5',0.5],['E5',1],['D5',1.5],['E5',0.5],['G5',0.5],['E5',0.5],['C5',0.5],['A4',0.5],['G4',1],['A4',0.5],['G4',1.5]] },
  { name: '雪绒花', author: '音乐之声', notes: [['C4',0.5],['D4',0.5],['E4',0.5],['F4',0.5],['G4',1],['G4',1],['E4',0.5],['F4',0.5],['G4',0.5],['A4',0.5],['G4',0.5],['E4',0.5],['C4',0.5],['D4',0.5],['E4',1],['E4',0.5],['F4',0.5],['G4',1],['C5',0.5],['B4',1],['A4',0.5],['G4',0.5],['F4',1]] },
  { name: '说了再见（上）', author: '周杰伦', notes: [["G4",0.3],["C5",0.3],["B4",0.3],["C5+F2",0.3],["C5+C3",0.3],["C5+F2",0.3],["C5",0.3],["B4+G2",0.3],["C5+D3",0.3],["D5+G3",0.3],["B4",0.3],["G4+E2",0.3],["B2",0.3],["E3",0.3],["G3",0.3],["B3",0.3],["G4",0.3],["C5",0.3],["D5",0.3],["E5+F2",0.3],["E5+C3",0.3],["E5+F3",0.3],["E5",0.3],["E5+E2",0.3],["D5+B2",0.3],["E5+E3",0.3],["F5",0.3],["E5+C3",0.3],["G3",0.3],["C4",0.3],["F4",0.3],["E4",0.3],["C5",0.3],["E5",0.3],["C5",0.3],["A5+F2",0.3],["C3",0.3],["E5+F3",0.3],["D5",0.3],["D5+G2",0.3],["D3",0.3],["G3",0.3],["C5",0.3],["B4+E2",0.3],["C5+B2",0.3],["D5+G4",0.3],["G4",0.3],["C5+A2",0.3],["E3",0.3],["A3",0.3],["A4",0.3],["G4+E2",0.3],["C5+C3",0.3],["C5+E3",0.3],["F5",0.3],["E5+G2",0.3],["C5+D3",0.3],["G3",0.3],["C5",0.3],["B4",0.3],["C5+C4",0.3],["G3",0.3],["D4",0.3],["G3",0.3],["C4",0.3],["D4",0.3],["E4",0.3],["E4+F2",0.3],["D4+C3",0.3],["E4",0.3],["E4+F3",0.3],["D4",0.3],["E4+G2",0.3],["A4",0.3],["D3",0.3],["G3",0.3],["C4",0.3],["D4",0.3],["D4+E2",0.3],["C4+B2",0.3],["D4",0.3],["D4+E3",0.3],["C4",0.3],["D4+A2",0.3],["G4",0.3],["E3",0.3],["A3",0.3],["C4",0.3],["F4+D2",0.3],["F4+A2",0.3],["F4+D3",0.3],["F4",0.3],["F4+G2",0.3],["F4+D3",0.3],["E4+G3",0.3],["D4",0.3],["E4+C3",0.3],["G3",0.3],["C4",0.3],["D4",0.3],["E4",0.3],["D4",0.3],["E4",0.3],["E4+G2",0.3],["D4+C3",0.3],["E4",0.3],["E4+F3",0.3],["D4",0.3],["E4+G2",0.3],["A4",0.3],["D3",0.3],["G3",0.3]] },
  { name: '蒲公英的约定', author: '周杰伦', notes: [["E4",0.35],["G4",0.35],["C5",0.35],["E5",0.35],["E5+F2",0.35],["C3",0.35],["F3",0.35],["F5",0.35],["D5+G2",0.35],["D3",0.35],["G3",0.35],["D5+E2",0.35],["B2",0.35],["G5+E3",0.35],["B4",0.35],["C5+A2",0.35],["E3",0.35],["A3",0.35],["E5+D2",0.35],["F5+A2",0.35],["G5+D3",0.35],["C5",0.35],["C5+G2",0.35],["D3",0.35],["D5+G3",0.35],["E5+C3",0.35],["G3",0.35],["C4",0.35],["D4",0.35],["E4",0.35],["G4",0.35],["C5",0.35],["E5",0.35],["E5+F2",0.35],["C3",0.35],["F3",0.35],["F5",0.35],["D5+G2",0.35],["D3",0.35],["G3",0.35],["D5+E2",0.35],["B2",0.35],["G5+E3",0.35],["B4",0.35],["C5+A2",0.35],["E3",0.35],["A3",0.35],["E5+D2",0.35],["F5+A2",0.35],["G5+D3",0.35],["C5",0.35],["C5+G2",0.35],["D3",0.35],["D5+G3",0.35],["C3+G5",0.35],["G3",0.35],["C4",0.35],["F4",0.35],["E4+C3",0.35],["E4",0.35],["F4",0.35],["G4",0.35],["C3",0.35],["G4+G3",0.35],["G4+C4",0.35],["G4",0.35]] },
  { name: '大鱼', author: '周深', notes: [["E5",0.28],["D5",0.28],["E5",0.28],["A5",0.28],["E5",0.28],["D5",0.28],["E5",0.28],["B5",0.28],["E5",0.28],["D5",0.28],["E5",0.28],["C6",0.28],["B5",0.28],["G5",0.28],["E5",0.28],["D5",0.28],["E5",0.28],["A5",0.28],["E5",0.28],["D5",0.28],["E5",0.28],["B5",0.28],["G5",0.28],["C5",0.28],["B4",0.28]] },
  { name: '花之舞', author: 'DJ OKAWARI', notes: [["E5",0.5],["D5",0.5],["A5",0.5],["D5",0.5],["E5",0.5],["D5",0.5],["A4",0.5],["D5",0.5],["E5",0.5],["D5",0.5],["A5",0.5],["D5",0.5],["E5",0.5],["D5",0.5],["A4",0.5],["D5",0.5],["E5",0.5],["D5",0.5],["A5",0.5],["D5",0.5],["E5",0.5],["D5",0.5],["A4",0.5],["D5",0.5],["E5",0.5],["D5",0.5],["A5",0.5],["D5",0.5],["E5",0.5],["D5",0.5],["A4",0.5],["D5",0.5],["E5",0.5],["D5",0.5],["A5",0.5],["D5",0.5],["E5",0.5],["D5",0.5],["A4",0.5],["D5",0.5],["E5",0.5],["D5",0.5],["A5",0.5],["D5",0.5],["E5",0.5],["D5",0.5],["A5+C#6+E6",0.3]] },
  { name: '三叶的主题曲', author: 'RADWIMPS', notes: [["C5",0.5],["D5",0.5],["F4+E5",0.3],["G5",0.3],["G4+F5",0.3],["E5",0.3],["E4+D5",0.3],["C5",0.3],["F4+E5",0.3],["G4",0.5],["A4",0.5],["F4+C5",0.3],["D5",0.3],["G4+E5",0.3],["B4",0.3],["E4+C5",0.3],["G4",0.3],["F4+A4",0.3],["C5",0.5],["D5",0.5],["F4+E5",0.3],["G5",0.3],["G4+F5",0.3],["E5",0.3],["E4+D5",0.3],["C5",0.3],["F4+E5",0.3],["G4",0.5],["A4",0.5],["F4+C5",0.3],["D5",0.3],["G4+E5",0.3],["B4",0.3],["E4+C5",0.3],["G4",0.3],["F4+A4",0.3],["F3+C5",0.5],["G5",0.5],["C5",0.5],["G5",0.5],["C5",0.3]] },
]
// 曲谱键盘快捷键文字提示（预计算）
const noteToKeyStr = (n: string) => n.includes('+') ? '[' + n.split('+').map(k => NOTE_TO_KEY[k] || '').join('') + ']' : NOTE_TO_KEY[n] || ''
const SONG_KEYS = SONGS.map(s => s.notes.map(([n]) => noteToKeyStr(n)).join(' '))

const KEY_W = 40
const KEY_STEP = KEY_W + 2

function getBlackKeyLeft(k: KeyDef): number {
  const prevChroma = BLACK_PREV_WHITE[k.chroma] ?? 0
  const prevMidi = k.midi - (k.chroma - prevChroma)
  const pw = WHITE_KEYS.find(w => w.midi === prevMidi)
  return pw ? pw.midi - WHITE_KEYS[0].midi : 0
}

// ═══════════ 主组件 ═══════════
export default function PianoPage() {
  const [audioReady, setAudioReady] = useState(false)
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set())
  const [currentVoice, setCurrentVoice] = useState<VoiceDef>(VOICES[0])
  const [sustainOn, setSustainOn] = useState(true)
  const [isRecording, setIsRecording] = useState(false)
  const [recordedNotes, setRecordedNotes] = useState<{ name: string; time: number }[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentSong, setCurrentSong] = useState<typeof SONGS[number] | null>(null)

  const samplerRef = useRef<Tone.Sampler | null>(null)
  const activeRef = useRef<Set<string>>(new Set())
  const currentNoteRef = useRef<string | null>(null)
  const startTimeRef = useRef(0)
  const recordingRef = useRef<{ name: string; time: number }[]>([])
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animFrameRef = useRef(0)
  const isPlayingRef = useRef(false)
  const waveRef = useRef<HTMLCanvasElement | null>(null)

  // ─── Sampler ───
  const ensureSampler = useCallback(async () => {
    if (samplerRef.current) return
    await Tone.start()
    const s = new Tone.Sampler({
      urls: sfUrls(currentVoice.instrument),
      baseUrl: SF_BASE,
      volume: currentVoice.volume,
    }).toDestination()
    samplerRef.current = s
    setAudioReady(true)
  }, [currentVoice])

  // ─── 切换音色 ───
  const changeVoice = useCallback((v: VoiceDef) => {
    if (v.id === currentVoice.id) return
    samplerRef.current?.dispose()
    samplerRef.current = null
    setCurrentVoice(v)
    setAudioReady(false)
    activeRef.current.clear()
    setActiveKeys(new Set())
    ensureSampler()
  }, [currentVoice, ensureSampler])

  // ─── 弹奏（无 voiceLoading 阻塞） ───
  const playNote = useCallback((name: string) => {
    if (!samplerRef.current || activeRef.current.has(name)) return
    activeRef.current.add(name)
    setActiveKeys(new Set(activeRef.current))
    try { samplerRef.current.triggerAttack(name) } catch {}
    if (isRecording) recordingRef.current.push({ name, time: Date.now() - startTimeRef.current })
  }, [isRecording])

  const stopNote = useCallback((name: string) => {
    if (!samplerRef.current) return
    activeRef.current.delete(name)
    setActiveKeys(new Set(activeRef.current))
    if (!sustainOn) try { samplerRef.current.triggerRelease(name) } catch {}
  }, [sustainOn])

  useEffect(() => {
    if (sustainOn) return
    activeRef.current.forEach(n => { try { samplerRef.current?.triggerRelease(n) } catch {} })
  }, [sustainOn])

  // ─── 物理键盘 ───
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      const note = KEY_TO_NOTE[e.key]
      if (!note) return
      e.preventDefault()
      if (!samplerRef.current) { ensureSampler(); return }
      if (!audioReady) return
      playNote(note)
    }
    const onUp = (e: KeyboardEvent) => {
      const note = KEY_TO_NOTE[e.key]
      if (note) stopNote(note)
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [audioReady, ensureSampler, playNote, stopNote])

  // ─── 触摸/指针 ───
  const handleTouchStart = useCallback((name: string) => {
    if (!samplerRef.current) { ensureSampler(); return }
    if (!audioReady) return
    playNote(name)
    currentNoteRef.current = name
  }, [audioReady, ensureSampler, playNote])

  const handleTouchEnd = useCallback(() => {
    if (currentNoteRef.current) stopNote(currentNoteRef.current)
    currentNoteRef.current = null
  }, [stopNote])

  // 容器级 pointermove：检测跨越琴键 → glide
  const handleKeyMove = useCallback((clientX: number, clientY: number) => {
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null
    if (!el) return
    const note = el.getAttribute('data-note') || el.closest('[data-note]')?.getAttribute('data-note')
    if (!note || note === currentNoteRef.current) return
    if (currentNoteRef.current) stopNote(currentNoteRef.current)
    playNote(note)
    currentNoteRef.current = note
  }, [playNote, stopNote])

  // ─── 录音 ───
  const toggleRecord = useCallback(() => {
    if (isRecording) {
      setIsRecording(false)
      setRecordedNotes([...recordingRef.current])
    } else {
      recordingRef.current = []
      startTimeRef.current = Date.now()
      setIsRecording(true)
    }
  }, [isRecording])

  const playRecording = useCallback(async () => {
    if (recordedNotes.length === 0 || !samplerRef.current) return
    setIsPlaying(true)
    samplerRef.current.releaseAll()
    const base = recordedNotes[0].time
    for (const r of recordedNotes) {
      await new Promise(r2 => setTimeout(r2, r.time - base))
      if (!samplerRef.current) break
      samplerRef.current.triggerAttack(r.name)
    }
    await new Promise(r => setTimeout(r, 400))
    samplerRef.current?.releaseAll()
    setIsPlaying(false)
  }, [recordedNotes])

  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])

  // ─── 下落音符：获取琴键 X 坐标 ───
  const getNoteX = useCallback((noteName: string): number => {
    const wk = WHITE_KEYS.find(k => k.name === noteName)
    if (wk) {
      const idx = WHITE_KEYS.indexOf(wk)
      return idx * KEY_STEP + KEY_W / 2
    }
    const bk = ALL_KEYS.find(k => k.name === noteName && k.isBlack)
    if (bk) {
      const left = getBlackKeyLeft(bk) * KEY_STEP + Math.round(KEY_W * 0.65)
      return left + 14
    }
    return 0
  }, [])

  const playSong = useCallback((song: typeof SONGS[number]) => {
    if (!samplerRef.current || isPlayingRef.current) return
    setIsPlaying(true)
    isPlayingRef.current = true
    setCurrentSong(song)
    samplerRef.current.releaseAll()

    const FALL_MS = 2000
    const songStartTime = performance.now()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 曲子节拍表
    let cumulative = 0
    const schedule = song.notes.map(([n, d]) => {
      const t = cumulative
      cumulative += d * 600
      return { note: n, key: NOTE_TO_KEY[n] || '', hitTime: t, duration: d, played: false }
    })
    const totalMs = cumulative + 600

    // 画布尺寸匹配键盘容器（绘制缓冲区 = 显示尺寸，1:1 映射）
    const parent = canvas.parentElement
    if (parent) {
      const w = parent.scrollWidth || parent.clientWidth || WHITE_KEYS.length * KEY_STEP
      const h = parent.clientHeight || 380
      canvas.width = w
      canvas.style.width = w + 'px'
      canvas.height = h
      canvas.style.height = h + 'px'
    }

    // 获取某个音符在键盘上的 X 位置
    function noteX(note: string): number {
      const wk = WHITE_KEYS.find(k => k.name === note)
      if (wk) {
        const idx = WHITE_KEYS.indexOf(wk)
        return idx * KEY_STEP + KEY_W / 2
      }
      const bk = ALL_KEYS.find(k => k.name === note && k.isBlack)
      if (bk) {
        const left = getBlackKeyLeft(bk) * KEY_STEP + Math.round(KEY_W * 0.65)
        return left + 14
      }
      return 0
    }

    function animate() {
      if (!isPlayingRef.current) return
      const elapsed = performance.now() - songStartTime
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)

      for (const s of schedule) {
        const appearTime = s.hitTime - FALL_MS
        const goneTime = s.hitTime + s.duration * 600 + 200
        if (elapsed < appearTime || elapsed > goneTime) continue

        const progress = Math.min((elapsed - appearTime) / FALL_MS, 1)
        const y = progress * canvas!.height
        const x = noteX(s.note)

        // 到达底部时触发发声（支持和弦）
        if (progress >= 1 && !s.played) {
          s.played = true
          const notes = s.note.split('+')
          for (const n of notes) {
            try { samplerRef.current?.triggerAttackRelease(n, s.duration) } catch {}
          }
          setActiveKeys(new Set(notes))
        }

        // 绘制下落音符条
        const fadeOut = Math.max(0, 1 - (elapsed - s.hitTime) / 200)
        ctx!.globalAlpha = Math.min(1, progress * 2) * fadeOut

        // 光晕
        ctx!.beginPath()
        ctx!.arc(x, y, 22, 0, Math.PI * 2)
        ctx!.fillStyle = 'rgba(139, 92, 246, 0.18)'
        ctx!.fill()

        // 主音符条
        const barW = s.key ? 40 : 20
        const barH = 18
        ctx!.beginPath()
        ctx!.roundRect(x - barW / 2, y - barH / 2, barW, barH, 5)
        ctx!.fillStyle = '#8b5cf6'
        ctx!.fill()
        ctx!.strokeStyle = 'rgba(255,255,255,0.25)'
        ctx!.lineWidth = 1
        ctx!.stroke()

        // 键盘字母标识
        if (s.key) {
          ctx!.fillStyle = '#fff'
          ctx!.font = 'bold 10px monospace'
          ctx!.textAlign = 'center'
          ctx!.textBaseline = 'middle'
          ctx!.fillText(s.key, x, y)
        }

        ctx!.globalAlpha = 1
      }

      if (elapsed < totalMs) {
        animFrameRef.current = requestAnimationFrame(animate)
      } else {
        setTimeout(() => {
          isPlayingRef.current = false
          setIsPlaying(false)
          setActiveKeys(new Set())
          samplerRef.current?.releaseAll()
          ctx!.clearRect(0, 0, canvas!.width, canvas!.height)
        }, 500)
      }
    }

    animFrameRef.current = requestAnimationFrame(animate)
  }, [])

  // 清理动画帧 + 释放 Sampler 音频资源
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current)
      isPlayingRef.current = false
      // P0-10: 组件卸载时释放 Tone.js Sampler 防止内存泄漏
      if (samplerRef.current) {
        try { samplerRef.current.dispose() } catch {}
        samplerRef.current = null
      }
    }
  }, [])

  // ═══════ 音频波形可视化 ═══════
  useEffect(() => {
    const canvas = waveRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const c = ctx

    let analyser: AnalyserNode | null = null
    let running = true

    const initTimer = setTimeout(() => {
      try {
        const audioCtx = (Tone as any).getContext()
        if (audioCtx) {
          analyser = audioCtx.createAnalyser()
          analyser!.fftSize = 128
          ;(Tone as any).getDestination().connect(analyser!)
        }
      } catch {}
    }, 500)

    const w = 560, h = 48
    canvas.width = w * window.devicePixelRatio
    canvas.height = h * window.devicePixelRatio
    c.scale(window.devicePixelRatio, window.devicePixelRatio)

    function draw() {
      if (!running) return
      requestAnimationFrame(draw)
      c.fillStyle = 'rgb(3, 7, 18)'
      c.fillRect(0, 0, w, h)
      c.strokeStyle = 'rgba(255,255,255,0.04)'
      c.lineWidth = 1
      c.beginPath()
      c.moveTo(0, h/2)
      c.lineTo(w, h/2)
      c.stroke()

      if (!analyser) return
      const buf = new Uint8Array(analyser.frequencyBinCount)
      analyser.getByteTimeDomainData(buf)

      const slice = w / buf.length
      c.lineWidth = 1.5
      c.strokeStyle = 'rgba(139, 92, 246, 0.45)'
      c.beginPath()
      for (let i = 0; i < buf.length; i++) {
        const v = buf[i] / 128.0
        const x = i * slice
        const y = v * h * 0.35 + h * 0.15
        i === 0 ? c.moveTo(x, y) : c.lineTo(x, y)
      }
      c.stroke()
    }
    draw()

    return () => {
      running = false
      clearTimeout(initTimer)
      if (analyser) {
        try { (Tone as any).getDestination().disconnect(analyser) } catch {}
      }
    }
  }, [])

  // ─── 键盘映射查找 ───
  const wKeyMap: Record<number, string> = {}
  const bKeyMap: Record<number, string> = {}
  for (const row of WHITE_ROWS) {
    const startIdx = WHITE_CHROMA.indexOf(row.startChroma)
    for (let i = 0; i < row.keys.length; i++) {
      const chroma = WHITE_CHROMA[(startIdx + i) % 7]
      const octave = row.startOctave + Math.floor((startIdx + i) / 7)
      wKeyMap[(octave + 1) * 12 + chroma] = row.keys[i]
    }
  }
  // 黑键标注（AutoPiano 标准）
  const BLACK_SHORTCUTS: [string, number, number][] = [
    ['!',1,2],['@',3,2],['$',6,2],['%',8,2],['^',10,2],
    ['*',1,3],['(',3,3],['Q',6,3],['W',8,3],['E',10,3],
    ['T',1,4],['Y',3,4],['I',6,4],['O',8,4],['P',10,4],
    ['S',1,5],['D',3,5],['G',6,5],['H',8,5],['J',10,5],
    ['L',1,6],['Z',3,6],['C',6,6],['V',8,6],['B',10,6],
  ]
  for (const [key, chroma, octave] of BLACK_SHORTCUTS) {
    bKeyMap[(octave + 1) * 12 + chroma] = key
  }

  // ═══════════ RENDER — 键盘 + 底部控制 ═══════════
  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">
      {/* 顶部返回 */}
      <div className="flex-shrink-0 pt-safe pt-3 pb-0.5 px-4 flex items-center justify-between z-10">
        <Link href="/lab" className="text-[10px] text-gray-500 hover:text-white transition-colors">
          ← 返回实验室
        </Link>
        <span className="text-[9px] text-gray-600">{currentVoice.name}</span>
      </div>

      {/* ───── 键盘（居中 + 限制高度） ───── */}
      <div
        className="flex-1 flex items-center justify-center overflow-hidden pb-1 px-2"
        style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
        onPointerMove={e => handleKeyMove(e.clientX, e.clientY)}
      >
        <div
          className="relative overflow-x-auto overflow-y-hidden"
          style={{
            scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-x pan-y',
            width: '100%',
            maxWidth: `${WHITE_KEYS.length * KEY_STEP}px`,
            height: '52vh',
            maxHeight: '380px',
          }}
        >
          <div className="relative h-full" style={{ minWidth: `${WHITE_KEYS.length * KEY_STEP}px` }}>
            {/* 下落音符画布 */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 z-20 pointer-events-none"
              style={{ width: '100%', height: '100%' }}
            />
            {/* 白键 */}
            <div className="absolute inset-0 flex">
              {WHITE_KEYS.map(k => {
                const isActive = activeKeys.has(k.name)
                const kl = wKeyMap[k.midi] || ''
                return (
                  <div
                    key={k.name}
                    data-note={k.name}
                    onPointerDown={() => handleTouchStart(k.name)}
                    onPointerUp={handleTouchEnd}
                    onPointerLeave={handleTouchEnd}
                    className="flex-shrink-0 relative cursor-pointer"
                    style={{
                      width: KEY_W,
                      marginRight: 2,
                      height: '100%',
                      background: isActive ? 'linear-gradient(180deg, #d4d4e0, #b8b8c8)' : 'linear-gradient(180deg, #f2f2f7, #e4e4ec)',
                      boxShadow: isActive ? 'inset 0 2px 8px rgba(0,0,0,0.18)' : '0 2px 6px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.6)',
                      borderRadius: '0 0 6px 6px',
                      borderRight: '1px solid rgba(0,0,0,0.06)',
                      transition: 'background 0.05s',
                    }}
                  >
                    <span className={`absolute bottom-2 left-1/2 -translate-x-1/2 text-[7px] font-mono ${isActive ? 'text-gray-600' : 'text-gray-400/30'}`}>
                      {kl}
                    </span>
                  </div>
                )
              })}
            </div>
            {/* 黑键 */}
            <div className="absolute top-0 left-0 right-0" style={{ height: '62%' }}>
              {ALL_KEYS.filter(k => k.isBlack).map(k => {
                const isActive = activeKeys.has(k.name)
                const left = getBlackKeyLeft(k) * KEY_STEP + Math.round(KEY_W * 0.65)
                const kl = bKeyMap[k.midi]
                return (
                  <div
                    key={k.name}
                    data-note={k.name}
                    onPointerDown={() => handleTouchStart(k.name)}
                    onPointerUp={handleTouchEnd}
                    onPointerLeave={handleTouchEnd}
                    className="absolute z-10 cursor-pointer"
                    style={{
                      left,
                      width: 28,
                      height: '100%',
                      background: isActive ? 'linear-gradient(180deg, #50506a, #383850)' : 'linear-gradient(180deg, #33334a, #1e1e30)',
                      boxShadow: isActive ? 'inset 0 2px 4px rgba(0,0,0,0.5)' : '0 4px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
                      borderRadius: '0 0 5px 5px',
                      border: '1px solid rgba(0,0,0,0.3)',
                      borderTop: 'none',
                      transition: 'background 0.05s',
                    }}
                  >
                    {kl && <span className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[6px] font-mono ${isActive ? 'text-gray-300' : 'text-gray-600/40}'}`}>{kl}</span>}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ───── 波形可视化 ───── */}
      <div className="flex-shrink-0 px-3 py-1 bg-dark-950 border-t border-white/5">
        <canvas
          ref={waveRef}
          className="w-full block"
          style={{ width: '100%', height: '48px' }}
        />
      </div>

      {/* ───── 按键提示 ───── */}
      {currentSong && (
        <div className="flex-shrink-0 px-3 py-2 bg-dark-950 border-t border-white/5">
          <div className="text-[10px] text-gray-500 mb-1.5">{currentSong.name} — 按此演奏</div>
          <div className="text-[13px] text-violet-300 font-mono tracking-wider break-all leading-relaxed">
            {SONG_KEYS[SONGS.indexOf(currentSong)]}
          </div>
        </div>
      )}

      {/* ───── 曲谱列表（始终展示） ───── */}
        <div className="flex-shrink-0 pb-2 px-3 bg-dark-950">
          <div className="pt-1 pb-0.5 text-[10px] text-gray-500 px-1">曲谱 — 点击选曲 · ▶ 播放</div>
          <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {SONGS.map((s, i) =>
              <div key={s.name}
                onClick={() => setCurrentSong(s)}
                className={`flex-shrink-0 cursor-pointer relative text-left px-3 py-2 rounded-xl bg-dark-900/60 border text-[11px] transition-all ${
                  currentSong === s ? 'border-violet-500/40 bg-violet-900/30' : 'border-white/8 text-gray-400 hover:border-white/20 hover:bg-dark-900/80 hover:text-white'
                }`}
              >
                <div className="font-medium pr-6">{s.name}</div>
                {s.author && <div className="text-[9px] text-gray-600 mt-0.5">{s.author}</div>}
                <div className="mt-1 text-[10px] text-violet-400/70 font-mono">{SONG_KEYS[i].slice(0, 22)}{SONG_KEYS[i].length > 22 ? '…' : ''}</div>
                <button
                  onClick={e => { e.stopPropagation(); playSong(s) }}
                  disabled={isPlaying}
                  className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 hover:bg-violet-500/40 text-[11px]"
                  title="播放"
                >▶</button>
              </div>
            )}
          </div>
        </div>

      {/* ───── 底部：音色条 + 控制面板（始终展开） ───── */}
      <div className="flex-shrink-0 pb-safe pb-3 pt-1.5 px-3 bg-dark-950 border-t border-white/5 z-20">
        {/* 音色选择行 */}
        <div
          className="flex gap-1.5 overflow-x-auto items-center px-3 py-1.5 bg-dark-900/85 backdrop-blur-md border border-white/10 rounded-full"
          style={{ scrollbarWidth: 'none', touchAction: 'pan-x' }}
        >
          {VOICES.map(v => (
            <button key={v.id} onClick={e => { e.stopPropagation(); changeVoice(v) }}
              className={`flex-shrink-0 px-2.5 py-1 text-[10px] rounded-full border whitespace-nowrap transition-all ${
                currentVoice.id === v.id
                  ? 'bg-violet-500/20 text-violet-300 border-violet-500/40'
                  : 'text-gray-400 border-white/10 hover:text-white hover:border-white/25'
              }`}
            >{v.name}</button>
          ))}
        </div>

        {/* 控制行：延音 / 录音 / 播放 / 曲谱 */}
        <div className="mt-1.5 flex items-center gap-2 px-3 py-1.5 bg-dark-900/85 backdrop-blur-md border border-white/10 rounded-full flex-wrap" style={{ touchAction: 'pan-y' }}>
          <button onClick={() => setSustainOn(!sustainOn)}
            className={`flex-shrink-0 px-2 py-1 text-[10px] rounded-full border ${
              sustainOn ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'text-gray-400 border-white/10 hover:text-white hover:border-white/25'
            }`}
          >延音{sustainOn ? ' ●' : ''}</button>
          <button onClick={() => toggleRecord()}
            className={`flex-shrink-0 px-2 py-1 text-[10px] rounded-full border ${
              isRecording ? 'bg-red-500/20 text-red-300 border-red-400/40 animate-pulse' : 'text-gray-400 border-white/10 hover:text-white hover:border-white/25'
            }`}
          >{isRecording ? '● 录制中' : '录音'}</button>
          {recordedNotes.length > 0 && (
            <button onClick={playRecording} disabled={isPlaying}
              className="flex-shrink-0 px-2 py-1 text-[10px] rounded-full border border-white/10 text-gray-400 hover:text-violet-300 hover:border-violet-400/30"
            >播放</button>
          )}
          <div className="w-px h-3.5 bg-white/10 flex-shrink-0" />
          <span className="text-[9px] text-gray-500 whitespace-nowrap">
            {isPlaying ? '♪ 演奏中' : isRecording ? '● 录制中' : 'C2–C7'}
          </span>
        </div>
      </div>
    </div>
  )
}

