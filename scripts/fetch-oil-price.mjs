#!/usr/bin/env node
// 抓取上海成品油历史零售价（92# / 95# / 0#），合并写入 demos/oil_price/data.json
import {readFile, writeFile} from 'node:fs/promises'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

const CITY = '上海'
const API = 'https://datacenter-web.eastmoney.com/api/data/v1/get'
const OUT_FILE = join(dirname(fileURLToPath(import.meta.url)), '..', 'demos', 'oil_price', 'data.json')

const params = new URLSearchParams({
    reportName: 'RPTA_WEB_YJ_JH',
    columns: 'ALL',
    filter: `(CITYNAME="${CITY}")`,
    sortColumns: 'DIM_DATE',
    sortTypes: '1',
    pageNumber: '1',
    pageSize: '5000',
    source: 'WEB'
})

const toPrice = value => {
    const price = Number(value)
    return Number.isFinite(price) && price > 0 ? Math.round(price * 100) / 100 : null
}

const fetchRows = async () => {
    let lastError
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const response = await fetch(`${API}?${params}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
                    Referer: 'https://data.eastmoney.com/cjsj/yjtz/default.html'
                }
            })
            if (!response.ok) throw new Error(`请求失败：HTTP ${response.status}`)
            const payload = await response.json()
            const rows = payload?.result?.data
            if (!Array.isArray(rows) || !rows.length) throw new Error('接口返回的数据为空')
            return rows
        } catch (error) {
            lastError = error
            if (attempt < 3) await new Promise(resolve => setTimeout(resolve, attempt * 2000))
        }
    }
    throw lastError
}

const rows = await fetchRows()
const latest = rows
    .map(row => [String(row.DIM_DATE).slice(0, 10), toPrice(row.V92), toPrice(row.V95), toPrice(row.V0)])
    .filter(([, p92, p95, p0]) => p92 && p95 && p0)

let existing = []
try {
    const old = JSON.parse(await readFile(OUT_FILE, 'utf8'))
    existing = Array.isArray(old.items) ? old.items : []
} catch (error) {
    if (error.code !== 'ENOENT') throw error
}

const merged = new Map(existing.map(item => [item[0], item]))
for (const item of latest) merged.set(item[0], item)

const items = [...merged.values()].sort((a, b) => (a[0] < b[0] ? -1 : 1))
const data = {
    city: CITY,
    unit: '元/升',
    source: 'https://data.eastmoney.com/cjsj/yjtz/default.html',
    updated: items.at(-1)[0],
    items
}

await writeFile(OUT_FILE, `${JSON.stringify(data)}\n`)
console.log(`已更新 ${OUT_FILE}`)
console.log(`共 ${items.length} 次调价，最新 ${items.at(-1).join(' / ')}`)
