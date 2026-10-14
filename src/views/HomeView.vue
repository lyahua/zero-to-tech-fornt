<template>
  <div class="mbti-app" :class="{ immersive: settings.immersive }">
    <!-- ===================== 顶部标题栏 ===================== -->
    <header v-show="!settings.immersive" class="mbti-header">
      <div class="hd-left">
        <span class="hd-title">MBTI · SWOT 高可能性可视化</span>
      </div>

      <!-- 当前类型胶囊：折叠 / 展开 16 型面板 -->
      <div class="cur-pill" :style="pillStyle" @click="togglePanel()">
        <b>{{ current }}</b>
        <i>{{ currentMeta.cn }}</i>
        <span class="arrow">{{ panelOpen ? '收起' : '切换' }}</span>
      </div>

      <div class="hd-right">
        <span class="hd-btn ghost" @click="copyLink">复制链接</span>
      </div>
    </header>

    <!-- ===================== 可折叠 16 型面板 ===================== -->
    <div
      v-show="!settings.immersive"
      class="panel"
      :class="{ open: panelOpen, compact: settings.chipLabel === 'code' }"
    >
      <div class="panel-inner">
        <button
          v-for="t in allTypes"
          :key="t.code"
          class="type-chip"
          :class="[`g-${t.group}`, { active: current === t.code }]"
          :style="current === t.code ? pillStyleOf(t.code) : null"
          :title="`${t.code} ${t.cn}`"
          type="button"
          @click="selectType(t.code)"
        >
          <b v-show="settings.chipLabel !== 'cn'">{{ t.code }}</b>
          <i v-if="settings.chipLabel !== 'code'" class="cn-full">{{ t.cn }}</i>
          <i v-if="settings.chipLabel !== 'code'" class="cn-short">{{ t.short }}</i>
        </button>
      </div>
    </div>

    <!-- ===================== 常用选项栏（常驻平铺，横向可滚动） ===================== -->
    <div v-show="!settings.immersive && false" class="panel tool open">
      <div class="tool-inner">
        <div class="opt">
          <label>标签显示</label>
          <div class="seg">
            <button
              v-for="m in labelModes"
              :key="m.v"
              type="button"
              :class="{ on: settings.chipLabel === m.v }"
              @click="setSetting('chipLabel', m.v)"
            >
              {{ m.t }}
            </button>
          </div>
        </div>

        <div class="opt">
          <label>内容缩放</label>
          <div class="seg">
            <button
              v-for="z in zoomLevels"
              :key="z"
              type="button"
              :class="{ on: settings.zoom === z }"
              @click="setSetting('zoom', z)"
            >
              {{ Math.round(z * 100) }}%
            </button>
          </div>
        </div>

        <div class="opt">
          <label>沉浸模式</label>
          <button
            type="button"
            class="switch"
            :class="{ on: settings.immersive }"
            @click="toggleImmersive"
          >
            <i></i><span>{{ settings.immersive ? '已开启' : '隐藏导航' }}</span>
          </button>
        </div>

        <div class="opt">
          <label>记住选择</label>
          <button
            type="button"
            class="switch"
            :class="{ on: settings.remember }"
            @click="setSetting('remember', !settings.remember)"
          >
            <i></i><span>{{ settings.remember ? 'localStorage' : '仅本次' }}</span>
          </button>
        </div>

        <div class="opt">
          <label>内容边框</label>
          <button
            type="button"
            class="switch"
            :class="{ on: settings.bordered }"
            @click="setSetting('bordered', !settings.bordered)"
          >
            <i></i><span>{{ settings.bordered ? '卡片' : '无框' }}</span>
          </button>
        </div>

        <div class="opt">
          <label>快捷键</label>
          <span class="hint">← → 切换类型 ｜ S 展开选型 ｜ F 沉浸 ｜ Esc 退出</span>
        </div>
      </div>
    </div>

    <!-- ===================== 报告内容区 ===================== -->
    <div
      ref="wrapEl"
      class="report-wrap"
      :class="{ plain: !settings.bordered, scrolled }"
      tabindex="0"
      @scroll.passive="onWrapScroll"
    >
      <div v-if="loading" class="loading-mask">
        <span class="spinner"></span>
        <span class="loading-text">{{ current }} · {{ currentMeta.cn }} 报告加载中…</span>
      </div>
      <div class="report-scaler" :style="scalerStyle">
        <MbtiReport :type="current" @ready="loading = false" />
      </div>

      <!-- 沉浸模式下的浮动退出按钮 -->
      <button v-if="settings.immersive" type="button" class="exit-float" @click="toggleImmersive">
        退出沉浸（Esc）
      </button>
    </div>

    <div v-if="toast" class="toast">{{ toast }}</div>
  </div>
