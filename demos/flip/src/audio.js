import { storage } from './utils.js'

/**
 * 用 WebAudio 实时合成音效，不依赖任何音频资源文件。
 */
export class Sound {
    constructor() {
        this.muted = storage.get('superflip.muted', '0') === '1'
        this.ctx = null
        this.master = null
        this.lastBounce = 0
        this.lastHit = 0
    }

    ensure() {
        if (this.muted) return
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext
            if (!AudioCtx) return
            this.ctx = new AudioCtx()
            this.master = this.ctx.createGain()
            this.master.gain.value = 0.34
            this.master.connect(this.ctx.destination)
        }
        if (this.ctx.state === 'suspended') this.ctx.resume()
    }

    toggle() {
        this.muted = !this.muted
        storage.set('superflip.muted', this.muted ? '1' : '0')
        if (!this.muted) {
            this.ensure()
            this.tone({ freq: 660, end: 990, dur: 0.1, vol: 0.12, type: 'sine' })
        }
        return this.muted
    }

    tone({ freq, end, dur = 0.12, type = 'sine', vol = 0.15, delay = 0 }) {
        if (this.muted) return
        this.ensure()
        if (!this.ctx) return
        const t0 = this.ctx.currentTime + delay
        const osc = this.ctx.createOscillator()
        const gain = this.ctx.createGain()
        osc.type = type
        osc.frequency.setValueAtTime(freq, t0)
        if (end) osc.frequency.exponentialRampToValueAtTime(Math.max(30, end), t0 + dur)
        gain.gain.setValueAtTime(0.0001, t0)
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + Math.min(0.012, dur * 0.35))
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
        osc.connect(gain)
        gain.connect(this.master)
        osc.start(t0)
        osc.stop(t0 + dur + 0.03)
    }

    noise({ dur = 0.2, vol = 0.18, freq = 900, q = 0.9, delay = 0 }) {
        if (this.muted) return
        this.ensure()
        if (!this.ctx) return
        const t0 = this.ctx.currentTime + delay
        const length = Math.max(1, Math.floor(this.ctx.sampleRate * dur))
        const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate)
        const data = buffer.getChannelData(0)
        for (let i = 0; i < length; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / length)
        }
        const source = this.ctx.createBufferSource()
        source.buffer = buffer
        const filter = this.ctx.createBiquadFilter()
        filter.type = 'bandpass'
        filter.frequency.value = freq
        filter.Q.value = q
        const gain = this.ctx.createGain()
        gain.gain.value = vol
        source.connect(filter)
        filter.connect(gain)
        gain.connect(this.master)
        source.start(t0)
    }

    start() {
        if (this.muted) return
        this.ensure()
        this.tone({ freq: 330, end: 660, dur: 0.16, type: 'triangle', vol: 0.16 })
        this.tone({ freq: 494, end: 988, dur: 0.2, type: 'triangle', vol: 0.12, delay: 0.09 })
        this.tone({ freq: 660, dur: 0.28, type: 'sine', vol: 0.1, delay: 0.18 })
    }

    shoot() {
        this.tone({ freq: 760, end: 380, dur: 0.05, type: 'square', vol: 0.035 })
    }

    bounce(speed) {
        if (this.muted) return
        const now = performance.now()
        if (now - this.lastBounce < 45) return
        this.lastBounce = now
        const freq = 240 + Math.min(220, speed * 0.16)
        this.tone({ freq, dur: 0.035, type: 'triangle', vol: 0.04 })
    }

    hit(combo) {
        if (this.muted) return
        const now = performance.now()
        if (now - this.lastHit < 28) return
        this.lastHit = now
        const freq = 392 * Math.pow(1.0595, Math.min(combo, 14))
        this.tone({ freq, dur: 0.1, type: 'sine', vol: 0.11 })
        this.tone({ freq: freq * 1.5, dur: 0.08, type: 'triangle', vol: 0.04 })
    }

    breakOrb(golden = false) {
        this.noise({ dur: 0.22, vol: 0.14, freq: golden ? 2600 : 1100, q: 0.8 })
        this.tone({ freq: golden ? 330 : 220, end: 70, dur: 0.26, type: 'sawtooth', vol: 0.09 })
        if (golden) this.gold()
    }

    gold() {
        const notes = [880, 1174, 1568]
        notes.forEach((freq, i) => {
            this.tone({ freq, dur: 0.16, type: 'triangle', vol: 0.1, delay: i * 0.06 })
        })
    }

    clear() {
        const notes = [523, 659, 784, 1047]
        notes.forEach((freq, i) => {
            this.tone({ freq, dur: 0.22, type: 'triangle', vol: 0.11, delay: i * 0.085 })
        })
    }

    wave() {
        const notes = [392, 523, 659]
        notes.forEach((freq, i) => {
            this.tone({ freq, dur: 0.14, type: 'sine', vol: 0.09, delay: i * 0.07 })
        })
    }

    over() {
        const notes = [440, 349, 262, 175]
        notes.forEach((freq, i) => {
            this.tone({ freq, end: freq * 0.92, dur: 0.28, type: 'triangle', vol: 0.1, delay: i * 0.14 })
        })
        this.noise({ dur: 0.5, vol: 0.05, freq: 300, q: 0.6, delay: 0.1 })
    }

    empty() {
        this.tone({ freq: 180, end: 120, dur: 0.08, type: 'square', vol: 0.03 })
    }
}
