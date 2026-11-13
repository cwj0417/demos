import { PHYS, TAU, hsl, rand, clamp } from './utils.js'

export class Ball {
    constructor(x, y, vx, vy, hue = 186) {
        this.x = x
        this.y = y
        this.vx = vx
        this.vy = vy
        this.r = PHYS.ballRadius
        this.hue = hue
        this.trail = []
        this.hitCooldowns = new Map()
    }

    update(dt) {
        this.vy += PHYS.gravity * dt
        const speed = Math.hypot(this.vx, this.vy)
        if (speed > PHYS.maxSpeed) {
            const scale = PHYS.maxSpeed / speed
            this.vx *= scale
            this.vy *= scale
        }
        this.x += this.vx * dt
        this.y += this.vy * dt

        for (const [id, timer] of this.hitCooldowns) {
            const next = timer - dt
            if (next <= 0) this.hitCooldowns.delete(id)
            else this.hitCooldowns.set(id, next)
        }

        const last = this.trail[this.trail.length - 1]
        if (!last || Math.hypot(this.x - last.x, this.y - last.y) > 6) {
            this.trail.push({ x: this.x, y: this.y })
            if (this.trail.length > 12) this.trail.shift()
        }
    }

    draw(ctx) {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'

        ctx.fillStyle = hsl(this.hue, 100, 66, 1)
        const total = this.trail.length
        for (let i = 0; i < total; i++) {
            const point = this.trail[i]
            const t = (i + 1) / total
            ctx.globalAlpha = 0.05 + t * 0.16
            ctx.beginPath()
            ctx.arc(point.x, point.y, this.r * (0.25 + t * 0.75), 0, TAU)
            ctx.fill()
        }
        ctx.globalAlpha = 1

        // 用多层半透明圆代替 shadowBlur，降低绘制开销
        ctx.fillStyle = hsl(this.hue, 100, 62, 0.1)
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.r * 3.2, 0, TAU)
        ctx.fill()

        ctx.fillStyle = hsl(this.hue, 100, 68, 0.22)
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.r * 2, 0, TAU)
        ctx.fill()

        ctx.fillStyle = '#f2feff'
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.r, 0, TAU)
        ctx.fill()

        ctx.fillStyle = hsl(this.hue, 100, 78, 0.95)
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.r * 0.52, 0, TAU)
        ctx.fill()

        ctx.restore()
    }
}

let nextOrbId = 1

const SHAPE_SIDES = { triangle: 3, square: 4, diamond: 4, hexagon: 6 }
const SHAPE_OFFSET = { triangle: -Math.PI / 2, square: Math.PI / 4, diamond: 0, hexagon: 0 }

export class Orb {
    constructor({ x, y, r = 22, hp = 2, hue = 187, supply = false, shape = 'circle', vx = 0, vy = 0 }) {
        this.id = nextOrbId++
        this.x = x
        this.y = y
        this.r = r
        this.hp = hp
        this.maxHp = hp
        this.hue = hue
        this.supply = supply
        this.shape = shape
        this.vx = vx
        this.vy = vy
        this.phase = rand(0, TAU)
        this.flash = 0
        this.pop = 0
        this.alive = true

        const sides = SHAPE_SIDES[shape]
        this.verts = sides
            ? Array.from({ length: sides }, (_, i) => {
                const angle = SHAPE_OFFSET[shape] + (TAU / sides) * i
                return { x: Math.cos(angle) * r, y: Math.sin(angle) * r }
            })
            : null
    }

    get color() {
        return this.supply ? 43 : this.hue
    }

    /**
     * 计算弹球与目标的接触信息，支持圆形与多边形。
     * 返回 null 表示未接触，否则返回推出方向与重叠距离。
     */
    contact(px, py, radius) {
        if (!this.verts) {
            const dx = px - this.x
            const dy = py - this.y
            const distance = Math.hypot(dx, dy)
            const min = radius + this.r
            if (distance >= min) return null
            const nx = distance > 0.001 ? dx / distance : 0
            const ny = distance > 0.001 ? dy / distance : -1
            return { nx, ny, overlap: min - distance }
        }

        const verts = this.verts
        let minDistance = Infinity
        let closestX = 0
        let closestY = 0
        let inside = true
        let edgeSign = 0

        for (let i = 0; i < verts.length; i++) {
            const a = verts[i]
            const b = verts[(i + 1) % verts.length]
            const ax = this.x + a.x
            const ay = this.y + a.y
            const bx = this.x + b.x
            const by = this.y + b.y
            const ex = bx - ax
            const ey = by - ay

            const cross = ex * (py - ay) - ey * (px - ax)
            if (cross !== 0) {
                const sign = Math.sign(cross)
                if (edgeSign === 0) edgeSign = sign
                else if (sign !== edgeSign) inside = false
            }

            const t = clamp(((px - ax) * ex + (py - ay) * ey) / (ex * ex + ey * ey), 0, 1)
            const qx = ax + ex * t
            const qy = ay + ey * t
            const distance = Math.hypot(px - qx, py - qy)
            if (distance < minDistance) {
                minDistance = distance
                closestX = qx
                closestY = qy
            }
        }

        if (!inside) {
            if (minDistance >= radius) return null
            const nx = minDistance > 0.001 ? (px - closestX) / minDistance : 0
            const ny = minDistance > 0.001 ? (py - closestY) / minDistance : -1
            return { nx, ny, overlap: radius - minDistance }
        }

        // 球心已进入目标内部：沿最近的边向外推出
        const dirX = closestX - px
        const dirY = closestY - py
        const length = Math.hypot(dirX, dirY) || 1
        return { nx: dirX / length, ny: dirY / length, overlap: radius + minDistance }
    }