</template>

<script setup>
import { useRouter, useRoute } from 'vue-router'
import { reactive, ref, computed, onMounted, onBeforeUnmount } from 'vue'
import MbtiReport from '../components/mbti/MbtiReport.vue'
import { ALL_TYPES as allTypes, META, groupColor } from '../data/mbti/meta'

const Route = useRoute()
const Router = useRouter()

// ==================== 状态 ====================
const TYPE_KEY = 'mbti_last_type'
const SET_KEY = 'mbti_settings'
const isPC = () => window.matchMedia('(min-width: 768px)').matches

const defaultSettings = {
  chipLabel: 'all', // all | code | cn
  zoom: 1, // 0.8 ~ 1.3
  immersive: false,
  remember: true,
  bordered: true,
}
const loadSettings = () => {
  try {
    return {
      ...defaultSettings,
      ...JSON.parse(localStorage.getItem(SET_KEY) || '{}'),
    }
  } catch (e) {
    return { ...defaultSettings }
  }
}
const settings = reactive(loadSettings())
const saveSettings = () => localStorage.setItem(SET_KEY, JSON.stringify(settings))
function setSetting(k, v) {
  settings[k] = v
  saveSettings()
}

const initType = () => {
  const q = Route.query.type
  if (q && META[q]) return q
  if (settings.remember) {
    const saved = localStorage.getItem(TYPE_KEY)
    if (saved && META[saved]) return saved
  }
  return 'INTJ'
}

const current = ref(initType())
const loading = ref(true)
const toast = ref('')
let toastTimer = null
function showToast(text) {
  toast.value = text
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 1600)
}

// 16 型面板折叠开关（选项栏常驻显示，不参与折叠）
const panelOpen = ref(true)

const currentMeta = computed(() => META[current.value])

// ==================== 报告区滚动 ====================
const wrapEl = ref(null)
const scrolled = ref(false)
let scrollRaf = 0
function onWrapScroll() {
  if (scrollRaf) return
  scrollRaf = requestAnimationFrame(() => {
    scrollRaf = 0
    scrolled.value = (wrapEl.value?.scrollTop || 0) > 4
  })
}
/** 切类型时回到顶部：内容高度不同，保留旧位置会看到半截 */
function resetScroll() {
  scrolled.value = false
  wrapEl.value?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
}

const labelModes = [
  { v: 'all', t: '代码+中文' },
  { v: 'code', t: '仅代码' },
  { v: 'cn', t: '仅中文' },
]
const zoomLevels = [0.8, 0.9, 1, 1.1, 1.25]

// ==================== 交互 ====================
// 16 型面板折叠开关（选项栏常驻，不参与互斥）
function togglePanel() {
  panelOpen.value = !panelOpen.value
}
function toggleImmersive() {
  setSetting('immersive', !settings.immersive)
  panelOpen.value = !settings.immersive
}
function step(dir) {
  const i = allTypes.findIndex((t) => t.code === current.value)
  const n = (i + dir + allTypes.length) % allTypes.length
  selectType(allTypes[n].code)
}
function selectType(code) {
  if (META[code] && code !== current.value) {
    current.value = code
    loading.value = true
    resetScroll()
    if (settings.remember) localStorage.setItem(TYPE_KEY, code)
    Router.replace({ query: { ...Route.query, type: code } })
  }
  if (!isPC()) panelOpen.value = false
}
function openInNewTab() {
  window.open(Router.resolve({ query: { ...Route.query, type: current.value } }).href, '_blank')
}
function copyLink() {
  const url = location.href
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(url).then(
      () => showToast('深链已复制，可直接分享'),
      () => showToast('复制失败，请手动复制地址栏'),
    )
  } else {
    showToast(url)
  }
}

// 键盘快捷键（PC）
function onKey(e) {
  if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return
  if (e.key === 'ArrowRight') step(1)
  else if (e.key === 'ArrowLeft') step(-1)
  else if (e.key === 'Escape' && settings.immersive) toggleImmersive()
  else if (e.key === 's' || e.key === 'S') togglePanel()
  else if (e.key === 'f' || e.key === 'F') toggleImmersive()
}

