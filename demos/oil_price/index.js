const SERIES = [
    {key: 'p92', index: 1, name: '92# 汽油', short: '92#', color: '#4bc4ff'},
    {key: 'p95', index: 2, name: '95# 汽油', short: '95#', color: '#ffb64b'},
    {key: 'p0', index: 3, name: '0# 柴油', short: '0#', color: '#52e0a8'}
]

const RANGE_DAYS = { '1y': 365, '3y': 365 * 3, '5y': 365 * 5, all: Infinity }
const SVG_NS = 'http://www.w3.org/2000/svg'

const state = {
    items: [],
    active: new Set(SERIES.map(series => series.key)),
    range: '3y'
}

const $ = selector => document.querySelector(selector)
const money = value => value.toFixed(2)
const day = date => new Date(`${date}T00:00:00`).getTime()
const shortDate = date => `${date.slice(2, 4)}/${date.slice(5, 7)}`

const svgEl = (tag, attrs = {}) => {
    const node = document.createElementNS(SVG_NS, tag)
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value)
    return node
}

const activeSeries = () => SERIES.filter(series => state.active.has(series.key))

const showError = message => {
    const wrap = $('#chart-wrap')
    wrap.innerHTML = `<div class="chart-error">${message}</div>`
}

const renderSummary = items => {
    const latest = items.at(-1)
    const previous = items.at(-2)
    const cards = document.querySelectorAll('.price-card')

    cards.forEach(card => {
        const series = SERIES.find(item => item.key === card.dataset.key)
        const value = latest[series.index]
        const diff = value - previous[series.index]
        const delta = card.querySelector('.delta')

        card.querySelector('.price-value').textContent = money(value)
        delta.textContent = diff === 0 ? '持平' : `${diff > 0 ? '+' : ''}${money(diff)}`
        delta.className = `delta ${diff > 0 ? 'up' : diff < 0 ? 'down' : ''}`

        const points = items.slice(-40).map(item => item[series.index])
        const min = Math.min(...points)
        const max = Math.max(...points)
        const span = max - min || 1
        const step = 120 / (points.length - 1)
        const coords = points.map((price, index) => [index * step, 29 - ((price - min) / span) * 26])
        const line = coords.map(([x, y], index) => `${index ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
        const spark = card.querySelector('.spark')
        spark.innerHTML = ''
        spark.appendChild(svgEl('path', {
            d: `${line} L120,32 L0,32 Z`,
            fill: series.color,
            'fill-opacity': '0.1'
        }))
        spark.appendChild(svgEl('path', {
            d: line,
            fill: 'none',
            stroke: series.color,
            'stroke-width': '1.6',
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round',
            opacity: '0.9'
        }))
        const [lastX, lastY] = coords.at(-1)
        spark.appendChild(svgEl('circle', {
            cx: lastX,
            cy: lastY,
            r: '2.2',
            fill: series.color
        }))
    })
}

const visibleItems = () => {
    const items = state.items
    const days = RANGE_DAYS[state.range]
    if (!Number.isFinite(days)) return items
    const end = day(items.at(-1)[0])
    const start = end - days * 86400000
    const filtered = items.filter(item => day(item[0]) >= start)
    return filtered.length >= 2 ? filtered : items.slice(-2)
}

let chartCache = null

const renderChart = () => {
    const wrap = $('#chart-wrap')
    const svg = $('#chart')
    const width = wrap.clientWidth
    const height = wrap.clientHeight
    if (!width || !height || !state.items.length) return

    const series = activeSeries()
    const items = visibleItems()
    const box = {top: 22, right: 18, bottom: 32, left: 52}
    const plotW = width - box.left - box.right
    const plotH = height - box.top - box.bottom

    let min = Infinity
    let max = -Infinity
    for (const item of items) {
        for (const entry of series) {
            min = Math.min(min, item[entry.index])
            max = Math.max(max, item[entry.index])
        }
    }
    const pad = Math.max(0.15, (max - min) * 0.12)
    min = Math.max(0, min - pad)
    max += pad

    const first = day(items[0][0])
    const last = day(items.at(-1)[0])
    const x = date => box.left + (day(date) - first) / (last - first || 1) * plotW
    const y = value => box.top + (1 - (value - min) / (max - min || 1)) * plotH
    const base = box.top + plotH

    svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
    svg.innerHTML = ''

    const defs = svgEl('defs')
    for (const entry of series) {
        const gradient = svgEl('linearGradient', {id: `fill-${entry.key}`, x1: '0', y1: '0', x2: '0', y2: '1'})
        gradient.appendChild(svgEl('stop', {offset: '0%', 'stop-color': entry.color, 'stop-opacity': '0.28'}))
        gradient.appendChild(svgEl('stop', {offset: '100%', 'stop-color': entry.color, 'stop-opacity': '0'}))
        defs.appendChild(gradient)
    }
    svg.appendChild(defs)

    // 横向网格与 Y 轴刻度
    const steps = 5
    const rawStep = (max - min) / steps
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)))
    const niceStep = [1, 2, 2.5, 5, 10].map(m => m * magnitude).find(step => step >= rawStep) || magnitude
    for (let value = Math.ceil(min / niceStep) * niceStep; value <= max; value += niceStep) {
        const py = y(value)
        svg.appendChild(svgEl('line', {
            x1: box.left,
            y1: py,
            x2: width - box.right,
            y2: py,
            stroke: 'rgba(75, 196, 255, 0.1)',
            'stroke-dasharray': '3 5'
        }))
        const label = svgEl('text', {
            x: box.left - 10,
            y: py + 4,
            'text-anchor': 'end',
            fill: 'rgba(159, 228, 255, 0.48)',
            'font-size': '11',
            'font-family': 'ui-monospace, Menlo, monospace'
        })
        label.textContent = value.toFixed(1)
        svg.appendChild(label)
    }

    // X 轴刻度
    const tickCount = width < 620 ? 4 : 6
    const used = new Set()
    for (let i = 0; i < tickCount; i++) {
        const index = Math.round(i * (items.length - 1) / (tickCount - 1))
        if (used.has(index)) continue
        used.add(index)
        const px = x(items[index][0])
        svg.appendChild(svgEl('line', {
            x1: px,
            y1: box.top,
            x2: px,
            y2: base,
            stroke: 'rgba(75, 196, 255, 0.06)'
        }))
        const label = svgEl('text', {
            x: px,
            y: height - 10,
            'text-anchor': 'middle',
            fill: 'rgba(159, 228, 255, 0.42)',
            'font-size': '11',
            'font-family': 'ui-monospace, Menlo, monospace'
        })
        label.textContent = shortDate(items[index][0])
        svg.appendChild(label)
    }

    // 面积与折线
    for (const entry of series) {
        const line = items.map((item, index) => `${index ? 'L' : 'M'}${x(item[0]).toFixed(1)},${y(item[entry.index]).toFixed(1)}`).join(' ')
        const area = `${line} L${width - box.right},${base} L${box.left},${base} Z`
        svg.appendChild(svgEl('path', {
            d: area,
            fill: `url(#fill-${entry.key})`,
            stroke: 'none'
        }))
        const path = svgEl('path', {
            d: line,
            fill: 'none',
            stroke: entry.color,
            'stroke-width': '2',
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round',
            opacity: '0.95'
        })
        svg.appendChild(path)
        const length = path.getTotalLength()
        if (Number.isFinite(length) && length > 0) {
            path.style.strokeDasharray = length
            path.style.strokeDashoffset = length
            path.style.transition = 'stroke-dashoffset 0.9s ease'
            requestAnimationFrame(() => (path.style.strokeDashoffset = '0'))
        }
    }

    // 悬停提示
    const guide = svgEl('line', {
        y1: box.top,
        y2: base,
        stroke: 'rgba(143, 232, 255, 0.42)',
        'stroke-dasharray': '4 4',
        opacity: '0'
    })
    svg.appendChild(guide)

    const dots = svgEl('g')
    svg.appendChild(dots)

    const tooltip = $('#tooltip')
    const xPositions = items.map(item => x(item[0]))

    const hide = () => {
        guide.setAttribute('opacity', '0')
        dots.innerHTML = ''
        tooltip.hidden = true
    }

    const show = index => {
        const item = items[index]
        const px = xPositions[index]
        guide.setAttribute('x1', px)
        guide.setAttribute('x2', px)
        guide.setAttribute('opacity', '1')

        dots.innerHTML = ''
        let topY = base
        for (const entry of series) {
            const py = y(item[entry.index])
            topY = Math.min(topY, py)
            dots.appendChild(svgEl('circle', {
                cx: px,
                cy: py,
                r: '4.5',
                fill: '#04121f',
                stroke: entry.color,
                'stroke-width': '2'
            }))
        }

        tooltip.innerHTML = `
            <div class="tooltip-date">${item[0]} 调价</div>
            ${series.map(entry => `
                <div class="tooltip-row">
                    <span><i style="background:${entry.color};display:inline-block"></i>${entry.name}</span>
                    <b>${money(item[entry.index])}</b>
                </div>`).join('')}
        `
        tooltip.hidden = false
        const left = Math.min(Math.max(px, 86), width - 86)
        tooltip.style.left = `${left}px`
        tooltip.style.top = `${Math.max(topY - 14, 64)}px`
    }

    const onMove = event => {
        const rect = svg.getBoundingClientRect()
        const px = event.clientX - rect.left
        if (px < box.left || px > width - box.right) return hide()
        let nearest = 0
        let distance = Infinity
        for (let i = 0; i < xPositions.length; i++) {
            const diff = Math.abs(xPositions[i] - px)
            if (diff < distance) {
                distance = diff
                nearest = i
            }
        }
        show(nearest)
    }

    svg.onpointermove = onMove
    svg.onpointerleave = hide

    chartCache = {items, series}
    renderFoot()
}

