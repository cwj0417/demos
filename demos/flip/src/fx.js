import { TAU, rand, hsl } from './utils.js'

/**
 * 轻量粒子系统：粒子、冲击波、飘字、镜头震动。
 */
export class FX {
    constructor() {
        this.particles = []
        this.rings = []
        this.texts = []
        this.trauma = 0
    }

    reset() {
        this.particles.length = 0
        this.rings.length = 0
        this.texts.length = 0
        this.trauma = 0
    }

    addTrauma(amount) {
        this.trauma = Math.min(1, this.trauma + amount)
    }

    burst(x, y, hue, count = 14, power = 1) {
        for (let i = 0; i < count; i++) {
            const angle = rand(0, TAU)
            const speed = rand(30, 210) * power
            const life = rand(0.35, 0.9)
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - rand(0, 40),
                size: rand(1.2, 3.4) * Math.min(1.6, power),
                hue: hue + rand(-14, 14),
                life,
                maxLife: life,
                gravity: rand(60, 220),
                drag: rand(0.28, 0.5),
                spark: Math.random() < 0.32
            })
        }
    }

    ring(x, y, hue, { from = 6, to = 60, life = 0.5, width = 2 } = {}) {
        this.rings.push({ x, y, hue, from, to, life, width, age: 0 })
    }

    text(x, y, value, { hue = 190, size = 15, life = 0.9, up = 46 } = {}) {
        this.texts.push({ x, y, value, hue, size, life, up, age: 0 })
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i]
            p.life -= dt
            if (p.life <= 0) {
                this.particles.splice(i, 1)
                continue
            }
            p.vy += p.gravity * dt
            const drag = Math.pow(p.drag, dt)
            p.vx *= drag
            p.vy *= drag
            p.x += p.vx * dt
            p.y += p.vy * dt
        }

        for (let i = this.rings.length - 1; i >= 0; i--) {
            const ring = this.rings[i]
            ring.age += dt
            if (ring.age >= ring.life) this.rings.splice(i, 1)
        }

        for (let i = this.texts.length - 1; i >= 0; i--) {
            const text = this.texts[i]
            text.age += dt
            if (text.age >= text.life) this.texts.splice(i, 1)
        }

        this.trauma = Math.max(0, this.trauma - dt * 1.7)
    }

    shake() {
        const amount = this.trauma * this.trauma * 15
        if (!amount) return { x: 0, y: 0 }
        return { x: rand(-amount, amount), y: rand(-amount, amount) }
    }

    draw(ctx) {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'

        for (const p of this.particles) {
            const t = p.life / p.maxLife
            const alpha = Math.min(1, t * 1.6)
            ctx.strokeStyle = hsl(p.hue, 100, 68, alpha)
            ctx.fillStyle = hsl(p.hue, 100, 70, alpha)
            if (p.spark) {
                ctx.lineWidth = Math.max(0.8, p.size * 0.7)
                ctx.beginPath()
                ctx.moveTo(p.x, p.y)
                ctx.lineTo(p.x - p.vx * 0.028, p.y - p.vy * 0.028)
                ctx.stroke()
            } else {
                ctx.beginPath()
                ctx.arc(p.x, p.y, Math.max(0.4, p.size * t), 0, TAU)
                ctx.fill()
            }
        }

        for (const ring of this.rings) {
            const t = ring.age / ring.life
            const radius = ring.from + (ring.to - ring.from) * (1 - Math.pow(1 - t, 2.6))
            const alpha = (1 - t) * 0.8
            ctx.strokeStyle = hsl(ring.hue, 100, 66, alpha * 0.3)
            ctx.lineWidth = ring.width * 3.5
            ctx.beginPath()
            ctx.arc(ring.x, ring.y, radius, 0, TAU)
            ctx.stroke()
            ctx.strokeStyle = hsl(ring.hue, 100, 74, alpha)
            ctx.lineWidth = ring.width
            ctx.beginPath()
            ctx.arc(ring.x, ring.y, radius, 0, TAU)
            ctx.stroke()
        }

        ctx.restore()

        ctx.save()
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        for (const text of this.texts) {
            const t = text.age / text.life
            const alpha = 1 - t
            const scale = 0.85 + Math.min(1, t * 8) * 0.25
            const y = text.y - text.up * t
            ctx.save()
            ctx.translate(text.x, y)
            ctx.scale(scale, scale)
            ctx.font = `700 ${text.size}px "JetBrains Mono", ui-monospace, monospace`
            ctx.fillStyle = hsl(text.hue, 100, 82, alpha)
            ctx.fillText(text.value, 0, 0)
            ctx.restore()
        }
        ctx.restore()
    }
}
