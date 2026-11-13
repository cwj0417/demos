import {
    W,
    H,
    TAU,
    LAUNCHER,
    PHYS,
    ORB_HUES,
    clamp,
    rand,
    randInt,
    pick,
    shuffle,
    hsl,
    pad,
    storage
} from './utils.js'
import { Ball, Orb } from './entities.js'
import { FX } from './fx.js'

const FIRE_INTERVAL = 0.1
const COMBO_WINDOW = 1.5
const MAX_SHOTS = 5
const SUPPLY_AMMO = 2
const FIELD = { left: 52, right: W - 52, top: 250, bottom: H * 0.84 }

// 不同形状的目标：尺寸与耐久各不相同
const SHAPES = {
    circle: { r: 21, hp: 1 },
    square: { r: 23, hp: 2 },
    triangle: { r: 26, hp: 3 },
    diamond: { r: 16, hp: -1 },
    hexagon: { r: 22, hp: 2 }
}

export class Game {
    constructor(canvas, sfx, ui) {
        this.canvas = canvas
        this.ctx = canvas.getContext('2d')
        this.sfx = sfx
        this.ui = ui
        this.fx = new FX()

        this.state = 'menu'
        this.time = 0
        this.wave = 1
        this.score = 0
        this.displayScore = 0
        this.best = Number(storage.get('superflip.best', 0)) || 0
        this.ammo = 0
        this.maxAmmo = 1
        this.ammoCap = 1
        this.supplyBonus = 0
        this.combo = 0
        this.comboTimer = 0
        this.balls = []
        this.orbs = []
        this.streaming = false
        this.shotsLeft = MAX_SHOTS
        this.maxShots = MAX_SHOTS
        this.volleyDir = { x: 0, y: 1 }
        this.aim = { x: W / 2, y: H * 0.62 }
        this.hasAim = false
        this.fireAcc = 0
        this.recoil = 0
        this.dryTimer = 0

        this.stars = Array.from({ length: 90 }, () => {
            const hue = Math.random() < 0.24 ? rand(175, 210) : 220
            return {
                x: rand(0, W),
                y: rand(0, H),
                r: rand(0.4, 1.6),
                alpha: rand(0.15, 0.7),
                speed: rand(2, 13),
                twinkle: rand(0.4, 1.8),
                phase: rand(0, TAU),
                color: hsl(hue, 100, 82, 1)
            }
        })

        this.buildMenu()
        this.bindEvents()
        this.ui.sync(this)
    }

    get ready() {
        return !this.streaming && this.balls.length === 0
    }

    /* ---------------------------------------------------------------- 流程 */

    startRun() {
        this.state = 'playing'
        this.score = 0
        this.displayScore = 0
        this.combo = 0
        this.comboTimer = 0
        this.supplyBonus = 0
        this.fx.reset()
        this.startWave(1)
        this.ui.hideScreens()
        this.ui.toast('WAVE 01', '清空全部能量球')
        this.sfx.start()
    }

    startWave(wave) {
        this.wave = wave
        this.balls = []
        this.ammoCap = this.spawnWave(wave) + this.supplyBonus
        this.ammo = this.ammoCap
        this.maxAmmo = this.ammoCap
        this.shotsLeft = MAX_SHOTS
        this.combo = 0
        this.comboTimer = 0
        this.streaming = false
        this.volleyDir = { x: 0, y: 1 }
        this.fireAcc = 0
        this.recoil = 0
        this.dryTimer = 0
        this.ui.sync(this)
    }

    nextWave() {
        if (this.state !== 'clear') return
        this.state = 'playing'
        this.ui.hideScreens()
        this.startWave(this.wave + 1)
        this.ui.toast(`WAVE ${pad(this.wave)}`, `能量球 ×${this.orbs.length}`)
        this.sfx.wave()
    }

