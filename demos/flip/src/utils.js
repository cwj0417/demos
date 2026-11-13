// 游戏世界的逻辑尺寸，渲染时会按 DPR 等比缩放
export const W = 440
export const H = 700
export const TAU = Math.PI * 2

export const LAUNCHER = { x: W / 2, y: 168 }

export const PHYS = {
    gravity: 235,
    ballSpeed: 610,
    ballRadius: 4.4,
    maxSpeed: 1050
}

export const ORB_HUES = [187, 316, 264, 88, 24]

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export const rand = (min, max) => min + Math.random() * (max - min)

export const randInt = (min, max) => Math.floor(rand(min, max + 1))

export const pick = list => list[Math.floor(Math.random() * list.length)]

export const shuffle = list => {
    const copy = [...list]
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
}

export const hsl = (h, s, l, a = 1) => `hsla(${h}, ${s}%, ${l}%, ${a})`

export const pad = value => String(value).padStart(2, '0')

export const formatScore = value => Math.round(value).toLocaleString('en-US')

// localStorage 在部分隐私模式下会抛错，统一做一层保护
export const storage = {
    get(key, fallback = null) {
        try {
            const value = localStorage.getItem(key)
            return value === null ? fallback : value
        } catch {
            return fallback
        }
    },
    set(key, value) {
        try {
            localStorage.setItem(key, String(value))
        } catch {
            /* ignore */
        }
    }
}