// 样式
const pillStyle = computed(() => pillStyleOf(current.value))
function pillStyleOf(code) {
  const c = groupColor(code)
  return { background: c, borderColor: c, color: '#fff' }
}
const scalerStyle = computed(() => {
  const z = settings.zoom || 1
  // 高度交给内容自适应：以前 iframe 自身 100% 撑满，这里改成纵向也按 z 还原，
  // transform-origin 在左上角，视觉宽高才与 100% 一致
  return {
    width: `${(100 / z).toFixed(4)}%`,
    transform: `scale(${z})`,
  }
})

// ==================== PC 端 rem 钳制 ====================
// 项目用 amfe-flexible：1rem = clientWidth / 10。PC 上 1920px 宽会让 1rem = 192px，
// 而 pxtorem 的 rootValue 是 37.5，导致字号/间距被放大约 5 倍（排版错乱的根因）。
// 这里在 PC 下把根字号固定为 37.5px（即 375 设计稿 1:1），离开本页自动还原。
const ROOT_PX = 37.5
const PC_BREAK = 768
const docEl = document.documentElement
function syncRootFontSize() {
  const w = docEl.clientWidth || window.innerWidth
  docEl.style.fontSize = w >= PC_BREAK ? `${ROOT_PX}px` : `${w / 10}px`
}

onMounted(() => {
  syncRootFontSize()
  // 在 amfe-flexible 之后注册，resize 时以本函数结果为准
  window.addEventListener('resize', syncRootFontSize)
  window.addEventListener('pageshow', syncRootFontSize)

  if (!Route.query.type) {
    Router.replace({ query: { ...Route.query, type: current.value } })
  }
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('resize', syncRootFontSize)
  window.removeEventListener('pageshow', syncRootFontSize)
  // 还原为 amfe-flexible 的原始行为，避免影响其他页面
  docEl.style.fontSize = `${(docEl.clientWidth || window.innerWidth) / 10}px`
})
</script>

<style scoped lang="less">
.mbti-app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  /* dvh 会随移动端地址栏收放而变，正好是我们要的行为；
     放在 100vh 之后写，不支持 dvh 的浏览器自动落到 vh */
  height: 100dvh;
  background: #f3faf4;
  overflow: hidden;
}

/* ===== 顶部标题栏（紧凑单行） ===== */
.mbti-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  background: linear-gradient(135deg, #1b6b3a 0%, #0f7d77 100%);
  color: #fff;
  flex-shrink: 0;

  .hd-left {
    min-width: 0;
    flex: 1;
  }
  .hd-title {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .hd-right {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .hd-btn {
    font-size: 10px;
    padding: 3px 8px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.65);
    background: rgba(255, 255, 255, 0.12);
    white-space: nowrap;
    cursor: pointer;
    transition: background 0.15s ease;

    &.on {
      background: rgba(255, 255, 255, 0.32);
    }
    &:hover {
      background: rgba(255, 255, 255, 0.26);
    }
    &:active {
      filter: brightness(0.9);
    }
  }
  /* 手机上隐藏次要按钮，保证标题栏单行紧凑 */
  .hd-btn.ghost {
    display: none;
  }
}

/* 当前类型胶囊（16 型面板开关） */
.cur-pill {
  flex-shrink: 0;
  display: flex;
  align-items: baseline;
  gap: 4px;
  padding: 4px 9px;
  border-radius: 999px;
  border: 1px solid transparent;
  cursor: pointer;

  b {
    font-size: 13px;
    letter-spacing: 0.5px;
  }
  i {
    font-style: normal;
    font-size: 10px;
    opacity: 0.9;
  }
  .arrow {
    font-size: 9px;
    padding-left: 3px;
    opacity: 0.85;
  }
  &:active {
    filter: brightness(0.92);
  }
}

/* ===== 可折叠面板（折叠时 max-height:0，完全不占高度） ===== */
.panel {
  flex-shrink: 0;
  max-height: 0;
  overflow: hidden;
  background: #f3faf4;
  transition: max-height 0.22s ease;

  &.open {
    max-height: 108px; /* 16 型：手机 2 行（字号已放大） */
    border-bottom: 1px solid #d2e4d6;
  }

  /* 常用选项栏：常驻显示，不参与折叠 */
  &.tool {
    max-height: none;
    border-bottom: 1px solid #d2e4d6;
    background: #fbfdfb;
  }
}

/* 选项栏内容：单行横向滚动，任何屏幕都只占一行高度 */
.tool-inner {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 10px 14px;
  padding: 8px;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    height: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: #bcd8c6;
    border-radius: 3px;
  }
}