    onWaveClear() {
        this.state = 'clear'
        this.streaming = false
        const bonus = 250 * this.wave + this.shotsLeft * 150
        this.addScore(bonus)
        this.best = Math.max(this.best, this.score)
        this.saveBest()
        this.sfx.clear()
        this.fx.addTrauma(0.3)
        for (let i = 0; i < 9; i++) {
            this.fx.burst(rand(60, W - 60), rand(150, H * 0.62), pick(ORB_HUES), 10, 1.15)
            this.fx.ring(rand(80, W - 80), rand(160, H * 0.6), pick(ORB_HUES), { from: 4, to: 70, life: 0.7 })
        }
        this.ui.showClear({
            wave: this.wave,
            shots: this.shotsLeft,
            bonus,
            score: this.score
        })
        this.ui.sync(this)
    }

    onGameOver() {
        this.state = 'over'
        this.streaming = false
        this.hasAim = false
        this.best = Math.max(this.best, this.score)
        this.saveBest()
        this.sfx.over()
        this.fx.addTrauma(0.55)
        this.fx.burst(LAUNCHER.x, LAUNCHER.y + 10, 8, 26, 1.4)
        this.fx.ring(LAUNCHER.x, LAUNCHER.y + 10, 8, { from: 8, to: 120, life: 0.7, width: 2.5 })
        this.ui.showOver({
            score: this.score,
            best: this.best,
            wave: this.wave
        })
        this.ui.sync(this)
    }

    addScore(amount) {
        this.score += amount
        if (this.score > this.best) this.best = this.score
    }

    saveBest() {
        storage.set('superflip.best', this.best)
    }

    /* ---------------------------------------------------------------- 生成 */

    buildMenu() {
        const spots = [
            [100, 300, 187],
            [330, 292, 316],
            [214, 392, 264],
            [104, 486, 88],
            [330, 486, 24]
        ]
        this.orbs = spots.map(([x, y, hue], index) => new Orb({
            x,
            y,
            r: 23,
            hp: 2,
            hue,
            vx: Math.cos(index * 1.7) * 9,
            vy: Math.sin(index * 2.1) * 7
        }))
    }

