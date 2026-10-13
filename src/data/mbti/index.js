/**
 * 报告数据入口
 *
 * 16 份 JSON 由 `npm run extract:mbti`（tools/extract-mbti-data.mjs）从旧 HTML 抽取生成，
 * 这里用 import.meta.glob 做按需加载：首屏只请求当前类型的 JSON。
 */

const modules = import.meta.glob('./*.json')

export { META, SHORT, GROUP_COLOR, ALL_TYPES, TCOLOR, RADAR_LABELS, quadrantOf, priority, QUAD_META } from './meta.js'

const cache = new Map()

/** 读取某类型的报告数据，结果缓存 */
export function loadReport(type) {
  if (cache.has(type)) return Promise.resolve(cache.get(type))
  const loader = modules[`./${type}.json`]
  if (!loader) return Promise.reject(new Error(`[mbti] 缺少数据文件：${type}.json`))
  return loader().then((mod) => {
    const data = mod.default || mod
    cache.set(type, data)
    return data
  })
}

/** 已注册的类型 */
export const TYPES = Object.keys(
  Object.fromEntries(Object.keys(modules).map((k) => [k.replace('./', '').replace('.json', ''), 1]))
)