.opt {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;

  label {
    font-size: 12px;
    font-weight: 600;
    color: #2f5a43;
    flex-shrink: 0;
    white-space: nowrap;
  }
  .hint {
    font-size: 11px;
    color: #6b7f74;
    white-space: nowrap;
  }
}

.seg {
  display: flex;
  border: 1px solid #cfe3d4;
  border-radius: 999px;
  overflow: hidden;
  background: #fff;
  flex-shrink: 0;

  button {
    font-size: 12px;
    padding: 4px 9px;
    border: none;
    background: transparent;
    color: #2f5a43;
    cursor: pointer;
    white-space: nowrap;

    &.on {
      background: #1b6b3a;
      color: #fff;
      font-weight: 600;
    }
  }
}

.switch {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px 3px 3px;
  border-radius: 999px;
  border: 1px solid #cfe3d4;
  background: #fff;
  cursor: pointer;
  flex-shrink: 0;

  i {
    width: 22px;
    height: 12px;
    border-radius: 999px;
    background: #cfdcd3;
    position: relative;
    transition: background 0.15s ease;
    flex-shrink: 0;

    &::after {
      content: '';
      position: absolute;
      top: 1px;
      left: 1px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #fff;
      transition: transform 0.15s ease;
    }
  }
  span {
    font-size: 12px;
    color: #2f5a43;
    white-space: nowrap;
  }
  &.on i {
    background: #1b6b3a;
    &::after {
      transform: translateX(10px);
    }
  }
}

/* 16 型：Grid 排布，保证每格等宽、文字不外溢 */
.panel-inner {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 5px;
  padding: 7px 8px;
}