    spawnWave(wave) {
        const count = Math.min(3 + wave, 7)
        const baseHp = Math.min(8, 4 + Math.ceil(wave / 2))
        const hues = shuffle(ORB_HUES)
        const shapes = shuffle(wave >= 3
            ? ['circle', 'square', 'triangle', 'diamond', 'hexagon']
            : ['circle', 'square', 'triangle', 'diamond'])
        const cols = 3
        const total = count + 1
        const rows = Math.ceil(total / cols)

        const cells = []
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                cells.push([col, row])
            }
        }
        shuffle(cells)

        const cellW = (FIELD.right - FIELD.left) / cols
        const cellH = (FIELD.bottom - FIELD.top) / rows
        const supplyIndex = randInt(0, total - 1)

        // 每关最多只有 2 个目标会移动
        const moverIndices = new Set()
        const moverCount = wave >= 2 ? Math.min(2, count) : 0
        if (moverCount > 0) {
            const candidates = []
            for (let i = 0; i < total; i++) {
                if (i !== supplyIndex) candidates.push(i)
            }
            shuffle(candidates)
            for (let i = 0; i < moverCount; i++) moverIndices.add(candidates[i])
        }

        this.orbs = []
        let shapeCursor = 0

        for (let i = 0; i < total; i++) {
            const [col, row] = cells[i]
            const x = FIELD.left + cellW * (col + 0.5) + rand(-9, 9)
            const y = FIELD.top + cellH * (row + 0.5) + rand(-8, 8)
            const supply = i === supplyIndex
            const shape = supply ? 'circle' : shapes[shapeCursor++ % shapes.length]
            const config = SHAPES[shape]
            const drifting = moverIndices.has(i)
            const speed = drifting ? rand(16, 26 + wave * 3) * (shape === 'diamond' ? 1.35 : 1) : 0
            const angle = rand(0, TAU)
            const orb = new Orb({
                x,
                y,
                r: supply ? 17 : config.r,
                hp: supply ? 1 : Math.max(2, baseHp + config.hp),
                hue: supply ? 43 : hues[i % hues.length],
                supply,
                shape,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed
            })
            this.orbs.push(orb)
        }

        return Math.min(16, 6 + wave)
    }

    /* ---------------------------------------------------------------- 更新 */

    update(dt) {
        this.time += dt
        this.fx.update(dt)
        this.recoil *= Math.exp(-dt * 9)

        for (const star of this.stars) {
            star.y += star.speed * dt
            if (star.y > H + 4) {
                star.y = -4
                star.x = rand(0, W)
            }
        }

        if (this.score !== this.displayScore) {
            const delta = this.score - this.displayScore
            this.displayScore = Math.abs(delta) < 1 ? this.score : this.displayScore + delta * Math.min(1, dt * 12)
        }

        if (this.state === 'menu') {
            for (const orb of this.orbs) orb.update(dt, FIELD)
        }

        if (this.state === 'playing' || this.state === 'clear') {
            for (const orb of this.orbs) orb.update(dt, FIELD)
            this.updateVolley(dt)
            this.updateBalls(dt)
            this.orbs = this.orbs.filter(orb => orb.alive)
        }

        if (this.state === 'playing') {
            if (this.comboTimer > 0) {
                this.comboTimer -= dt
                if (this.comboTimer <= 0) this.combo = 0
            }
            // 一轮射击全部结束后才回复弹药，而不是逐颗落球返还
            if (this.ready && this.shotsLeft > 0 && this.ammo < this.ammoCap) {
                this.ammo = this.ammoCap
            }
            this.checkOutcome(dt)
        }

        this.ui.sync(this)
    }

    updateVolley(dt) {
        if (!this.streaming) return
        if (this.ammo <= 0) {
            this.streaming = false
            return
        }
        this.fireAcc += dt
        while (this.fireAcc >= FIRE_INTERVAL && this.ammo > 0) {
            this.fireAcc -= FIRE_INTERVAL
            this.fire()
        }
        if (this.ammo <= 0) this.streaming = false
    }

    updateBalls(dt) {
        if (!this.balls.length) return
        const steps = clamp(Math.ceil(dt / (1 / 120)), 1, 4)
        const stepDt = dt / steps

        for (let step = 0; step < steps; step++) {
            for (const ball of this.balls) {
                ball.update(stepDt)
                this.collideWalls(ball)
                if (this.state === 'playing') this.collideOrbs(ball)
            }
        }

        this.balls = this.balls.filter(ball => ball.y < H + 50)
    }

    collideWalls(ball) {
        const speed = Math.hypot(ball.vx, ball.vy)
        if (ball.x < ball.r) {
            ball.x = ball.r
            ball.vx = Math.abs(ball.vx)
            this.sfx.bounce(speed)
        } else if (ball.x > W - ball.r) {
            ball.x = W - ball.r
            ball.vx = -Math.abs(ball.vx)
            this.sfx.bounce(speed)
        }
        if (ball.y < ball.r) {
            ball.y = ball.r
            ball.vy = Math.abs(ball.vy)
            this.sfx.bounce(speed)
        }
    }

    collideOrbs(ball) {
        for (const orb of this.orbs) {
            if (!orb.alive) continue
            // 先用外接圆做粗筛，避免对远处目标做多边形计算
            const dx = ball.x - orb.x
            const dy = ball.y - orb.y
            const reach = ball.r + orb.r
            if (dx * dx + dy * dy > reach * reach) continue

            const contact = orb.contact(ball.x, ball.y, ball.r)
            if (!contact) continue

            ball.x += contact.nx * contact.overlap
            ball.y += contact.ny * contact.overlap

            const dot = ball.vx * contact.nx + ball.vy * contact.ny
            if (dot < 0) {
                ball.vx -= 2 * dot * contact.nx
                ball.vy -= 2 * dot * contact.ny
            }

            if (!ball.hitCooldowns.has(orb.id)) {
                ball.hitCooldowns.set(orb.id, 0.09)
                this.hitOrb(orb, ball)
            }
        }
    }

    hitOrb(orb, ball) {
        this.combo += 1
        this.comboTimer = COMBO_WINDOW
        const multiplier = Math.min(this.combo, 10)

        const destroyed = orb.hurt(1)
        const gain = (orb.supply ? 40 : 10) * multiplier
        this.addScore(gain)

        this.fx.burst(ball.x, ball.y, orb.color, 7, 0.75)
        this.fx.ring(ball.x, ball.y, orb.color, { from: 2, to: 26, life: 0.32, width: 1.6 })
        this.fx.text(ball.x, ball.y - 10, `+${gain}`, { hue: orb.color, size: 13, life: 0.7, up: 36 })
        this.fx.addTrauma(0.12)
        this.sfx.hit(this.combo)

        if (destroyed) {
            this.breakOrb(orb)
        }
    }

    breakOrb(orb) {
        const multiplier = Math.min(this.combo, 10)
        const bonus = (orb.supply ? 150 : 60) * multiplier
        this.addScore(bonus)

        const hue = orb.color
        this.fx.burst(orb.x, orb.y, hue, orb.supply ? 30 : 22, 1.4)
        this.fx.ring(orb.x, orb.y, hue, { from: orb.r * 0.5, to: orb.r * 4, life: 0.55, width: 2.5 })
        this.fx.text(orb.x, orb.y + 8, `+${bonus}`, {
            hue,
            size: orb.supply ? 20 : 16,
            life: 1,
            up: 50
        })
        this.fx.addTrauma(orb.supply ? 0.4 : 0.28)
        this.sfx.breakOrb(orb.supply)

        if (orb.supply) {
            this.supplyBonus += SUPPLY_AMMO
            this.ammoCap += SUPPLY_AMMO
            this.maxAmmo = this.ammoCap
            this.ammo += SUPPLY_AMMO
            this.fx.text(orb.x, orb.y - 32, `+${SUPPLY_AMMO} AMMO`, { hue: 43, size: 12, life: 1.1, up: 42 })
        }
    }

    checkOutcome(dt) {
        if (!this.orbs.length) {
            this.onWaveClear()
            return
        }
        if (this.shotsLeft <= 0 && this.ready) {
            this.dryTimer += dt
            if (this.dryTimer > 0.8) this.onGameOver()
        } else {
            this.dryTimer = 0
        }
    }

    /* ---------------------------------------------------------------- 输入 */

    bindEvents() {
        const canvas = this.canvas

        canvas.addEventListener('pointerdown', event => {
            if (this.state !== 'playing') return
            event.preventDefault()
            this.updateAim(event)
            this.hasAim = true
            if (!this.ready) return
            if (this.shotsLeft <= 0 || this.ammo <= 0) {
                this.sfx.empty()
                return
            }
            this.beginVolley()
        })

        canvas.addEventListener('pointermove', event => {
            if (this.state !== 'playing') return
            this.updateAim(event)
            this.hasAim = true
        })

        canvas.addEventListener('pointerleave', () => {
            this.hasAim = false
        })

        canvas.addEventListener('contextmenu', event => event.preventDefault())
    }

    updateAim(event) {
        const rect = this.canvas.getBoundingClientRect()
        this.aim.x = clamp(((event.clientX - rect.left) / rect.width) * W, 0, W)
        this.aim.y = clamp(((event.clientY - rect.top) / rect.height) * H, LAUNCHER.y + 36, H - 16)
    }

    aimVector() {
        let dx = this.aim.x - LAUNCHER.x
        let dy = this.aim.y - LAUNCHER.y
        // 发射器在顶部，只能向下射击
        if (dy < 60) dy = 60
        const length = Math.hypot(dx, dy) || 1
        return { x: dx / length, y: dy / length }
    }

    beginVolley() {
        this.volleyDir = this.aimVector()
        this.shotsLeft = Math.max(0, this.shotsLeft - 1)
        this.streaming = true
        this.fireAcc = 0
        this.dryTimer = 0
        this.fire()
        this.ui.sync(this)
    }

    fire() {
        if (this.ammo <= 0) return
        const dir = this.volleyDir
        const spread = rand(-0.024, 0.024)
        const cos = Math.cos(spread)
        const sin = Math.sin(spread)
        const speed = PHYS.ballSpeed
        const vx = (dir.x * cos - dir.y * sin) * speed
        const vy = (dir.x * sin + dir.y * cos) * speed

        this.balls.push(new Ball(
            LAUNCHER.x + dir.x * 14,
            LAUNCHER.y + 6 + dir.y * 14,
            vx,
            vy
        ))
        this.ammo -= 1
        this.recoil = 1
        this.fx.burst(LAUNCHER.x + dir.x * 22, LAUNCHER.y + 6 + dir.y * 22, 186, 4, 0.5)
        this.fx.addTrauma(0.03)
        this.sfx.shoot()
        this.ui.sync(this)
    }

    /* ---------------------------------------------------------------- 渲染 */

    draw() {
        const ctx = this.ctx
        const scaleX = this.canvas.width / W
        const scaleY = this.canvas.height / H
        ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0)
        ctx.clearRect(0, 0, W, H)

        this.drawBackground(ctx)

        const shake = this.fx.shake()
        ctx.save()
        ctx.translate(shake.x, shake.y)

        this.drawAim(ctx)
        for (const orb of this.orbs) orb.draw(ctx, this.time)
        this.drawLauncher(ctx)
        for (const ball of this.balls) ball.draw(ctx)
        this.fx.draw(ctx)

        ctx.restore()
    }

    drawBackground(ctx) {
        const base = ctx.createLinearGradient(0, 0, 0, H)
        base.addColorStop(0, '#070a18')
        base.addColorStop(0.55, '#050713')
        base.addColorStop(1, '#080b1a')
        ctx.fillStyle = base
        ctx.fillRect(0, 0, W, H)

        ctx.save()
        ctx.globalCompositeOperation = 'lighter'

        const driftX = Math.sin(this.time * 0.18) * 36
        const driftY = Math.cos(this.time * 0.15) * 26
        const auroraA = ctx.createRadialGradient(W * 0.22 + driftX, H * 0.2 + driftY, 10, W * 0.22, H * 0.2, W * 0.62)
        auroraA.addColorStop(0, 'rgba(52, 122, 255, 0.16)')
        auroraA.addColorStop(0.6, 'rgba(52, 122, 255, 0.04)')
        auroraA.addColorStop(1, 'rgba(52, 122, 255, 0)')
        ctx.fillStyle = auroraA
        ctx.fillRect(0, 0, W, H)

        const auroraB = ctx.createRadialGradient(W * 0.88 - driftX, H * 0.62 - driftY, 10, W * 0.88, H * 0.62, W * 0.55)
        auroraB.addColorStop(0, 'rgba(255, 62, 196, 0.13)')
        auroraB.addColorStop(0.6, 'rgba(255, 62, 196, 0.03)')
        auroraB.addColorStop(1, 'rgba(255, 62, 196, 0)')
        ctx.fillStyle = auroraB
        ctx.fillRect(0, 0, W, H)

        const floorGlow = ctx.createRadialGradient(W / 2, H - 30, 8, W / 2, H - 30, 230)
        floorGlow.addColorStop(0, 'rgba(48, 224, 255, 0.14)')
        floorGlow.addColorStop(1, 'rgba(48, 224, 255, 0)')
        ctx.fillStyle = floorGlow
        ctx.fillRect(0, H * 0.55, W, H * 0.45)
        ctx.restore()

        // 细网格
        ctx.save()
        ctx.strokeStyle = 'rgba(128, 168, 255, 0.045)'
        ctx.lineWidth = 1
        ctx.beginPath()
        for (let x = 22; x < W; x += 44) {
            ctx.moveTo(x, 0)
            ctx.lineTo(x, H)
        }
        for (let y = 40; y < H; y += 44) {
            ctx.moveTo(0, y)
            ctx.lineTo(W, y)
        }
        ctx.stroke()
        ctx.restore()

        // 星尘
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        for (const star of this.stars) {
            const twinkle = 0.55 + 0.45 * Math.sin(this.time * star.twinkle + star.phase)
            ctx.globalAlpha = star.alpha * twinkle
            ctx.fillStyle = star.color
            ctx.beginPath()
            ctx.arc(star.x, star.y, star.r, 0, TAU)
            ctx.fill()
        }
        ctx.restore()
    }

    drawAim(ctx) {
        if (this.state !== 'playing' || !this.hasAim) return

        const ready = this.ready
        const dir = ready ? this.aimVector() : this.volleyDir
        const fade = ready ? 1 : 0.35
        let x = LAUNCHER.x
        let y = LAUNCHER.y + 14
        let vx = dir.x * PHYS.ballSpeed
        let vy = dir.y * PHYS.ballSpeed
        const dt = 1 / 90

        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        for (let i = 0; i < 96; i++) {
            vy += PHYS.gravity * dt
            x += vx * dt
            y += vy * dt

            if (x < PHYS.ballRadius) {
                x = PHYS.ballRadius
                vx = Math.abs(vx)
            } else if (x > W - PHYS.ballRadius) {
                x = W - PHYS.ballRadius
                vx = -Math.abs(vx)
            }
            if (y < PHYS.ballRadius) {
                y = PHYS.ballRadius
                vy = Math.abs(vy)
            }
            if (y > H - 30) break

            if (i % 4 === 0) {
                const alpha = (1 - i / 96) * 0.62 * fade
                ctx.fillStyle = hsl(186, 100, 74, alpha)
                ctx.beginPath()
                ctx.arc(x, y, 1.9, 0, TAU)
                ctx.fill()
            }
        }

        if (!ready) {
            ctx.restore()
            return
        }

        // 准星
        const reticleAlpha = 0.55 + Math.sin(this.time * 5) * 0.12
        ctx.strokeStyle = hsl(186, 100, 74, reticleAlpha)
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.arc(this.aim.x, this.aim.y, 9, 0, TAU)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(this.aim.x - 15, this.aim.y)
        ctx.lineTo(this.aim.x - 6, this.aim.y)
        ctx.moveTo(this.aim.x + 6, this.aim.y)
        ctx.lineTo(this.aim.x + 15, this.aim.y)
        ctx.moveTo(this.aim.x, this.aim.y - 15)
        ctx.lineTo(this.aim.x, this.aim.y - 6)
        ctx.moveTo(this.aim.x, this.aim.y + 6)
        ctx.lineTo(this.aim.x, this.aim.y + 15)
        ctx.stroke()
        ctx.restore()
    }

    drawLauncher(ctx) {
        const dir = this.ready && this.hasAim ? this.aimVector() : this.volleyDir
        const hue = this.shotsLeft > 0 ? 186 : 2
        const kick = this.recoil * 7
        const x = LAUNCHER.x - dir.x * kick
        const y = LAUNCHER.y - dir.y * kick

        ctx.save()
        ctx.globalCompositeOperation = 'lighter'

        const glow = ctx.createRadialGradient(x, y, 4, x, y, 64)
        glow.addColorStop(0, hsl(hue, 100, 65, 0.26))
        glow.addColorStop(0.5, hsl(hue, 100, 55, 0.08))
        glow.addColorStop(1, hsl(hue, 100, 50, 0))
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(x, y, 64, 0, TAU)
        ctx.fill()

        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(this.time * 0.6)
        ctx.setLineDash([3, 10])
        ctx.strokeStyle = hsl(hue, 100, 70, 0.4)
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.arc(0, 0, 29, 0, TAU)
        ctx.stroke()
        ctx.restore()

        ctx.strokeStyle = hsl(hue, 100, 72, 0.55)
        ctx.lineWidth = 1.4
        ctx.beginPath()
        ctx.arc(x, y, 18, 0, TAU)
        ctx.stroke()

        // 炮管
        ctx.strokeStyle = hsl(hue, 100, 76, 0.9)
        ctx.lineWidth = 4
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + dir.x * 24, y + dir.y * 24)
        ctx.stroke()

        const core = ctx.createRadialGradient(x, y, 1, x, y, 12)
        core.addColorStop(0, '#ffffff')
        core.addColorStop(0.4, hsl(hue, 100, 76, 0.95))
        core.addColorStop(1, hsl(hue, 100, 52, 0.1))
        ctx.fillStyle = core
        ctx.beginPath()
        ctx.arc(x, y, 12, 0, TAU)
        ctx.fill()

        ctx.restore()
    }
}