const renderFoot = () => {
    const {items, series} = chartCache || {}
    if (!items || !series?.length) return
    const target = series.find(entry => entry.key === 'p92') || series[0]
    let peak = items[0]
    let low = items[0]
    for (const item of items) {
        if (item[target.index] > peak[target.index]) peak = item
        if (item[target.index] < low[target.index]) low = item
    }
    $('#chart-foot').innerHTML = `
        <span>${target.name} 区间最高 <b>${money(peak[target.index])}</b> <span class="hint">${peak[0]}</span></span>
        <span>区间最低 <b>${money(low[target.index])}</b> <span class="hint">${low[0]}</span></span>
        <span>区间调价 <b>${items.length}</b> 次</span>
    `
}

const renderTable = items => {
    const rows = items.slice(-20).reverse()
    $('#table-body').innerHTML = rows.map(item => {
        const index = items.indexOf(item)
        const previous = items[index - 1]
        const diff = previous ? item[1] - previous[1] : 0
        const cls = diff > 0 ? 'up' : diff < 0 ? 'down' : ''
        const text = diff === 0 ? '持平' : `${diff > 0 ? '+' : ''}${money(diff)}`
        return `<tr>
            <td class="date">${item[0]}</td>
            <td class="num">${money(item[1])}</td>
            <td class="num">${money(item[2])}</td>
            <td class="num">${money(item[3])}</td>
            <td class="num"><span class="badge ${cls}">${text}</span></td>
        </tr>`
    }).join('')
}

