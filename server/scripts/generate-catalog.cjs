// Generator katalog v2 — parse section per laporan dari HTML docs 5007:
// Heading id:`slug` → (Stored procedure: SP..., Nama parameter SP: ...) → params.
// + openapi.json untuk normalisasi bentuk params + probe untuk status & kolom.
const fs = require('node:fs')
const path = require('node:path')
const yaml = require('yaml')

const DIR = 'C:/Users/ridho/AppData/Local/Temp/opencode/catalog'
const OUT = path.resolve(__dirname, '../reports.catalog.yaml')

const openapi = JSON.parse(fs.readFileSync('C:/Users/ridho/AppData/Local/Temp/opencode/openapi.json', 'utf8'))
const post = openapi.paths['/reports'].post.requestBody.content['application/json'].schema.anyOf
const inferType = (name) => {
  if (/(^tgl|^periode|^tanggal|akhir$)/i.test(name)) return 'date'
  if (/(tahun|bulan$|hari$|umur\d|pcs)/i.test(name)) return 'int'
  return 'string'
}
const shapeOf = {}
for (const v of post) {
  const types = v.properties && v.properties.type && v.properties.type.enum
  if (!types) continue
  const props = (v.properties.params && v.properties.params.properties) || {}
  const names = Object.keys(props)
  const shape =
    names.length === 2 && names.includes('tglAwal') && names.includes('tglAkhir')
      ? 'period'
      : names.length === 1 && names[0] === 'tglAkhir'
        ? 'asof'
        : names.length === 0
          ? 'none'
          : 'custom'
  for (const type of types) {
    shapeOf[type] = { shape, params: names.map((n) => ({ name: n, type: inferType(n) })) }
  }
}

const probe = JSON.parse(fs.readFileSync('C:/Users/ridho/AppData/Local/Temp/opencode/sp-permission.json', 'utf8'))
const spInfo = {}
for (const sys of ['wps', 'pps']) {
  for (const row of probe[sys]) spInfo[row.sp] = { system: sys, status: row.status, rows: row.rows, cols: row.cols || [] }
}

const judul = (s) => s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
const OUT_WORD = /^(memakai|default|nama|berbeda|dari|field|di|params|dan)$/i

const catalog = { systems: { wps: { groups: [] }, pps: { groups: [] } } }

for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith('.html')).sort()) {
  const sys = f.startsWith('wps-') ? 'wps' : 'pps'
  const groupSlug = f.replace(/\.html$/, '').replace(/^(wps|pps)-/, '')
  const t = fs.readFileSync(path.join(DIR, f), 'utf8')
  const gList = catalog.systems[sys].groups
  const g = gList.find((x) => x.grup === judul(groupSlug)) || (() => { const n = { grup: judul(groupSlug), items: [] }; gList.push(n); return n })()

  const sectionRe = /id:`([a-z0-9-]+)`/g
  const marks = []
  let m
  while ((m = sectionRe.exec(t))) marks.push({ slug: m[1], at: m.index })

  for (let i = 0; i < marks.length; i++) {
    const slug = marks[i].slug
    if (!shapeOf[slug]) continue
    if (g.items.some((x) => x.type === slug)) continue
    const seg = t.slice(marks[i].at, i + 1 < marks.length ? marks[i + 1].at : undefined)
    const pPos = seg.indexOf('Nama parameter SP:')
    const oPos = seg.indexOf('Orientasi')
    const spSeg = seg.slice(0, pPos < 0 ? seg.length : pPos)
    const paramSeg = pPos >= 0 ? seg.slice(pPos, oPos < 0 ? seg.length : oPos) : ''
    const codes = (s) => [...new Set([...s.matchAll(/`@?([A-Za-z0-9_]+)`/g)].map((x) => x[1]))]
    const sps = codes(spSeg).filter((n) => /^(SP|usp)/.test(n) && n.length > 3)
    const params = codes(paramSeg).filter((n) => !OUT_WORD.test(n) && n.length > 1)
    const item = {
      type: slug,
      judul: judul(slug),
      procedure: sps.length === 1 ? sps[0] : null,
      shape: shapeOf[slug].shape,
      params: params.length ? params.map((n) => ({ name: n, type: inferType(n) })) : shapeOf[slug].params,
    }
    // Normalisasi dua param tanggal: nama field lowercase konsisten dengan
    // reports.yaml; ejaan asli SP tetap lewat mapping `sp`.
    item.params = item.params.map((p) => {
      if (/^@?tglawal$/i.test(p.name))
        return { name: 'tglAwal', type: 'date', ...(p.name !== 'tglAwal' ? { sp: p.name } : {}) }
      if (/^@?tglakhir$/i.test(p.name))
        return { name: 'tglAkhir', type: 'date', ...(p.name !== 'tglAkhir' ? { sp: p.name } : {}) }
      return p
    })
    if (sps.length > 1) item.catatan = `multi-SP (${sps.length})`
    const info = item.procedure ? spInfo[item.procedure] || null : null
    if (info) {
      item.granted = info.status !== 'DENIED'
      if (info.cols.length) item.kolom = info.cols
      if (info.rows != null) item.contohBaris = info.rows
    }
    g.items.push(item)
  }
}

fs.writeFileSync(OUT, yaml.stringify(catalog, { lineWidth: 200 }))
for (const sys of ['wps', 'pps']) {
  const gs = catalog.systems[sys].groups
  const n = gs.reduce((t, g) => t + g.items.length, 0)
  const satu = gs.reduce((t, g) => t + g.items.filter((i) => i.procedure).length, 0)
  const granted = gs.reduce((t, g) => t + g.items.filter((i) => i.granted !== false).length, 0)
  console.log(sys.toUpperCase() + ':', gs.length, 'grup,', n, 'laporan,', satu, '1-SP,', granted, 'granted')
}
console.log('ditulis:', OUT)