.type-chip {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  padding: 5px 2px;
  border-radius: 6px;
  border: 1px solid;
  background: #fff;
  line-height: 1.2;
  overflow: hidden;
  cursor: pointer;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    background 0.15s ease;

  b {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.3px;
  }
  i {
    font-style: normal;
    font-size: 11px;
    opacity: 0.85;
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  /* H5：显示全称，简称隐藏（保持已优化的手机排布） */
  .cn-short {
    display: none;
  }

  /* 未选中：按气质组描边着色 */
  &.g-NT:not(.active) {
    color: #6a4fc0;
    border-color: #cfc0f0;
  }
  &.g-NF:not(.active) {
    color: #35804d;
    border-color: #b3ddc3;
  }
  &.g-SJ:not(.active) {
    color: #2a6f9e;
    border-color: #b3d4ea;
  }
  &.g-SP:not(.active) {
    color: #a8760f;
    border-color: #edd6a0;
  }
}

/* ===== 报告内容区 ===== */
.report-wrap {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  background: #e6f2ea;
  -webkit-overflow-scrolling: touch;
  /* 防止滚到边界后继续滚动触发浏览器的下拉刷新 / 页面级滚动穿透 */
  overscroll-behavior: contain;
  /* 滚动条常驻占位，报告内部宽度不会因为滚动条出现/消失而跳动 */
  scrollbar-gutter: stable;

  /* 细滚动条：标准属性（Firefox）+ webkit 前缀（Chrome/Edge/Safari），两套都写 */
  scrollbar-width: thin;
  scrollbar-color: #bcd8c6 transparent;

  &::-webkit-scrollbar {
    width: 10px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: #bcd8c6;
    border-radius: 5px;
    border: 3px solid transparent;
    background-clip: content-box;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: #8fbf9f;
    background-clip: content-box;
  }

  /* 可聚焦以支持键盘滚动（PageUp/Down、方向键、空格），焦点框画在内侧不裁内容 */
  &:focus-visible {
    outline: 2px solid #1b6b3a;
    outline-offset: -2px;
  }

  .report-scaler {
    transform-origin: 0 0;
  }

  /* 滚动后给内容区一个轻微投影，提示「下面还有内容」 */
  &.scrolled:not(.plain) {
    box-shadow: inset 0 10px 12px -12px rgba(27, 107, 58, 0.45);
  }

  .loading-mask {
    position: absolute;
    inset: 0;
    z-index: 3;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    background: rgba(243, 250, 244, 0.92);

    .spinner {
      width: 26px;
      height: 26px;
      border: 3px solid #9fd6ad;
      border-top-color: #1b6b3a;
      border-radius: 50%;
      animation: mbti-spin 0.8s linear infinite;
    }
    .loading-text {
      font-size: 12px;
      color: #41544a;
    }
  }
}

.exit-float {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 4;
  font-size: 10px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(27, 107, 58, 0.35);
  background: rgba(255, 255, 255, 0.9);
  color: #1b6b3a;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(27, 107, 58, 0.12);

  &:hover {
    background: #fff;
  }
}

.toast {
  position: fixed;
  left: 50%;
  bottom: 26px;
  transform: translateX(-50%);
  z-index: 20;
  font-size: 11px;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(27, 107, 58, 0.92);
  color: #fff;
  pointer-events: none;
}

@keyframes mbti-spin {
  to {
    transform: rotate(360deg);
  }
}

/* ==================== PC 适配（≥768px） ==================== */
@media (min-width: 768px) {
  .mbti-header {
    padding: 9px 16px;
    gap: 12px;

    .hd-title {
      font-size: 17px;
    }
    .hd-btn {
      font-size: 12px;
      padding: 4px 11px;
    }
    .hd-btn.ghost {
      display: inline-block;
    }
  }

  .cur-pill {
    padding: 6px 14px;

    b {
      font-size: 16px;
    }
    i {
      font-size: 13px;
    }
    .arrow {
      font-size: 11px;
    }
  }

  /* 选项栏：PC 加大内边距，始终单行 */
  .panel.tool .tool-inner {
    padding: 9px 16px;
    gap: 12px 18px;
  }

  /* PC：16 型一行 16 格，Grid 等分；竖排两行（代码 + 名称），永不截断 */
  .panel.open {
    max-height: 78px;

    .panel-inner {
      grid-template-columns: repeat(16, minmax(0, 1fr));
      gap: 7px;
      padding: 9px 16px;
    }
    .type-chip {
      position: relative;
      padding: 6px 2px;

      b {
        font-size: 15px;
      }
      /* 中等宽度（平板/小笔记本）：用 2 字简称，保证不截断 */
      .cn-full {
        display: none;
      }
      .cn-short {
        display: block;
        font-size: 13px;
        letter-spacing: 0.5px;
        opacity: 0.9;
      }

      /* 气质组之间的分隔（NT / NF / SJ / SP） */
      &:nth-child(5),
      &:nth-child(9),
      &:nth-child(13) {
        margin-left: 9px;
      }
      &:nth-child(5)::before,
      &:nth-child(9)::before,
      &:nth-child(13)::before {
        content: '';
        position: absolute;
        left: -8px;
        top: 12%;
        bottom: 12%;
        width: 1px;
        background: #c6ddcd;
      }

      &:hover:not(.active) {
        transform: translateY(-1px);
        box-shadow: 0 2px 6px rgba(27, 107, 58, 0.15);
      }
    }
  }

  /* 宽屏（≥1100px）：每格足够宽，完整中文名直接显示，无需简称 */
  @media (min-width: 1100px) {
    .panel.open {
      .type-chip {
        .cn-full {
          display: block;
          font-size: 13px;
          letter-spacing: 0.5px;
          opacity: 0.9;
        }
        .cn-short {
          display: none;
        }
      }
    }
  }

  /* 「仅代码」模式下 PC 可再压低一行 */
  .panel.open.compact {
    max-height: 50px;

    .panel-inner {
      padding: 6px 16px;
    }
  }

  /* 报告卡片化（可关）
     注意：这里绝不能再写 overflow:hidden —— 那样会连滚动一起干掉
     （border-radius + overflow:auto 本身就能做圆角裁切） */
  .report-wrap:not(.plain) {
    margin: 0 16px 14px;
    border: 1px solid #d2e4d6;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(27, 107, 58, 0.05);
  }
}

/* ===== 降低动效偏好：关掉过渡与动画，避免前庭敏感用户不适 ===== */
@media (prefers-reduced-motion: reduce) {
  .mbti-app *,
  .mbti-app *::before,
  .mbti-app *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  .report-wrap {
    scroll-behavior: auto !important;
  }
}
</style>