    buildPath(ctx, x, y, scale) {
        if (!this.verts) {
            ctx.arc(x, y, this.r * scale, 0, TAU)
            return
        }
        const verts = this.verts
        ctx.moveTo(x + verts[0].x * scale, y + verts[0].y * scale)
        for (let i = 1; i < verts.length; i++) {
            ctx.lineTo(x + verts[i].x * scale, y + verts[i].y * scale)
        }
        ctx.closePath()
    }

    update(dt, bounds) {
        if (this.vx || this.vy) {
            this.x += this.vx * dt
            this.y += this.vy * dt
            const left = bounds.left + this.r
            const right = bounds.right - this.r
            const top = bounds.top + this.r
            const bottom = bounds.bottom - this.r
            if (this.x < left) {
                this.x = left
                this.vx = Math.abs(this.vx)
            } else if (this.x > right) {
                this.x = right
                this.vx = -Math.abs(this.vx)
            }
            if (this.y < top) {
                this.y = top
                this.vy = Math.abs(this.vy)
            } else if (this.y > bottom) {
                this.y = bottom
                this.vy = -Math.abs(this.vy)
            }
        }
        this.flash = Math.max(0, this.flash - dt * 4)
        this.pop = Math.max(0, this.pop - dt * 3.2)
    }

    hurt(amount = 1) {
        this.hp = Math.max(0, this.hp - amount)
        this.flash = 1
        this.pop = 0.4
        if (this.hp <= 0) this.alive = false
        return this.hp <= 0
    }

    draw(ctx, time) {
        const hue = this.color
        const bob = this.vx || this.vy ? 0 : Math.sin(time * 1.7 + this.phase) * 2.5
        const scale = 1 + this.pop * 0.22
        const x = this.x
        const y = this.y + bob
        const r = this.r * scale

        ctx.save()

        // 外发光
        const glow = ctx.createRadialGradient(x, y, r * 0.1, x, y, r * 2.4)
        glow.addColorStop(0, hsl(hue, 100, 62, 0.34))
        glow.addColorStop(0.45, hsl(hue, 100, 56, 0.12))
        glow.addColorStop(1, hsl(hue, 100, 50, 0))
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(x, y, r * 2.4, 0, TAU)
        ctx.fill()

        // 能量核心
        const core = ctx.createRadialGradient(x - r * 0.32, y - r * 0.36, r * 0.06, x, y, r * 0.86)
        core.addColorStop(0, hsl(hue, 100, 76, 0.6))
        core.addColorStop(0.55, hsl(hue, 96, 52, 0.18))
        core.addColorStop(1, hsl(hue, 96, 40, 0.06))
        ctx.fillStyle = core
        ctx.beginPath()
        this.buildPath(ctx, x, y, 0.88 * scale)
        ctx.fill()

        ctx.strokeStyle = hsl(hue, 100, 68, 0.78)
        ctx.lineWidth = 1.4
        ctx.beginPath()
        this.buildPath(ctx, x, y, scale)
        ctx.stroke()

        // 高光
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
        ctx.beginPath()
        ctx.ellipse(x - r * 0.3, y - r * 0.38, r * 0.2, r * 0.12, -0.7, 0, TAU)
        ctx.fill()

        // 中心数值
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.font = `700 ${this.supply ? 18 : 13}px "JetBrains Mono", ui-monospace, monospace`
        ctx.fillStyle = this.supply ? hsl(43, 100, 88, 1) : 'rgba(255, 255, 255, 0.95)'
        ctx.fillText(this.supply ? '+' : this.hp, x, y + 0.5)

        if (this.flash > 0) {
            ctx.globalCompositeOperation = 'lighter'
            ctx.fillStyle = `rgba(255, 255, 255, ${this.flash * 0.5})`
            ctx.beginPath()
            this.buildPath(ctx, x, y, 0.94 * scale)
            ctx.fill()
        }

        ctx.restore()
    }
}