const bindControls = () => {
    $('#legend').addEventListener('click', event => {
        const chip = event.target.closest('.chip')
        if (!chip) return
        const key = chip.dataset.series
        if (state.active.has(key)) {
            if (state.active.size === 1) return
            state.active.delete(key)
            chip.classList.remove('active')
        } else {
            state.active.add(key)
            chip.classList.add('active')
        }
        renderChart()
    })

    $('#ranges').addEventListener('click', event => {
        const button = event.target.closest('button[data-range]')
        if (!button) return
        state.range = button.dataset.range
        document.querySelectorAll('#ranges button').forEach(item => item.classList.toggle('active', item === button))
        renderChart()
    })

    let timer
    window.addEventListener('resize', () => {
        clearTimeout(timer)
        timer = setTimeout(renderChart, 120)
    })
}

const render = data => {
    state.items = data.items
    $('#updated').textContent = data.updated
    $('#total').textContent = data.items.length
    renderSummary(data.items)
    renderTable(data.items)
    renderChart()
}

fetch('data.json', {cache: 'no-store'})
    .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json()
    })
    .then(data => {
        bindControls()
        render(data)
    })
    .catch(error => {
        showError(`数据加载失败：${error.message}<br>请通过本地服务器（./serve.sh）打开页面`)
    })
