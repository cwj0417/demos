import { Game } from './game.js'
import { Sound } from './audio.js'
import { W, H, formatScore, pad, clamp } from './utils.js'

const canvas = document.getElementById('game')

function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const width = Math.round(W * dpr)
    const height = Math.round(H * dpr)
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
    }
}

resizeCanvas()
window.addEventListener('resize', resizeCanvas)

class UI {
    constructor(sfx) {
        this.sfx = sfx
        this.game = null
        this.lastCombo = 0
        this.lastScore = -1
        this.lastWave = -1
        this.lastAmmo = -1
        this.lastMaxAmmo = -1
        this.lastShots = -1
        this.lastPopAt = 0
        this.toastTimer = null

        const $ = id => document.getElementById(id)
        this.el = {
            hud: document.querySelector('.hud'),
            score: $('score'),
            wave: $('wave'),
            combo: $('combo'),
            ammo: $('ammo'),
            ammoFill: $('ammoFill'),
            ammoCount: $('ammoCount'),
            shotsPips: Array.from(document.querySelectorAll('#shotsPips i')),
            screens: [$('screenStart'), $('screenClear'), $('screenOver')],
            screenStart: $('screenStart'),
            screenClear: $('screenClear'),
            screenOver: $('screenOver'),
            clearWave: $('clearWave'),
            clearScore: $('clearScore'),
            clearAmmo: $('clearAmmo'),
            clearBonus: $('clearBonus'),
            overScore: $('overScore'),
            overBest: $('overBest'),
            overWave: $('overWave'),
            bestStart: $('bestStart'),
            soundBtn: $('soundBtn'),
            toast: $('toast'),
            toastTitle: $('toastTitle'),
            toastSub: $('toastSub'),
            startBtn: $('startBtn'),
            nextBtn: $('nextBtn'),
            retryBtn: $('retryBtn')
        }
    }

    attach(game) {
        this.game = game
        this.el.bestStart.textContent = formatScore(game.best)

        this.el.startBtn.addEventListener('click', () => {
            this.sfx.ensure()
            game.startRun()
        })
        this.el.nextBtn.addEventListener('click', () => game.nextWave())
        this.el.retryBtn.addEventListener('click', () => game.startRun())
        this.el.soundBtn.addEventListener('click', () => this.toggleSound())
        this.syncSoundButton()
    }

    toggleSound() {
        const muted = this.sfx.toggle()
        this.syncSoundButton(muted)
    }

    syncSoundButton(muted = this.sfx.muted) {
        const button = this.el.soundBtn
        button.classList.toggle('is-muted', muted)
        button.setAttribute('aria-label', muted ? '开启音效' : '静音')
        button.title = muted ? '开启音效' : '静音'
    }

    sync(game) {
        const score = formatScore(game.displayScore)
        if (score !== this.lastScore) {
            this.el.score.textContent = score
            this.lastScore = score
        }

        if (game.wave !== this.lastWave) {
            this.el.wave.textContent = pad(game.wave)
            this.lastWave = game.wave
        }

        if (game.shotsLeft !== this.lastShots) {
            this.el.shotsPips.forEach((pip, index) => {
                pip.classList.toggle('is-used', index >= game.shotsLeft)
            })
            this.lastShots = game.shotsLeft
        }

        if (game.ammo !== this.lastAmmo || game.maxAmmo !== this.lastMaxAmmo) {
            this.el.ammoCount.textContent = String(game.ammo)
            const percent = clamp((game.ammo / Math.max(1, game.maxAmmo)) * 100, 0, 100)
            this.el.ammoFill.style.width = `${percent}%`
            this.el.ammo.classList.toggle('is-low', game.ammo <= 3)
            this.lastAmmo = game.ammo
            this.lastMaxAmmo = game.maxAmmo
        }

        const comboOn = game.state === 'playing' && game.combo >= 2
        this.el.combo.classList.toggle('is-on', comboOn)
        if (comboOn) {
            this.el.combo.textContent = `×${Math.min(game.combo, 10)}`
            if (game.combo > this.lastCombo && game.time - this.lastPopAt > 0.14) {
                this.el.combo.classList.remove('pop')
                void this.el.combo.offsetWidth
                this.el.combo.classList.add('pop')
                this.lastPopAt = game.time
            }
        }
        this.lastCombo = comboOn ? game.combo : 0

        this.el.hud.classList.toggle('is-hidden', game.state === 'menu')
    }

    hideScreens() {
        for (const screen of this.el.screens) screen.classList.remove('is-visible')
    }

    show(screen) {
        for (const item of this.el.screens) item.classList.toggle('is-visible', item === screen)
    }

    showClear({ wave, shots, bonus, score }) {
        this.el.clearWave.textContent = pad(wave)
        this.el.clearScore.textContent = formatScore(score)
        this.el.clearAmmo.textContent = String(shots)
        this.el.clearBonus.textContent = `+${formatScore(bonus)}`
        this.show(this.el.screenClear)
    }

    showOver({ score, best, wave }) {
        this.el.overScore.textContent = formatScore(score)
        this.el.overBest.textContent = formatScore(best)
        this.el.overWave.textContent = pad(wave)
        this.el.bestStart.textContent = formatScore(best)
        this.show(this.el.screenOver)
    }

    toast(title, sub = '') {
        const { toast, toastTitle, toastSub } = this.el
        toastTitle.textContent = title
        toastSub.textContent = sub
        clearTimeout(this.toastTimer)
        toast.classList.remove('is-on')
        void toast.offsetWidth
        toast.classList.add('is-on')
        this.toastTimer = setTimeout(() => toast.classList.remove('is-on'), 1600)
    }
}

const sfx = new Sound()
const ui = new UI(sfx)
const game = new Game(canvas, sfx, ui)
ui.attach(game)
window.__superflipBooted = true

let lastTime = performance.now()

function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000))
    lastTime = now
    game.update(dt)
    game.draw()
    requestAnimationFrame(frame)
}

document.addEventListener('visibilitychange', () => {
    lastTime = performance.now()
})

requestAnimationFrame(frame)
