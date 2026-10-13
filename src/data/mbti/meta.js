/**
 * MBTI 报告的公共常量
 * 原来这些散在 16 份 HTML 里（每份各写一遍），现在收口到一处。
 */

export const META = {
  INTJ: { cn: '建筑师', group: 'NT' },
  INTP: { cn: '逻辑学家', group: 'NT' },
  ENTJ: { cn: '指挥官', group: 'NT' },
  ENTP: { cn: '辩论家', group: 'NT' },
  INFJ: { cn: '提倡者', group: 'NF' },
  INFP: { cn: '调停者', group: 'NF' },
  ENFJ: { cn: '主人公', group: 'NF' },
  ENFP: { cn: '竞选者', group: 'NF' },
  ISTJ: { cn: '物流师', group: 'SJ' },
  ISFJ: { cn: '守卫者', group: 'SJ' },
  ESTJ: { cn: '总经理', group: 'SJ' },
  ESFJ: { cn: '执政官', group: 'SJ' },
  ISTP: { cn: '鉴赏家', group: 'SP' },
  ISFP: { cn: '探险家', group: 'SP' },
  ESTP: { cn: '企业家', group: 'SP' },
  ESFP: { cn: '表演家', group: 'SP' },
}

/** PC 单行时用的 2 字简称 */
export const SHORT = {
  INTJ: '建筑',
  INTP: '逻辑',
  ENTJ: '指挥',
  ENTP: '辩论',
  INFJ: '提倡',
  INFP: '调停',
  ENFJ: '主人',
  ENFP: '竞选',
  ISTJ: '物流',
  ISFJ: '守卫',
  ESTJ: '经理',
  ESFJ: '执政',
  ISTP: '鉴赏',
  ISFP: '探险',
  ESTP: '企业',
  ESFP: '表演',
}

export const GROUP_COLOR = {
  NT: '#7f5fd0',
  NF: '#3f8a58',
  SJ: '#2f7fb8',
  SP: '#c98a16',
}

export const groupColor = (code) => GROUP_COLOR[META[code]?.group] || '#1b6b3a'

/** 16 型清单 */
export const ALL_TYPES = Object.keys(META).map((code) => ({
  code,
  cn: META[code].cn,
  short: SHORT[code] || META[code].cn,
  group: META[code].group,
}))

/** 世界格局变量的属性配色（气泡 / 徽章 / 图例共用） */
export const TCOLOR = {
  good: { c: '#1b6b3a', label: '利好' },
  goodplus: { c: '#6f8f2e', label: '利好偏多' },
  double: { c: '#0f7d77', label: '双刃剑' },
  neutral: { c: '#7a8a82', label: '中性' },
  bad: { c: '#9a5a2c', label: '利空' },
}

export const T_COLOR_ORDER = ['good', 'goodplus', 'double', 'neutral', 'bad']

/** 雷达图的 8 个固定维度（16 型通用） */
export const RADAR_LABELS = [
  '实操动手',
  '危机应对',
  '系统拆解',
  '独立工作',
  '概念抽象',
  '长期规划',
  '情感表达',
  '社交主动',
]

export const SWOT_NAMES = { S: '优势', W: '劣势', O: '机会', T: '威胁' }
export const SWOT_ORDER = ['S', 'W', 'O', 'T']
export const PROB_LABEL = { hi: '高概率', md: '中概率', lo: '低概率' }

/** 象限定义：分界线可按类型微调（数据里带 split） */
export const QUAD_META = [
  {
    key: 'core',
    name: '战略核心区',
    cond: '高影响 × 高相关',
    act: '主战场：这些变量是 SWOT 中 O/T 的直接来源，每季度复盘一次走向。',
  },
  {
    key: 'lever',
    name: '能力杠杆区',
    cond: '中低影响 × 高相关',
    act: '提前布局：投入小、回报大，' + '类型专属的结构性红利。',
  },
  {
    key: 'bg',
    name: '环境背景区',
    cond: '高影响 × 低相关',
    act: '知道即可：不做主动投入，需要时再调用自身优势去分析。',
  },
  {
    key: 'watch',
    name: '观察区',
    cond: '中低影响 × 低相关',
    act: '低成本跟踪：设半年提醒，防止噪声占用核心精力。',
  },
]

/** 优先级：i × r / 100 */
export const priority = (v) => Math.round((v.i * v.r) / 100)

export function quadrantOf(v, split = { i: 76, r: 64 }) {
  const hiI = v.i > split.i
  const hiR = v.r > split.r
  if (hiI && hiR) return QUAD_META[0]
  if (!hiI && hiR) return QUAD_META[1]
  if (hiI && !hiR) return QUAD_META[2]
  return QUAD_META[3]
}