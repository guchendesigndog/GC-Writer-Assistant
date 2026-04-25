import React, { useState, useEffect, useRef, useCallback } from 'react'
import './styles/App.css'
import JSZip from 'jszip'
import { getApiConfig, saveApiConfig } from './config/api-config.js'
import { skills } from './runtime-skills/index.js'

// --- Module-level drag state (external resizers) ---
const refs = {
  leftPanel: null,
  rightPanel: null,
  leftWidth: 500,
  rightWidth: 400,
  isResizing: false,
  side: null,
  rightToolPanels: {},     // { toolId: DOM element }
  currentActiveTools: [],  // current active tool list (for drag handling)
  currentToolWidths: {},   // current panel widths
  rightDragStartX: 0,      // right drag start X
  _mainOrigRenderedToolIds: [],
  _mainOrigWidths: [],
  _mainOrigRightWidth: 0,
  _rightToolIds: [],       // cascade push: tool IDs in reverse order
  _rightPanelOrigWidths: {}, // cascade push: original widths
  // Internal resizer state
  isInternalResizing: false,
  internalSide: null,
  internalStartY: 0,
  internalTotalH: 0,
  internalOrigOutlineH: 0,
  internalOrigCharsH: 0,
  internalOrigUpperH: 0,
  rangeSectionEl: null,
  outlineBlockEl: null,
  charsPanelEl: null,
  mainContentEl: null,
}

const MIN_UPPER_HEIGHT = 170
const MIN_OUTLINE_HEIGHT = 50
const MIN_CHARS_HEIGHT = 50
const INTERNAL_RESIZER_HEIGHT = 8
const RIGHT_PANEL_COLLAPSED_WIDTH = 68
const MIN_TOOL_WIDTH = 150
const MIN_CENTER_WIDTH = 5
const TOOL_RESIZER_WIDTH = 4
const DEFAULT_TOOL_WIDTH = 352
const RIGHT_DOCK_ITEMS = [
  { id: 'writing', shortLabel: '\u5199', label: '\u7801\u5b57' },
  { id: 'assistant', shortLabel: '\u8f85', label: 'AI\u8f85\u52a9' },
  { id: 'map', shortLabel: '\u56fe', label: '\u5730\u56fe' },
  { id: 'characters', shortLabel: '\u89d2', label: '\u89d2\u8272' },
  { id: 'setting', shortLabel: '\u8bbe', label: '\u8bbe\u5b9a' },
  { id: 'placeholder1', shortLabel: '\u7a7a', label: '\u529f\u80fd1' },
  { id: 'placeholder2', shortLabel: '\u7a7a', label: '\u529f\u80fd2' },
  { id: 'placeholder3', shortLabel: '\u7a7a', label: '\u529f\u80fd3' },
]
const RIGHT_SETTINGS_ITEM = { id: 'settings-panel', shortLabel: '\u2699', label: '\u8bbe\u7f6e' }
const FONT_FAMILY_OPTIONS = [
  { value: "'Microsoft YaHei UI', 'PingFang SC', sans-serif", label: '\u5fae\u8f6f\u96c5\u9ed1' },
  { value: "'PingFang SC', 'Microsoft YaHei UI', sans-serif", label: '\u82f9\u65b9' },
  { value: "'Noto Serif SC', 'Source Han Serif SC', serif", label: '\u601d\u6e90\u5b8b\u4f53' },
  { value: "'Source Han Sans SC', 'Noto Sans SC', sans-serif", label: '\u601d\u6e90\u9ed1\u4f53' },
  { value: "'KaiTi', 'STKaiti', serif", label: '\u6977\u4f53' },
]
const TEXT_SECTION_OPTIONS = [
  { key: 'chapterList', label: '\u7ae0\u8282\u5217\u8868\u5185\u5bb9' },
  { key: 'outline', label: '\u7ae0\u8282\u5927\u7eb2\u5185\u5bb9' },
  { key: 'placeholder', label: '\u529f\u80fd\u7a7a\u7f6e\u6587\u5b57' },
  { key: 'writing', label: '\u7801\u5b57\u6b63\u6587' },
  { key: 'aiPolish', label: 'AI\u6da6\u8272\u5185\u5bb9' },
  { key: 'aiContinue', label: 'AI\u7eed\u5199\u5185\u5bb9' },
  { key: 'storyline', label: '\u4e3b\u7ebf\u6846\u67b6\u5185\u5bb9' },
]
const LIGHT_THEME_VALUES = {
  pageBg: '#f5f5f5',
  panelBg: '#ffffff',
  centerBg: '#f3f3f5',
  surfaceBg: '#fafbfc',
  cardBg: '#f7f8fb',
  inputBg: '#ffffff',
  editorBg: '#fafbfd',
  textColor: '#4a515d',
  headingColor: '#20242c',
  mutedTextColor: '#7a808c',
  borderColor: '#dfe3ea',
  accent: '#5b8def',
  uiFontFamily: "'Microsoft YaHei UI', 'PingFang SC', sans-serif",
  contentFontFamily: "'Microsoft YaHei UI', 'PingFang SC', sans-serif",
  uiFontSize: 13,
  contentFontSize: 16,
  titleFontSize: 18,
}
const DARK_THEME_VALUES = {
  pageBg: '#141820',
  panelBg: '#1b212b',
  centerBg: '#161b24',
  surfaceBg: '#212734',
  cardBg: '#252d3a',
  inputBg: '#222a37',
  editorBg: '#171d27',
  textColor: '#d9e0ea',
  headingColor: '#f4f7fb',
  mutedTextColor: '#98a3b5',
  borderColor: '#323b4b',
  accent: '#7ea9ff',
  uiFontFamily: "'Microsoft YaHei UI', 'PingFang SC', sans-serif",
  contentFontFamily: "'Microsoft YaHei UI', 'PingFang SC', sans-serif",
  uiFontSize: 13,
  contentFontSize: 16,
  titleFontSize: 18,
}
const CUSTOM_THEME_VALUES = {
  pageBg: '#f4f1ec',
  panelBg: '#fffdf9',
  centerBg: '#f5f1ea',
  surfaceBg: '#fcfaf6',
  cardBg: '#f7f3eb',
  inputBg: '#fffdf9',
  editorBg: '#fffdf9',
  textColor: '#4b4f58',
  headingColor: '#23262d',
  mutedTextColor: '#7d8491',
  borderColor: '#ddd8cf',
  accent: '#5b8def',
  uiFontFamily: "'Microsoft YaHei UI', 'PingFang SC', sans-serif",
  contentFontFamily: "'Noto Serif SC', 'Source Han Serif SC', serif",
  uiFontSize: 13,
  contentFontSize: 16,
  titleFontSize: 18,
}
const THEME_PRESET_LABELS = {
  light: '\u4eae\u8272\u4e3b\u9898',
  dark: '\u6697\u8272\u4e3b\u9898',
  custom: '\u81ea\u5b9a\u4e49\u4e3b\u9898',
}
const DEFAULT_THEME_CONFIG = {
  preset: 'custom',
  ...CUSTOM_THEME_VALUES,
}
const WRITING_WORKSPACE_STORAGE_KEY = 'novel_writing_workspace_v3'
const WRITING_WORKSPACE_EVENT = 'novel-writing-workspace-updated'
const WRITING_DIRECTORY_DB_NAME = 'novel-writing-directory-db'
const WRITING_DIRECTORY_STORE_NAME = 'handles'
const WRITING_DIRECTORY_HANDLE_KEY = 'workspace-directory'
const WRITING_DIRECTORY_CHAPTERS_DIR = 'chapters'
const WRITING_DIRECTORY_TRASH_DIR = '回收站'
let writingWorkspaceSnapshot = null

function sanitizeWritingFilename(name, fallback = 'chapter') {
  const clean = String(name || '').replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim()
  return clean || fallback
}

function openWritingDirectoryDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('indexedDB unavailable'))
      return
    }
    const request = indexedDB.open(WRITING_DIRECTORY_DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(WRITING_DIRECTORY_STORE_NAME)) {
        db.createObjectStore(WRITING_DIRECTORY_STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('failed to open indexedDB'))
  })
}

async function saveWritingDirectoryHandle(handle) {
  const db = await openWritingDirectoryDb()
  await new Promise((resolve, reject) => {
    const tx = db.transaction(WRITING_DIRECTORY_STORE_NAME, 'readwrite')
    tx.objectStore(WRITING_DIRECTORY_STORE_NAME).put(handle, WRITING_DIRECTORY_HANDLE_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error || new Error('failed to save directory handle'))
  })
  db.close()
}

async function loadWritingDirectoryHandle() {
  const db = await openWritingDirectoryDb()
  const handle = await new Promise((resolve, reject) => {
    const tx = db.transaction(WRITING_DIRECTORY_STORE_NAME, 'readonly')
    const request = tx.objectStore(WRITING_DIRECTORY_STORE_NAME).get(WRITING_DIRECTORY_HANDLE_KEY)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error || new Error('failed to load directory handle'))
  })
  db.close()
  return handle
}

async function clearWritingDirectoryHandle() {
  const db = await openWritingDirectoryDb()
  await new Promise((resolve, reject) => {
    const tx = db.transaction(WRITING_DIRECTORY_STORE_NAME, 'readwrite')
    tx.objectStore(WRITING_DIRECTORY_STORE_NAME).delete(WRITING_DIRECTORY_HANDLE_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error || new Error('failed to clear directory handle'))
  })
  db.close()
}

async function ensureWritingDirectoryPermission(handle, requestWrite = false) {
  if (!handle || typeof handle.queryPermission !== 'function') return false
  const options = requestWrite ? { mode: 'readwrite' } : { mode: 'readwrite' }
  if (await handle.queryPermission(options) === 'granted') return true
  if (!requestWrite || typeof handle.requestPermission !== 'function') return false
  return (await handle.requestPermission(options)) === 'granted'
}

function createWritingChapter(number = '1', title = '', content = '', prefix = '第', suffix = '章') {
  return {
    id: 'writing_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    prefix: prefix || '第',
    number: String(number ?? '').trim(),
    suffix: suffix || '章',
    title: title || '',
    content: content || '',
  }
}

function normalizeWritingChapter(chapter, index) {
  return {
    id: chapter && chapter.id ? chapter.id : 'writing_legacy_' + index,
    prefix: String(chapter && chapter.prefix != null ? chapter.prefix : '第'),
    number: String(chapter && chapter.number != null ? chapter.number : index + 1).trim(),
    suffix: String(chapter && chapter.suffix != null ? chapter.suffix : '章'),
    title: String(chapter && chapter.title != null ? chapter.title : ''),
    content: String(chapter && chapter.content != null ? chapter.content : ''),
  }
}

function createDefaultWritingWorkspace() {
  const first = createWritingChapter('1', '', '')
  return {
    chapters: [first],
    activeChapterId: first.id,
  }
}

function loadWritingWorkspace() {
  try {
    const raw = localStorage.getItem(WRITING_WORKSPACE_STORAGE_KEY)
    if (!raw) return createDefaultWritingWorkspace()
    const parsed = JSON.parse(raw)
    const chapters = Array.isArray(parsed?.chapters)
      ? parsed.chapters.map((chapter, index) => normalizeWritingChapter(chapter, index))
      : []
    if (!chapters.length) return createDefaultWritingWorkspace()
    const activeChapterId = chapters.some(chapter => chapter.id === parsed?.activeChapterId)
      ? parsed.activeChapterId
      : chapters[0].id
    return { chapters, activeChapterId }
  } catch (e) {
    return createDefaultWritingWorkspace()
  }
}

function saveWritingWorkspace(workspace) {
  try {
    localStorage.setItem(WRITING_WORKSPACE_STORAGE_KEY, JSON.stringify(workspace))
  } catch (e) {}
}

function parseWritingChapterLabel(label, fallbackId, fallbackIndex = 0) {
  const raw = String(label || '').trim()
  if (!raw) {
    return normalizeWritingChapter({ id: fallbackId, number: String(fallbackIndex + 1) }, fallbackIndex)
  }
  const match = raw.match(/^(.*?)(\d+)([^\d\s]*)(?:\s+(.*))?$/)
  if (!match) {
    return normalizeWritingChapter({
      id: fallbackId,
      prefix: '第',
      number: String(fallbackIndex + 1),
      suffix: '章',
      title: raw,
    }, fallbackIndex)
  }
  const [, prefixPart, numberPart, suffixPart, titlePart] = match
  return normalizeWritingChapter({
    id: fallbackId,
    prefix: String(prefixPart || '第').trim() || '第',
    number: String(numberPart || '').trim() || String(fallbackIndex + 1),
    suffix: String(suffixPart || '章').trim() || '章',
    title: String(titlePart || '').trim(),
  }, fallbackIndex)
}

async function readTextFromFileHandle(fileHandle) {
  const file = await fileHandle.getFile()
  return file.text()
}

async function writeTextToFileHandle(fileHandle, text) {
  const writable = await fileHandle.createWritable()
  await writable.write(text)
  await writable.close()
}

async function moveChapterFileToTrash(directoryHandle, relativePath, reason = 'deleted') {
  if (!directoryHandle || !relativePath) return false
  try {
    const normalizedPath = String(relativePath).replace(/\\/g, '/').replace(/^\/+/, '')
    const segments = normalizedPath.split('/').filter(Boolean)
    if (!segments.length) return false
    let parentDir = directoryHandle
    for (let i = 0; i < segments.length - 1; i += 1) {
      parentDir = await parentDir.getDirectoryHandle(segments[i])
    }
    const fileName = segments[segments.length - 1]
    const sourceFileHandle = await parentDir.getFileHandle(fileName)
    const trashDir = await directoryHandle.getDirectoryHandle(WRITING_DIRECTORY_TRASH_DIR, { create: true })
    const trashName = `${new Date().toISOString().replace(/[:.]/g, '-')}__${reason}__${fileName}`
    const trashHandle = await trashDir.getFileHandle(trashName, { create: true })
    await writeTextToFileHandle(trashHandle, await readTextFromFileHandle(sourceFileHandle))
    if (typeof parentDir.removeEntry === 'function') {
      await parentDir.removeEntry(fileName)
    }
    return true
  } catch (e) {
    return false
  }
}

async function loadWritingWorkspaceFromDirectory(directoryHandle) {
  if (!directoryHandle || typeof directoryHandle.getFileHandle !== 'function') return null
  let parsed = null
  try {
    const fileHandle = await directoryHandle.getFileHandle('workspace.json')
    const raw = await readTextFromFileHandle(fileHandle)
    parsed = JSON.parse(raw)
  } catch (e) {}

  let chapters = []
  try {
    const chaptersDir = await directoryHandle.getDirectoryHandle(WRITING_DIRECTORY_CHAPTERS_DIR)
    const loaded = []
    let index = 0
    for await (const entry of chaptersDir.values()) {
      if (!entry || entry.kind !== 'file' || !/\.txt$/i.test(entry.name || '')) continue
      const raw = await readTextFromFileHandle(entry)
      const normalized = String(raw || '').replace(/\r\n/g, '\n')
      const separatorIndex = normalized.indexOf('\n\n')
      const titleLine = separatorIndex >= 0 ? normalized.slice(0, separatorIndex).trim() : normalized.split('\n')[0].trim()
      const content = separatorIndex >= 0
        ? normalized.slice(separatorIndex + 2).replace(/^\n+/, '')
        : normalized.split('\n').slice(1).join('\n').replace(/^\n+/, '')
      const idMatch = String(entry.name || '').match(/__([^./\\]+)\.txt$/i)
      const chapterId = idMatch?.[1] || `writing_imported_${index}`
      const chapter = parseWritingChapterLabel(titleLine, chapterId, index)
      chapter.content = content
      loaded.push(chapter)
      index += 1
    }
    if (loaded.length) {
      chapters = loaded.sort(compareWritingChapters)
    }
  } catch (e) {}

  if (!chapters.length) {
    chapters = Array.isArray(parsed?.chapters)
      ? parsed.chapters.map((chapter, index) => normalizeWritingChapter(chapter, index))
      : []
  }
  if (!chapters.length) return null

  const activeChapterId = chapters.some(chapter => chapter.id === parsed?.activeChapterId)
    ? parsed.activeChapterId
    : chapters[0].id
  return { chapters, activeChapterId }
}

async function saveWritingWorkspaceToDirectory(directoryHandle, workspace) {
  if (!directoryHandle || typeof directoryHandle.getFileHandle !== 'function') return false
  try {
    const chaptersDir = await directoryHandle.getDirectoryHandle(WRITING_DIRECTORY_CHAPTERS_DIR, { create: true })
    let previousChapterFiles = {}
    try {
      const workspaceHandle = await directoryHandle.getFileHandle('workspace.json')
      const previousRaw = await readTextFromFileHandle(workspaceHandle)
      const previousParsed = JSON.parse(previousRaw)
      previousChapterFiles = previousParsed?.chapterFiles && typeof previousParsed.chapterFiles === 'object'
        ? previousParsed.chapterFiles
        : {}
    } catch (e) {}

    const chapterFileMap = {}
    for (const chapter of workspace.chapters || []) {
      const chapterName = sanitizeWritingFilename(getWritingChapterLabel(chapter), chapter.id)
      const fileName = `${chapterName}__${chapter.id}.txt`
      const relativePath = `${WRITING_DIRECTORY_CHAPTERS_DIR}/${fileName}`
      const previousPath = previousChapterFiles[chapter.id]
      if (previousPath && previousPath !== relativePath) {
        await moveChapterFileToTrash(directoryHandle, previousPath, 'renamed')
      }
      const fileHandle = await chaptersDir.getFileHandle(fileName, { create: true })
      const content = getWritingChapterLabel(chapter) + '\n\n' + String(chapter.content || '')
      await writeTextToFileHandle(fileHandle, content)
      chapterFileMap[chapter.id] = relativePath
    }

    for (const [chapterId, previousPath] of Object.entries(previousChapterFiles)) {
      if (!chapterFileMap[chapterId]) {
        await moveChapterFileToTrash(directoryHandle, previousPath, 'deleted')
      }
    }

    const workspaceHandle = await directoryHandle.getFileHandle('workspace.json', { create: true })
    await writeTextToFileHandle(workspaceHandle, JSON.stringify({
      activeChapterId: workspace.activeChapterId,
      updatedAt: new Date().toISOString(),
      chapters: workspace.chapters,
      chapterFiles: chapterFileMap,
    }, null, 2))
    return true
  } catch (e) {
    return false
  }
}


function getWritingWorkspaceSnapshot() {
  return writingWorkspaceSnapshot || loadWritingWorkspace()
}

function emitWritingWorkspaceSnapshot(workspace) {
  writingWorkspaceSnapshot = workspace
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(WRITING_WORKSPACE_EVENT, { detail: workspace }))
  }
}

function getWritingChapterLabel(chapter) {
  if (!chapter) return '第1章'
  const prefix = String(chapter.prefix || '第').trim() || '第'
  const number = String(chapter.number || '').trim() || '?'
  const suffix = String(chapter.suffix || '章').trim() || '章'
  const title = String(chapter.title || '').trim()
  return prefix + number + suffix + (title ? ' ' + title : '')
}

function getNextWritingChapterNumber(chapters) {
  const numbers = chapters
    .map(chapter => parseInt(String(chapter?.number || '').trim(), 10))
    .filter(number => Number.isFinite(number) && number > 0)
  return String((numbers.length ? Math.max(...numbers) : chapters.length) + 1)
}

function isApiConfigReady(config) {
  if (!config || !config.model || !config.apiKey) return false
  return Boolean(config.endpoint)
}

function compareWritingChapters(a, b) {
  const aNumber = parseInt(String(a?.number || '').trim(), 10)
  const bNumber = parseInt(String(b?.number || '').trim(), 10)
  const aValid = Number.isFinite(aNumber)
  const bValid = Number.isFinite(bNumber)
  if (aValid && bValid && aNumber !== bNumber) return aNumber - bNumber
  if (aValid && !bValid) return -1
  if (!aValid && bValid) return 1
  const aLabel = getWritingChapterLabel(a)
  const bLabel = getWritingChapterLabel(b)
  return aLabel.localeCompare(bLabel, 'zh-Hans-CN-u-kn-true')
}

const AssistantWorkspace = React.memo(function AssistantWorkspace({ apiConfig, referenceChapter, onClose }) {
  const [workspaceSnapshot, setWorkspaceSnapshot] = useState(() => getWritingWorkspaceSnapshot())
  const [polishEnabled, setPolishEnabled] = useState(false)
  const [continueEnabled, setContinueEnabled] = useState(false)
  const [polishStatus, setPolishStatus] = useState('')
  const [continueStatus, setContinueStatus] = useState('')
  const [outlineStatus, setOutlineStatus] = useState('')
  const [polishResult, setPolishResult] = useState('')
  const [continuationResult, setContinuationResult] = useState('')
  const [storylineDraft, setStorylineDraft] = useState('')
  const [storylineTouched, setStorylineTouched] = useState(false)
  const [polishRefreshing, setPolishRefreshing] = useState(false)
  const [continueRefreshing, setContinueRefreshing] = useState(false)
  const [storylineRefreshing, setStorylineRefreshing] = useState(false)
  const [assistantNotice, setAssistantNotice] = useState('')
  const [assistantHeights, setAssistantHeights] = useState({ polish: 220, continuation: 220, storyline: 180 })
  const assistantSectionsRef = useRef(null)
  const assistantDragRef = useRef({ active: false, side: null, startY: 0, totalH: 0, origPolish: 0, origContinuation: 0, origStoryline: 0 })
  const polishRunRef = useRef(0)
  const outlineRunRef = useRef(0)
  const continueRunRef = useRef(0)
  const autoPolishRef = useRef({ chapterId: null, nextTriggerWords: 200 })
  const autoContinueRef = useRef({ chapterId: null, nextTriggerWords: 200 })
  const ASSISTANT_MIN_POLISH = 140
  const ASSISTANT_MIN_CONTINUATION = 150
  const ASSISTANT_MIN_STORYLINE = 130

  const normalizeAssistantHeights = useCallback((totalH, preferred) => {
    const minTotal = ASSISTANT_MIN_POLISH + ASSISTANT_MIN_CONTINUATION + ASSISTANT_MIN_STORYLINE
    if (totalH <= minTotal) {
      return {
        polish: ASSISTANT_MIN_POLISH,
        continuation: ASSISTANT_MIN_CONTINUATION,
        storyline: ASSISTANT_MIN_STORYLINE,
      }
    }

    let polish = preferred?.polish ?? Math.round(totalH * 0.31)
    let continuation = preferred?.continuation ?? Math.round(totalH * 0.36)
    polish = Math.max(ASSISTANT_MIN_POLISH, Math.min(polish, totalH - ASSISTANT_MIN_CONTINUATION - ASSISTANT_MIN_STORYLINE))
    continuation = Math.max(ASSISTANT_MIN_CONTINUATION, Math.min(continuation, totalH - polish - ASSISTANT_MIN_STORYLINE))
    let storyline = totalH - polish - continuation

    if (storyline < ASSISTANT_MIN_STORYLINE) {
      let deficit = ASSISTANT_MIN_STORYLINE - storyline
      const shrinkContinuation = Math.min(deficit, continuation - ASSISTANT_MIN_CONTINUATION)
      continuation -= shrinkContinuation
      deficit -= shrinkContinuation
      if (deficit > 0) {
        const shrinkPolish = Math.min(deficit, polish - ASSISTANT_MIN_POLISH)
        polish -= shrinkPolish
      }
      storyline = totalH - polish - continuation
    }

    return { polish, continuation, storyline }
  }, [chaptersListData])

  useEffect(() => {
    const syncAssistantHeights = () => {
      if (!assistantSectionsRef.current || assistantDragRef.current.active) return
      const totalH = assistantSectionsRef.current.offsetHeight - 10
      if (totalH <= 0) return
      setAssistantHeights(current => normalizeAssistantHeights(totalH, current))
    }
    syncAssistantHeights()
    window.addEventListener('resize', syncAssistantHeights)
    return () => window.removeEventListener('resize', syncAssistantHeights)
  }, [normalizeAssistantHeights, assistantNotice])

  useEffect(() => {
    const handleMove = (event) => {
      if (!assistantDragRef.current.active) return
      const { side, startY, totalH, origPolish, origContinuation, origStoryline } = assistantDragRef.current
      const deltaY = event.clientY - startY
      const origTop = origPolish
      const origMid = origPolish + origContinuation

      if (side === 'top') {
        let topY = Math.max(ASSISTANT_MIN_POLISH, Math.min(origTop + deltaY, totalH - ASSISTANT_MIN_CONTINUATION - ASSISTANT_MIN_STORYLINE))
        let midY = origMid
        if (topY > midY - ASSISTANT_MIN_CONTINUATION) {
          midY = topY + ASSISTANT_MIN_CONTINUATION
        }
        if (midY > totalH - ASSISTANT_MIN_STORYLINE) {
          midY = totalH - ASSISTANT_MIN_STORYLINE
          topY = midY - ASSISTANT_MIN_CONTINUATION
        }
        setAssistantHeights({
          polish: topY,
          continuation: midY - topY,
          storyline: totalH - midY,
        })
        assistantDragRef.current.startY = event.clientY
        assistantDragRef.current.origPolish = topY
        assistantDragRef.current.origContinuation = midY - topY
        assistantDragRef.current.origStoryline = totalH - midY
      } else if (side === 'mid') {
        let topY = origTop
        let midY = Math.max(ASSISTANT_MIN_POLISH + ASSISTANT_MIN_CONTINUATION, Math.min(origMid + deltaY, totalH - ASSISTANT_MIN_STORYLINE))
        if (midY < topY + ASSISTANT_MIN_CONTINUATION) {
          topY = midY - ASSISTANT_MIN_CONTINUATION
        }
        if (topY < ASSISTANT_MIN_POLISH) {
          topY = ASSISTANT_MIN_POLISH
          midY = topY + ASSISTANT_MIN_CONTINUATION
        }
        setAssistantHeights({
          polish: topY,
          continuation: midY - topY,
          storyline: totalH - midY,
        })
        assistantDragRef.current.startY = event.clientY
        assistantDragRef.current.origPolish = topY
        assistantDragRef.current.origContinuation = midY - topY
        assistantDragRef.current.origStoryline = totalH - midY
      }
    }

    const handleUp = () => {
      if (!assistantDragRef.current.active) return
      assistantDragRef.current.active = false
      assistantDragRef.current.side = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
    return () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
    }
  }, [chaptersListData])

  const startAssistantDrag = useCallback((side) => {
    return (event) => {
      if (!assistantSectionsRef.current) return
      event.preventDefault()
      const totalH = assistantSectionsRef.current.offsetHeight - 10
      assistantDragRef.current = {
        active: true,
        side,
        startY: event.clientY,
        totalH,
        origPolish: assistantHeights.polish,
        origContinuation: assistantHeights.continuation,
        origStoryline: assistantHeights.storyline,
      }
      document.body.style.cursor = 'row-resize'
      document.body.style.userSelect = 'none'
    }
  }, [assistantHeights])

  useEffect(() => {
    const handleWorkspaceUpdate = (event) => {
      const nextWorkspace = event?.detail || getWritingWorkspaceSnapshot()
      setWorkspaceSnapshot(nextWorkspace)
    }
    if (typeof window !== 'undefined') {
      window.addEventListener(WRITING_WORKSPACE_EVENT, handleWorkspaceUpdate)
      return () => window.removeEventListener(WRITING_WORKSPACE_EVENT, handleWorkspaceUpdate)
    }
    return undefined
  }, [chaptersListData])

  useEffect(() => {
    if (!assistantNotice) return
    const timer = setTimeout(() => setAssistantNotice(''), 3000)
    return () => clearTimeout(timer)
  }, [assistantNotice])

  const writingChapters = workspaceSnapshot?.chapters || []
  const activeWritingChapter = writingChapters.find(chapter => chapter.id === workspaceSnapshot?.activeChapterId) || writingChapters[0] || null
  const referenceText = String(referenceChapter?.content || '').trim()
  const currentWritingText = String(activeWritingChapter?.content || '').trim()
  const currentWritingWords = currentWritingText.replace(/\s/g, '').length
  const currentWritingTitle = getWritingChapterLabel(activeWritingChapter)
  const polishSkill = skills.find(item => item.name === 'ai-polish')
  const continueSkill = skills.find(item => item.name === 'ai-continue')
  const storylineSkill = skills.find(item => item.name === 'ai-storyline')

  const ensureApiReady = useCallback(() => {
    if (isApiConfigReady(apiConfig)) return true
    setAssistantNotice('请先在设置里配置可用的 API Key、模型和端点。')
    return false
  }, [apiConfig])

  const runPolish = useCallback(async (source = 'manual') => {
    if (!ensureApiReady()) return false
    if (!currentWritingText) {
      setPolishResult('')
      setPolishStatus('')
      return false
    }
    if (!polishSkill) {
      setPolishStatus('未找到润色 skill')
      return false
    }

    const currentRun = ++polishRunRef.current
    setPolishRefreshing(true)
    setPolishStatus(source === 'auto' ? '自动润色中...' : '正在润色...')

    try {
      const result = await polishSkill.run(apiConfig, {
        referenceChapter,
        writingChapter: activeWritingChapter,
      })
      if (currentRun !== polishRunRef.current) return false
      if (!result.ok) {
        setPolishStatus(result.error || '润色失败')
        return false
      }
      setPolishResult(String(result.data?.content || '').trim())
      setPolishStatus(source === 'auto' ? '已自动更新润色' : '已完成润色')
      return true
    } finally {
      if (currentRun === polishRunRef.current) {
        setPolishRefreshing(false)
      }
    }
  }, [activeWritingChapter, apiConfig, currentWritingText, ensureApiReady, polishSkill, referenceChapter])

  const runStoryline = useCallback(async (options = {}) => {
    const preserveManualDraft = options.preserveManualDraft !== false
    if (!ensureApiReady()) return ''
    if (!currentWritingText) {
      setStorylineDraft('')
      setOutlineStatus('')
      return ''
    }
    if (!storylineSkill) {
      setOutlineStatus('未找到主线总结 skill')
      return ''
    }

    const currentRun = ++outlineRunRef.current
    setStorylineRefreshing(true)
    setOutlineStatus('正在整理主线...')

    try {
      const result = await storylineSkill.run(apiConfig, {
        referenceChapter,
        writingChapter: activeWritingChapter,
      })
      if (currentRun !== outlineRunRef.current) return ''
      if (!result.ok) {
        setOutlineStatus(result.error || '主线整理失败')
        return ''
      }
      const nextOutline = String(result.data?.content || '').trim()
      if (!preserveManualDraft || !storylineTouched || !String(storylineDraft || '').trim()) {
        setStorylineDraft(nextOutline)
        setStorylineTouched(false)
      }
      setOutlineStatus('已更新主线框架')
      return nextOutline
    } finally {
      if (currentRun === outlineRunRef.current) {
        setStorylineRefreshing(false)
      }
    }
  }, [activeWritingChapter, apiConfig, currentWritingText, ensureApiReady, referenceChapter, storylineDraft, storylineSkill, storylineTouched])

  const runContinuation = useCallback(async (source = 'manual') => {
    if (!ensureApiReady()) return false
    if (!currentWritingText) {
      setContinuationResult('')
      setContinueStatus('')
      return false
    }
    if (!continueSkill) {
      setContinueStatus('未找到续写 skill')
      return false
    }

    const currentRun = ++continueRunRef.current
    setContinueRefreshing(true)
    setContinueStatus(source === 'auto' ? '自动续写中...' : '正在续写...')
    const baseStoryline = String(storylineDraft || '').trim()
    const storylinePromise = runStoryline({ preserveManualDraft: true })

    try {
      const result = await continueSkill.run(apiConfig, {
        referenceChapter,
        writingChapter: activeWritingChapter,
        storyline: baseStoryline,
      })
      await storylinePromise
      if (currentRun !== continueRunRef.current) return false
      if (!result.ok) {
        setContinueStatus(result.error || '续写失败')
        return false
      }
      setContinuationResult(String(result.data?.content || '').trim())
      setContinueStatus(source === 'auto' ? '已自动更新续写' : '已生成续写建议')
      return true
    } finally {
      if (currentRun === continueRunRef.current) {
        setContinueRefreshing(false)
      }
    }
  }, [activeWritingChapter, apiConfig, continueSkill, currentWritingText, ensureApiReady, referenceChapter, runStoryline, storylineDraft])

  const togglePolish = useCallback(() => {
    if (!polishEnabled) {
      if (!ensureApiReady()) return
      setAssistantNotice('')
      autoPolishRef.current = {
        chapterId: activeWritingChapter?.id || null,
        nextTriggerWords: currentWritingWords + 300,
      }
      setPolishEnabled(true)
      void runPolish('manual')
      return
    }
    setAssistantNotice('')
    setPolishEnabled(false)
    setPolishRefreshing(false)
  }, [activeWritingChapter, currentWritingWords, ensureApiReady, polishEnabled, runPolish])

  const toggleContinuation = useCallback(() => {
    if (!continueEnabled && !ensureApiReady()) return
    setAssistantNotice('')
    if (!continueEnabled) {
      autoContinueRef.current = {
        chapterId: activeWritingChapter?.id || null,
        nextTriggerWords: currentWritingWords + 300,
      }
      setContinueEnabled(true)
      void runContinuation('manual')
      return
    }
    setContinueEnabled(false)
    if (continueEnabled) {
      setContinueRefreshing(false)
      setStorylineRefreshing(false)
    }
  }, [activeWritingChapter, continueEnabled, currentWritingWords, ensureApiReady, runContinuation])

  useEffect(() => {
    if (!polishEnabled) {
      autoPolishRef.current = {
        chapterId: activeWritingChapter?.id || null,
        nextTriggerWords: currentWritingWords + 300,
      }
      return
    }
    const chapterId = activeWritingChapter?.id || null
    if (!chapterId || !currentWritingWords) return

    if (autoPolishRef.current.chapterId !== chapterId) {
      autoPolishRef.current = {
        chapterId,
        nextTriggerWords: currentWritingWords + 300,
      }
      return
    }

    if (currentWritingWords >= autoPolishRef.current.nextTriggerWords && !polishRefreshing) {
      autoPolishRef.current = {
        chapterId,
        nextTriggerWords: currentWritingWords + 300,
      }
      void runPolish('auto')
    }
  }, [activeWritingChapter, currentWritingWords, polishEnabled, polishRefreshing, runPolish])

  useEffect(() => {
    if (!continueEnabled) {
      autoContinueRef.current = {
        chapterId: activeWritingChapter?.id || null,
        nextTriggerWords: currentWritingWords + 300,
      }
      return
    }
    const chapterId = activeWritingChapter?.id || null
    if (!chapterId || !currentWritingWords) return

    if (autoContinueRef.current.chapterId !== chapterId) {
      autoContinueRef.current = {
        chapterId,
        nextTriggerWords: currentWritingWords + 300,
      }
      return
    }

    if (currentWritingWords >= autoContinueRef.current.nextTriggerWords && !continueRefreshing && !storylineRefreshing) {
      autoContinueRef.current = {
        chapterId,
        nextTriggerWords: currentWritingWords + 300,
      }
      void runContinuation('auto')
    }
  }, [activeWritingChapter, continueEnabled, continueRefreshing, currentWritingWords, runContinuation, storylineRefreshing])

  useEffect(() => {
    if (currentWritingText) return
    setContinuationResult('')
    setStorylineDraft('')
    setContinueStatus('')
    setOutlineStatus('')
  }, [currentWritingText])

  return (
    <div className="right-drawer-panel">
      <div className="right-drawer-header assistant-drawer-header">
        <div className="assistant-topbar-group">
          <strong>{'AI润色'}</strong>
          <button
            type="button"
            className={'assistant-toggle' + (polishEnabled ? ' active' : '')}
            onClick={togglePolish}
          >
            <span className="assistant-toggle-thumb"></span>
          </button>
          <button
            type="button"
            className={'assistant-refresh-btn' + (polishRefreshing ? ' spinning' : '')}
            onClick={() => void runPolish('manual')}
            disabled={!polishEnabled || !currentWritingText}
            title={'刷新润色'}
          >
            <span className="assistant-refresh-icon">{'↻'}</span>
          </button>
        </div>
        <button type="button" className="drawer-close-btn" onClick={onClose}>{'\u00d7'}</button>
      </div>
      <div className="right-drawer-body assistant-workspace-body">
        {assistantNotice && <div className="assistant-notice">{assistantNotice}</div>}
        <div className="assistant-sections" ref={assistantSectionsRef}>
          <div className="assistant-panel assistant-polish-panel" style={{ height: assistantHeights.polish }}>
            <div className="assistant-panel-output">
              {polishResult || polishStatus || '实时润色结果'}
            </div>
          </div>

          <div className="internal-resizer assistant-draggable-divider" onMouseDown={startAssistantDrag('top')}></div>

          <div className="assistant-panel assistant-continue-panel" style={{ height: assistantHeights.continuation }}>
            <div className="assistant-panel-header">
              <strong>{'AI续写'}</strong>
              <button
                type="button"
                className={'assistant-toggle' + (continueEnabled ? ' active' : '')}
                onClick={toggleContinuation}
              >
                <span className="assistant-toggle-thumb"></span>
              </button>
              <button
                type="button"
                className={'assistant-refresh-btn' + (continueRefreshing ? ' spinning' : '')}
                onClick={() => void runContinuation('manual')}
                disabled={!continueEnabled || !currentWritingText}
                title={'刷新续写'}
              >
                <span className="assistant-refresh-icon">{'↻'}</span>
              </button>
            </div>
            <div className="assistant-panel-output assistant-continuation-output">
              {continuationResult || continueStatus || 'AI续写内容'}
            </div>
          </div>

          <div className="internal-resizer assistant-draggable-divider" onMouseDown={startAssistantDrag('mid')}></div>

          <div className="assistant-panel assistant-storyline-panel" style={{ height: assistantHeights.storyline }}>
            <div className="assistant-storyline-title-row">
              <strong>{'当前主线框架'}</strong>
              <button
                type="button"
                className={'assistant-refresh-btn assistant-refresh-secondary' + (storylineRefreshing ? ' spinning' : '')}
                onClick={() => void runStoryline()}
                disabled={!continueEnabled || !currentWritingText}
                title={'刷新主线框架'}
              >
                <span className="assistant-refresh-icon">{'↻'}</span>
              </button>
            </div>
            <textarea
              className="assistant-storyline-editor"
              value={storylineDraft}
              onChange={e => {
                setStorylineTouched(true)
                setStorylineDraft(e.target.value)
              }}
              placeholder={outlineStatus || '请分点写主线，再补总结'}
            />
          </div>
        </div>
      </div>
    </div>
  )
})

const WritingWorkspace = React.memo(function WritingWorkspace({ onClose }) {
  const initialWorkspace = React.useMemo(() => loadWritingWorkspace(), [])
  const [chapters, setChapters] = useState(initialWorkspace.chapters)
  const [activeChapterId, setActiveChapterId] = useState(initialWorkspace.activeChapterId)
  const [chapterSearch, setChapterSearch] = useState('')
  const deferredChapterSearch = React.useDeferredValue(chapterSearch)
  const [chapterSearchOpen, setChapterSearchOpen] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  const [contextMenu, setContextMenu] = useState(null)
  const [deleteTargetId, setDeleteTargetId] = useState(null)
  const [draftContent, setDraftContent] = useState(() => {
    const initialActive = initialWorkspace.chapters.find(chapter => chapter.id === initialWorkspace.activeChapterId) || initialWorkspace.chapters[0]
    return initialActive?.content || ''
  })
  const deferredDraftContent = React.useDeferredValue(draftContent)
  const [workspaceDirHandle, setWorkspaceDirHandle] = useState(null)
  const [workspaceDirName, setWorkspaceDirName] = useState('')
  const searchAreaRef = useRef(null)
  const contextMenuRef = useRef(null)
  const saveRunRef = useRef(0)
  const chaptersRef = useRef(initialWorkspace.chapters)
  const activeChapterIdRef = useRef(initialWorkspace.activeChapterId)
  const draftContentRef = useRef((() => {
    const initialActive = initialWorkspace.chapters.find(chapter => chapter.id === initialWorkspace.activeChapterId) || initialWorkspace.chapters[0]
    return initialActive?.content || ''
  })())
  const workspaceDirHandleRef = useRef(null)
  const orderedChapters = React.useMemo(() => [...chapters].sort(compareWritingChapters), [chapters])
  const activeIndex = Math.max(0, orderedChapters.findIndex(chapter => chapter.id === activeChapterId))
  const activeChapterBase = orderedChapters[activeIndex] || orderedChapters[0] || null
  const activeChapter = activeChapterBase ? { ...activeChapterBase, content: draftContent } : null
  const isSavingWorkspace = saveStatus === 'saving' || saveStatus === 'saving-folder'
  const saveStatusTitle = (
    saveStatus === 'saving' ? '\u672c\u5730\u8bb0\u5fc6\u4fdd\u5b58\u4e2d'
      : saveStatus === 'saving-folder' ? '\u6b63\u5728\u5199\u5165\u672c\u5730\u6587\u4ef6\u5939'
        : saveStatus === 'saved' ? '\u5df2\u4fdd\u5b58\u5230\u672c\u5730\u8bb0\u5fc6'
          : saveStatus === 'saved-folder' ? '\u5df2\u4fdd\u5b58\u5230\u672c\u5730\u6587\u4ef6\u5939'
            : saveStatus === 'folder-unsupported' ? '\u5f53\u524d\u6d4f\u89c8\u5668\u4e0d\u652f\u6301\u6587\u4ef6\u5939\u5199\u5165'
              : saveStatus === 'folder-denied' ? '\u672a\u83b7\u5f97\u6587\u4ef6\u5939\u5199\u5165\u6743\u9650'
                : saveStatus === 'folder-error' ? '\u6587\u4ef6\u5939\u4fdd\u5b58\u5931\u8d25'
                  : ''
  )

  const buildWorkspaceSnapshot = useCallback((chapterList = chapters, nextActiveChapterId = activeChapterId, nextDraftContent = deferredDraftContent) => {
    return {
      chapters: chapterList.map(chapter => (
        chapter.id === nextActiveChapterId ? { ...chapter, content: nextDraftContent } : chapter
      )),
      activeChapterId: nextActiveChapterId,
    }
  }, [chapters, activeChapterId, deferredDraftContent])

  const flushCurrentDraft = useCallback(async () => {
    const currentChapters = chaptersRef.current || []
    const currentActiveChapterId = activeChapterIdRef.current
    const currentDraftContent = draftContentRef.current || ''
    if (!currentActiveChapterId || !currentChapters.length) return

    const snapshot = {
      chapters: currentChapters.map(chapter => (
        chapter.id === currentActiveChapterId ? { ...chapter, content: currentDraftContent } : chapter
      )),
      activeChapterId: currentActiveChapterId,
    }

    chaptersRef.current = snapshot.chapters
    saveWritingWorkspace(snapshot)
    emitWritingWorkspaceSnapshot(snapshot)

    const currentHandle = workspaceDirHandleRef.current
    if (currentHandle) {
      try {
        const hasPermission = await ensureWritingDirectoryPermission(currentHandle, false)
        if (hasPermission) {
          await saveWritingWorkspaceToDirectory(currentHandle, snapshot)
        }
      } catch (e) {}
    }
  }, [chaptersListData])

  useEffect(() => {
    chaptersRef.current = chapters
    activeChapterIdRef.current = activeChapterId
    draftContentRef.current = draftContent
    workspaceDirHandleRef.current = workspaceDirHandle
  }, [chapters, activeChapterId, draftContent, workspaceDirHandle])

  useEffect(() => {
    if (!chapters.length) {
      const fallback = createDefaultWritingWorkspace()
      setChapters(fallback.chapters)
      setActiveChapterId(fallback.activeChapterId)
      return
    }
    if (!chapters.some(chapter => chapter.id === activeChapterId)) {
      setActiveChapterId(chapters[0].id)
    }
  }, [chapters, activeChapterId])

  useEffect(() => {
    const handlePageHide = () => { void flushCurrentDraft() }
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        void flushCurrentDraft()
      }
    }
    window.addEventListener('pagehide', handlePageHide)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('pagehide', handlePageHide)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [flushCurrentDraft])

  useEffect(() => {
    setDraftContent(activeChapterBase?.content || '')
  }, [activeChapterBase?.id])

  useEffect(() => {
    const workspaceSnapshot = buildWorkspaceSnapshot()
    const timer = setTimeout(() => {
      emitWritingWorkspaceSnapshot(workspaceSnapshot)
    }, 650)
    return () => clearTimeout(timer)
  }, [buildWorkspaceSnapshot])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const storedHandle = await loadWritingDirectoryHandle()
        if (!storedHandle) return
        const hasPermission = await ensureWritingDirectoryPermission(storedHandle, false)
        if (!hasPermission) return
        if (cancelled) return
        setWorkspaceDirHandle(storedHandle)
        setWorkspaceDirName(storedHandle.name || '')
        const workspaceFromFolder = await loadWritingWorkspaceFromDirectory(storedHandle)
        if (!workspaceFromFolder || cancelled) return
        setChapters(workspaceFromFolder.chapters)
        setActiveChapterId(workspaceFromFolder.activeChapterId)
      } catch (e) {}
    })()
    return () => { cancelled = true }
  }, [chaptersListData])

  useEffect(() => {
    const workspaceSnapshot = buildWorkspaceSnapshot()
    const runId = ++saveRunRef.current
    const timer = setTimeout(() => {
      setSaveStatus(workspaceDirHandle ? 'saving-folder' : 'saving')
      void (async () => {
        saveWritingWorkspace(workspaceSnapshot)
        let savedToFolder = false
        if (workspaceDirHandle) {
          const hasPermission = await ensureWritingDirectoryPermission(workspaceDirHandle, true)
          if (hasPermission) {
            savedToFolder = await saveWritingWorkspaceToDirectory(workspaceDirHandle, workspaceSnapshot)
          }
        }
        if (runId !== saveRunRef.current) return
        setSaveStatus(savedToFolder ? 'saved-folder' : 'saved')
      })()
    }, workspaceDirHandle ? 2400 : 1600)
    return () => clearTimeout(timer)
  }, [buildWorkspaceSnapshot, workspaceDirHandle])

  useEffect(() => {
    if (!chapterSearchOpen && !contextMenu) return
    const handleGlobalPointer = (event) => {
      if (
        chapterSearchOpen &&
        searchAreaRef.current &&
        !searchAreaRef.current.contains(event.target)
      ) {
        setChapterSearchOpen(false)
      }
      if (
        contextMenu &&
        contextMenuRef.current &&
        !contextMenuRef.current.contains(event.target)
      ) {
        setContextMenu(null)
      }
    }
    document.addEventListener('mousedown', handleGlobalPointer)
    return () => document.removeEventListener('mousedown', handleGlobalPointer)
  }, [chapterSearchOpen, contextMenu])

  const filteredChapters = React.useMemo(() => {
    const keyword = deferredChapterSearch.trim().toLowerCase()
    if (!keyword) return orderedChapters
    return orderedChapters.filter(chapter => getWritingChapterLabel(chapter).toLowerCase().includes(keyword))
  }, [orderedChapters, deferredChapterSearch])

  const mergeDraftIntoChapters = useCallback((chapterList, targetId = activeChapterIdRef.current, nextDraft = draftContentRef.current) => {
    return chapterList.map(chapter => (
      chapter.id === targetId ? { ...chapter, content: nextDraft } : chapter
    ))
  }, [chaptersListData])

  const switchActiveChapter = useCallback((nextChapterId, chapterList = chaptersRef.current || chapters) => {
    if (!nextChapterId) return
    const committed = mergeDraftIntoChapters(chapterList)
    const nextChapter = committed.find(chapter => chapter.id === nextChapterId)
    setChapters(committed)
    setActiveChapterId(nextChapterId)
    setDraftContent(nextChapter?.content || '')
  }, [chapters, mergeDraftIntoChapters])

  const updateActiveChapterMeta = useCallback((patch) => {
    const currentDraft = draftContentRef.current || ''
    const currentActiveId = activeChapterIdRef.current
    if (!currentActiveId) return

    setChapters(current => current.map(chapter => (
      chapter.id === currentActiveId ? { ...chapter, content: currentDraft, ...patch } : chapter
    )))
  }, [chaptersListData])

  const goRelativeChapter = useCallback((delta) => {
    if (!orderedChapters.length) return
    const nextIndex = Math.min(Math.max(activeIndex + delta, 0), orderedChapters.length - 1)
    switchActiveChapter(orderedChapters[nextIndex].id)
    setChapterSearchOpen(false)
    setContextMenu(null)
  }, [orderedChapters, activeIndex, switchActiveChapter])

  const createNextChapter = useCallback((sourceChapterId = activeChapterIdRef.current) => {
    const currentChapters = chaptersRef.current || chapters
    const currentActiveId = activeChapterIdRef.current
    const currentDraft = draftContentRef.current || ''
    const committedChapters = mergeDraftIntoChapters(currentChapters, currentActiveId, currentDraft)
    const activeSourceChapter = committedChapters.find(chapter => chapter.id === currentActiveId)
    const sourceChapter = sourceChapterId === currentActiveId
      ? activeSourceChapter
      : (committedChapters.find(chapter => chapter.id === sourceChapterId) || activeSourceChapter)
    const insertIndex = Math.max(0, committedChapters.findIndex(chapter => chapter.id === (sourceChapter?.id || currentActiveId)))
    const nextChapter = createWritingChapter(
      getNextWritingChapterNumber(committedChapters),
      '',
      '',
      sourceChapter?.prefix || '第',
      sourceChapter?.suffix || '章',
    )
    const nextChapters = [...committedChapters, nextChapter].sort(compareWritingChapters)
    setChapters(nextChapters)
    setActiveChapterId(nextChapter.id)
    setDraftContent('')
    setChapterSearch('')
    setChapterSearchOpen(false)
    setContextMenu(null)
  }, [chapters, mergeDraftIntoChapters])

  const copyChapter = useCallback((chapterId) => {
    const currentChapters = chaptersRef.current || chapters
    const currentActiveId = activeChapterIdRef.current
    const currentDraft = draftContentRef.current || ''
    const committedChapters = mergeDraftIntoChapters(currentChapters, currentActiveId, currentDraft)
    const activeSourceChapter = committedChapters.find(chapter => chapter.id === currentActiveId)
    const sourceChapter = chapterId === currentActiveId
      ? activeSourceChapter
      : committedChapters.find(chapter => chapter.id === chapterId)
    if (!sourceChapter) return
    const sourceIndex = committedChapters.findIndex(chapter => chapter.id === chapterId)
    const copiedChapter = createWritingChapter(
      getNextWritingChapterNumber(committedChapters),
      sourceChapter.title ? sourceChapter.title + ' 复制' : '',
      sourceChapter.content,
      sourceChapter.prefix || '第',
      sourceChapter.suffix || '章',
    )
    const nextChapters = [...committedChapters]
    nextChapters.splice(sourceIndex + 1, 0, copiedChapter)
    setChapters(nextChapters)
    setActiveChapterId(copiedChapter.id)
    setDraftContent(copiedChapter.content || '')
    setChapterSearchOpen(false)
    setContextMenu(null)
  }, [chapters, mergeDraftIntoChapters])

  const requestDeleteChapter = useCallback((chapterId) => {
    setDeleteTargetId(chapterId)
    setContextMenu(null)
    setChapterSearchOpen(false)
  }, [chaptersListData])

  const confirmDeleteChapter = useCallback(() => {
    const targetId = deleteTargetId
    if (!targetId) return
    if (orderedChapters.length <= 1) {
      const fallback = createDefaultWritingWorkspace()
      setChapters(fallback.chapters)
      setActiveChapterId(fallback.activeChapterId)
      setDraftContent(fallback.chapters[0]?.content || '')
      setDeleteTargetId(null)
      saveWritingWorkspace(fallback)
      emitWritingWorkspaceSnapshot(fallback)
      const currentHandle = workspaceDirHandleRef.current
      if (currentHandle) {
        setSaveStatus('saving-folder')
        void (async () => {
          const hasPermission = await ensureWritingDirectoryPermission(currentHandle, true)
          if (hasPermission) {
            const saved = await saveWritingWorkspaceToDirectory(currentHandle, fallback)
            setSaveStatus(saved ? 'saved-folder' : 'folder-error')
          }
        })()
      }
      return
    }
    const committedOrdered = mergeDraftIntoChapters(orderedChapters)
    const deleteIndex = committedOrdered.findIndex(chapter => chapter.id === targetId)
    const nextActive = activeChapterId === targetId
      ? (committedOrdered[deleteIndex + 1] || committedOrdered[deleteIndex - 1] || committedOrdered[0])
      : committedOrdered.find(chapter => chapter.id === activeChapterId)
    const nextChapters = committedOrdered.filter(chapter => chapter.id !== targetId)
    const nextSnapshot = {
      chapters: nextChapters,
      activeChapterId: nextActive?.id || nextChapters[0]?.id || targetId,
    }
    setChapters(nextChapters)
    if (nextActive) {
      setActiveChapterId(nextActive.id)
      if (activeChapterId === targetId) {
        setDraftContent(nextActive.content || '')
      }
    }
    setDeleteTargetId(null)
    saveWritingWorkspace(nextSnapshot)
    emitWritingWorkspaceSnapshot(nextSnapshot)
    const currentHandle = workspaceDirHandleRef.current
    if (currentHandle) {
      setSaveStatus('saving-folder')
      void (async () => {
        const hasPermission = await ensureWritingDirectoryPermission(currentHandle, true)
        if (hasPermission) {
          const saved = await saveWritingWorkspaceToDirectory(currentHandle, nextSnapshot)
          setSaveStatus(saved ? 'saved-folder' : 'folder-error')
        }
      })()
    }
  }, [deleteTargetId, orderedChapters, activeChapterId, mergeDraftIntoChapters])

  const chooseWritingFolder = useCallback(async () => {
    if (typeof window === 'undefined' || typeof window.showDirectoryPicker !== 'function') {
      setSaveStatus('folder-unsupported')
      return
    }
    try {
      const directoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' })
      const hasPermission = await ensureWritingDirectoryPermission(directoryHandle, true)
      if (!hasPermission) {
        setSaveStatus('folder-denied')
        return
      }
      await saveWritingDirectoryHandle(directoryHandle)
      setWorkspaceDirHandle(directoryHandle)
      setWorkspaceDirName(directoryHandle.name || '')
      const workspaceFromFolder = await loadWritingWorkspaceFromDirectory(directoryHandle)
      if (workspaceFromFolder?.chapters?.length) {
        setChapters(workspaceFromFolder.chapters)
        setActiveChapterId(workspaceFromFolder.activeChapterId)
      } else {
        await saveWritingWorkspaceToDirectory(directoryHandle, buildWorkspaceSnapshot())
      }
      setSaveStatus('saved-folder')
    } catch (e) {
      if (String(e?.name || '') === 'AbortError') return
      setSaveStatus('folder-error')
    }
  }, [buildWorkspaceSnapshot])

  const downloadCurrentChapter = useCallback(() => {
    if (!activeChapter) return
    const title = getWritingChapterLabel(activeChapter)
    const content = title + '\n\n' + (activeChapter.content || '')
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = title.replace(/[\\/:*?"<>|]/g, '_') + '.txt'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }, [activeChapter])

  const deleteTargetChapter = chapters.find(chapter => chapter.id === deleteTargetId) || null
  const currentWordCount = draftContent.replace(/\s/g, '').length

  return (
    <div className="right-drawer-panel">
      <div className="right-drawer-header writer-drawer-header">
        <div className="writer-topbar">
          <div className="writer-chapter-format">
            <input
              type="text"
              className="writer-fixed-text-input"
              value={activeChapter?.prefix || ''}
              onChange={e => updateActiveChapterMeta({ prefix: e.target.value })}
              placeholder={'第'}
            />
            <input
              type="text"
              className="writer-chapter-number-input writer-inline-input"
              value={activeChapter?.number || ''}
              onChange={e => updateActiveChapterMeta({ number: e.target.value.replace(/[^\d]/g, '') })}
              placeholder="1"
            />
            <input
              type="text"
              className="writer-fixed-text-input"
              value={activeChapter?.suffix || ''}
              onChange={e => updateActiveChapterMeta({ suffix: e.target.value })}
              placeholder={'章'}
            />
            <input
              type="text"
              className="writer-chapter-title-input writer-inline-input"
              value={activeChapter?.title || ''}
              onChange={e => updateActiveChapterMeta({ title: e.target.value })}
              placeholder={'章节标题'}
            />
          </div>
          <div className="writer-toolbar">
            <div className="writer-chapter-search" ref={searchAreaRef}>
              <input
                type="text"
                className="writer-chapter-search-input"
                value={chapterSearch}
                onChange={e => {
                  setChapterSearch(e.target.value)
                  setChapterSearchOpen(true)
                }}
                onFocus={() => setChapterSearchOpen(true)}
                placeholder={'搜索自己写的章节'}
              />
              {chapterSearchOpen && (
                <div className="writer-chapter-search-popup">
                  <div className="writer-search-popup-header">
                    <strong>{filteredChapters.length ? '\u6211\u7684\u7ae0\u8282' : '\u6ca1\u6709\u627e\u5230\u7ae0\u8282'}</strong>
                    <span>{filteredChapters.length ? '\u53f3\u952e\u53ef\u590d\u5236/\u5220\u9664' : '\u53ef\u4ee5\u521b\u5efa\u65b0\u7ae0\u8282'}</span>
                  </div>
                  <div className="writer-search-popup-body">
                    {filteredChapters.map(chapter => (
                      <button
                        key={chapter.id}
                        type="button"
                        className={'writer-search-result-item' + (chapter.id === activeChapterId ? ' active' : '')}
                        onClick={() => {
                          switchActiveChapter(chapter.id)
                          setChapterSearchOpen(false)
                        }}
                        onContextMenu={e => {
                          e.preventDefault()
                          setContextMenu({ x: e.clientX, y: e.clientY, chapterId: chapter.id })
                        }}
                      >
                        <span className="writer-search-result-title">{getWritingChapterLabel(chapter)}</span>
                        <span className="writer-search-result-meta">{(chapter.id === activeChapterId ? draftContent : (chapter.content || '')).replace(/\s/g, '').length}{'\u5b57'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="writer-chapter-nav">
              <button type="button" className="writer-nav-btn" onClick={() => goRelativeChapter(-1)} disabled={activeIndex <= 0}>{'↑'}</button>
              <button type="button" className="writer-nav-btn" onClick={() => goRelativeChapter(1)} disabled={activeIndex >= chapters.length - 1}>{'↓'}</button>
            </div>
            <button type="button" className="writer-create-btn" onClick={() => createNextChapter()}>{'+'}</button>
          </div>
        </div>
        <button type="button" className="drawer-close-btn" onClick={onClose}>{'\u00d7'}</button>
      </div>
      <div className="right-drawer-body writer-tool-body">
        <div className="writer-shell">
          <div className="writer-surface">
            <div className="writer-editor-shell">
              <textarea
                className="writing-textarea"
                value={draftContent}
                onChange={e => { draftContentRef.current = e.target.value; setDraftContent(e.target.value) }}
                placeholder={'\u5728\u8fd9\u91cc\u5f00\u59cb\u7801\u5b57\uff0c\u7cfb\u7edf\u4f1a\u81ea\u52a8\u8bb0\u4f4f\u4f60\u7684\u7ae0\u8282\u548c\u4e0a\u6b21\u4f4d\u7f6e\u3002'}
              />
            </div>
            <div className="writing-footer">
              <span className="writer-word-count">{'\u5f53\u524d\u5b57\u6570\uff1a'}{currentWordCount}</span>
              <div className="writer-footer-actions">
                {saveStatus && (
                  <span
                    className={'writer-save-status ' + saveStatus + (isSavingWorkspace ? ' spinning' : '')}
                    title={saveStatusTitle}
                    aria-label={saveStatusTitle}
                  >
                    {'\u21bb'}
                  </span>
                )}
                <button
                  className="writer-folder-btn"
                  onClick={chooseWritingFolder}
                  title={workspaceDirName ? '\u4fdd\u5b58\u6587\u4ef6\u5939\uff1a' + workspaceDirName : '\u9009\u62e9\u672c\u5730\u6587\u4ef6\u5939'}
                >
                  {workspaceDirName ? '\u4fdd\u5b58\u6587\u4ef6\u5939\uff1a' + workspaceDirName : '\u9009\u62e9\u672c\u5730\u6587\u4ef6\u5939'}
                </button>
                <button className="save-btn" onClick={downloadCurrentChapter}>{'\u4e0b\u8f7d\u4fdd\u5b58'}</button>
              </div>
            </div>
          </div>
        </div>

        {contextMenu && (
          <div ref={contextMenuRef} className="writer-context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
            <button type="button" onClick={() => copyChapter(contextMenu.chapterId)}>{'\u590d\u5236\u7ae0\u8282'}</button>
            <button type="button" className="danger" onClick={() => requestDeleteChapter(contextMenu.chapterId)}>{'\u5220\u9664\u7ae0\u8282'}</button>
          </div>
        )}

        {deleteTargetChapter && (
          <div className="writer-modal-mask">
            <div className="writer-confirm-modal">
              <h4>{'\u5220\u9664\u7ae0\u8282'}</h4>
              <p>{'\u786e\u5b9a\u5220\u9664 ' + getWritingChapterLabel(deleteTargetChapter) + ' \u6b64\u7ae0\u8282\u5417\uff1f'}</p>
              <div className="writer-confirm-actions">
                <button type="button" className="writer-modal-btn secondary" onClick={() => setDeleteTargetId(null)}>{'\u53d6\u6d88'}</button>
                <button type="button" className="writer-modal-btn danger" onClick={confirmDeleteChapter}>{'\u786e\u5b9a'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

function getThemePresetValues(preset) {
  if (preset === 'dark') return { ...DARK_THEME_VALUES }
  if (preset === 'light') return { ...LIGHT_THEME_VALUES }
  return { ...CUSTOM_THEME_VALUES }
}

function buildDefaultTextSections(themeValues) {
  return {
    chapterList: {
      fontFamily: themeValues.uiFontFamily,
      fontSize: themeValues.uiFontSize,
      fontWeight: 600,
      color: themeValues.mutedTextColor,
    },
    outline: {
      fontFamily: themeValues.uiFontFamily,
      fontSize: themeValues.uiFontSize,
      fontWeight: 600,
      color: themeValues.mutedTextColor,
    },
    placeholder: {
      fontFamily: themeValues.uiFontFamily,
      fontSize: themeValues.uiFontSize,
      fontWeight: 600,
      color: themeValues.mutedTextColor,
    },
    writing: {
      fontFamily: themeValues.contentFontFamily,
      fontSize: themeValues.contentFontSize,
      fontWeight: 400,
      color: themeValues.textColor,
    },
    aiPolish: {
      fontFamily: themeValues.contentFontFamily,
      fontSize: Math.max(13, themeValues.contentFontSize - 2),
      fontWeight: 500,
      color: themeValues.textColor,
    },
    aiContinue: {
      fontFamily: themeValues.contentFontFamily,
      fontSize: Math.max(13, themeValues.contentFontSize - 2),
      fontWeight: 500,
      color: themeValues.textColor,
    },
    storyline: {
      fontFamily: themeValues.contentFontFamily,
      fontSize: Math.max(13, themeValues.contentFontSize - 2),
      fontWeight: 500,
      color: themeValues.textColor,
    },
  }
}

function normalizeTextSections(rawTextSections, themeValues) {
  const defaults = buildDefaultTextSections(themeValues)
  const raw = rawTextSections && typeof rawTextSections === 'object' ? rawTextSections : {}
  const normalized = {}
  TEXT_SECTION_OPTIONS.forEach(({ key }) => {
    const current = raw[key] && typeof raw[key] === 'object' ? raw[key] : {}
    normalized[key] = {
      fontFamily: current.fontFamily || defaults[key].fontFamily,
      fontSize: Number(current.fontSize ?? defaults[key].fontSize),
      fontWeight: Number(current.fontWeight ?? defaults[key].fontWeight),
      color: current.color || defaults[key].color,
    }
  })
  return normalized
}

function normalizeThemeConfig(rawConfig) {
  const raw = rawConfig && typeof rawConfig === 'object' ? rawConfig : {}
  const legacyPreset = raw.preset || (raw.mode === 'light' ? 'light' : raw.mode === 'dark' ? 'dark' : 'custom')
  const preset = ['light', 'dark', 'custom'].includes(legacyPreset) ? legacyPreset : 'custom'
  const base = getThemePresetValues(preset)
  const theme = {
    ...DEFAULT_THEME_CONFIG,
    ...base,
    ...raw,
    preset,
    uiFontSize: Number(raw.uiFontSize ?? base.uiFontSize ?? DEFAULT_THEME_CONFIG.uiFontSize),
    contentFontSize: Number(raw.contentFontSize ?? base.contentFontSize ?? DEFAULT_THEME_CONFIG.contentFontSize),
    titleFontSize: Number(raw.titleFontSize ?? base.titleFontSize ?? DEFAULT_THEME_CONFIG.titleFontSize),
  }
  theme.textSections = normalizeTextSections(raw.textSections, theme)
  return theme
}

function createThemeFromPreset(preset, currentConfig = {}) {
  const base = getThemePresetValues(preset)
  const source = normalizeThemeConfig(currentConfig)
  return normalizeThemeConfig({
    ...source,
    ...base,
    preset,
    accent: preset === 'custom' ? (source.accent || base.accent) : base.accent,
    uiFontFamily: source.uiFontFamily || base.uiFontFamily,
    contentFontFamily: source.contentFontFamily || base.contentFontFamily,
    textSections: buildDefaultTextSections({ ...source, ...base }),
  })
}

function getThemeConfig() {
  if (typeof window === 'undefined') return normalizeThemeConfig(DEFAULT_THEME_CONFIG)
  try {
    const raw = localStorage.getItem('novel_theme_config')
    if (!raw) return normalizeThemeConfig(DEFAULT_THEME_CONFIG)
    return normalizeThemeConfig(JSON.parse(raw))
  } catch (e) {
    return normalizeThemeConfig(DEFAULT_THEME_CONFIG)
  }
}

function saveThemeConfig(config) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem('novel_theme_config', JSON.stringify(normalizeThemeConfig(config)))
  } catch (e) {}
}

function applyThemeConfig(config) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const theme = normalizeThemeConfig(config)

  root.style.setProperty('--theme-accent', theme.accent)
  root.style.setProperty('--app-page-bg', theme.pageBg)
  root.style.setProperty('--app-panel-bg', theme.panelBg)
  root.style.setProperty('--app-center-bg', theme.centerBg)
  root.style.setProperty('--app-surface-bg', theme.surfaceBg)
  root.style.setProperty('--app-card-bg', theme.cardBg)
  root.style.setProperty('--app-input-bg', theme.inputBg)
  root.style.setProperty('--app-editor-bg', theme.editorBg)
  root.style.setProperty('--theme-text-color', theme.textColor)
  root.style.setProperty('--theme-heading-color', theme.headingColor)
  root.style.setProperty('--theme-muted-text', theme.mutedTextColor)
  root.style.setProperty('--theme-border-color', theme.borderColor)
  root.style.setProperty('--theme-ui-font', theme.uiFontFamily)
  root.style.setProperty('--theme-content-font', theme.contentFontFamily)
  root.style.setProperty('--theme-ui-font-size', String(theme.uiFontSize))
  root.style.setProperty('--theme-content-font-size', String(theme.contentFontSize))
  root.style.setProperty('--theme-title-font-size', String(theme.titleFontSize))
  TEXT_SECTION_OPTIONS.forEach(({ key }) => {
    const section = theme.textSections?.[key]
    if (!section) return
    root.style.setProperty(`--theme-text-${key}-font`, section.fontFamily)
    root.style.setProperty(`--theme-text-${key}-size`, String(section.fontSize))
    root.style.setProperty(`--theme-text-${key}-weight`, String(section.fontWeight))
    root.style.setProperty(`--theme-text-${key}-color`, section.color)
  })
  root.dataset.themePreset = theme.preset
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function getViewportWidth() {
  if (typeof window === 'undefined') return 0
  return window.innerWidth || document.documentElement.clientWidth || 0
}

function getEffectiveLeftPanelMinWidth(viewportWidth = getViewportWidth()) {
  if (!viewportWidth) return 320
  if (viewportWidth <= 1180) return 240
  if (viewportWidth <= 1400) return 280
  return 320
}

function getCenterPanelMinWidth() {
  return MIN_CENTER_WIDTH
}

function getRightPanelMaxWidth() {
  if (typeof window === 'undefined') return refs.rightWidth || RIGHT_PANEL_COLLAPSED_WIDTH
  const leftWidth = refs.leftPanel ? refs.leftPanel.offsetWidth : refs.leftWidth
  return Math.max(RIGHT_PANEL_COLLAPSED_WIDTH, window.innerWidth - leftWidth - getCenterPanelMinWidth())
}

function getEffectiveMinToolWidth(panelCount, maxAvailableWidth = getRightPanelMaxWidth()) {
  if (panelCount <= 0) return MIN_TOOL_WIDTH
  const usablePanelsWidth = Math.max(0, maxAvailableWidth - RIGHT_PANEL_COLLAPSED_WIDTH - panelCount * TOOL_RESIZER_WIDTH)
  return Math.max(0, Math.min(MIN_TOOL_WIDTH, Math.floor(usablePanelsWidth / panelCount)))
}

function getRightPanelMinWidth(panelCount, maxAvailableWidth = getRightPanelMaxWidth()) {
  const minToolWidth = getEffectiveMinToolWidth(panelCount, maxAvailableWidth)
  return RIGHT_PANEL_COLLAPSED_WIDTH + panelCount * TOOL_RESIZER_WIDTH + panelCount * minToolWidth
}

function collectRightPanelWidths(toolIds, fallbackMap = refs.currentToolWidths) {
  return toolIds.map(id => {
    const panel = refs.rightToolPanels[id]
    return panel ? panel.offsetWidth : (fallbackMap[id] || DEFAULT_TOOL_WIDTH)
  })
}

function applyRightPanelLayout(toolIds, widths, rightWidth) {
  const resolvedRightWidth = typeof rightWidth === 'number'
    ? rightWidth
    : (toolIds.length > 0
        ? RIGHT_PANEL_COLLAPSED_WIDTH + toolIds.length * TOOL_RESIZER_WIDTH + widths.reduce((sum, width) => sum + width, 0)
        : RIGHT_PANEL_COLLAPSED_WIDTH)

  toolIds.forEach((id, index) => {
    const panel = refs.rightToolPanels[id]
    if (panel) panel.style.width = Math.max(0, widths[index] || 0) + 'px'
  })

  refs.rightWidth = resolvedRightWidth
  if (refs.rightPanel) refs.rightPanel.style.width = resolvedRightWidth + 'px'
}

function normalizeRightToolWidths(activeTools, widthMap, maxAvailableWidth) {
  const n = activeTools.length
  if (n === 0) return {}

  const renderedTools = [...activeTools].reverse()
  const minToolWidth = getEffectiveMinToolWidth(n, maxAvailableWidth)
  const targetPanelsWidth = Math.max(0, maxAvailableWidth - RIGHT_PANEL_COLLAPSED_WIDTH - n * TOOL_RESIZER_WIDTH)
  const nextWidths = {}
  const orderedWidths = renderedTools.map(id => widthMap[id] || DEFAULT_TOOL_WIDTH)
  const totalPanelsWidth = orderedWidths.reduce((sum, width) => sum + width, 0)

  if (totalPanelsWidth > targetPanelsWidth) {
    let remainingShrink = totalPanelsWidth - targetPanelsWidth
    for (let i = 0; i < orderedWidths.length && remainingShrink > 0; i++) {
      const shrinkable = Math.max(0, orderedWidths[i] - minToolWidth)
      const appliedShrink = Math.min(shrinkable, remainingShrink)
      orderedWidths[i] -= appliedShrink
      remainingShrink -= appliedShrink
    }
  }

  renderedTools.forEach((id, index) => {
    nextWidths[id] = orderedWidths[index]
  })

  return nextWidths
}

const CHINESE_NUM_MAP = {
  '\u96f6': 0,
  '\u3007': 0,
  '\u4e00': 1,
  '\u4e8c': 2,
  '\u4e24': 2,
  '\u4e09': 3,
  '\u56db': 4,
  '\u4e94': 5,
  '\u516d': 6,
  '\u4e03': 7,
  '\u516b': 8,
  '\u4e5d': 9,
  '\u5341': 10,
  '\u767e': 100,
  '\u5343': 1000,
  '\u4e07': 10000,
}

function parseChineseNumeral(value) {
  const normalized = String(value || '').trim()
  if (!normalized) return NaN
  if (/^\d+$/.test(normalized)) return parseInt(normalized, 10)

  let total = 0
  let section = 0
  let number = 0

  for (const char of normalized) {
    const mapped = CHINESE_NUM_MAP[char]
    if (mapped === undefined) {
      return NaN
    }

    if (mapped < 10) {
      number = mapped
      continue
    }

    if (mapped === 10000) {
      section = (section + (number || 0)) * mapped
      total += section
      section = 0
      number = 0
      continue
    }

    section += (number || 1) * mapped
    number = 0
  }

  return total + section + number
}

function parseChapterNumberFromTitle(title, fallback) {
  const match = String(title || '').match(/\u7b2c\s*([\u96f6\u3007\u4e00\u4e8c\u4e24\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341\u767e\u5343\u4e070-9]+)\s*[个次回部卷章节]?/i)
  if (!match || !match[1]) return fallback

  const value = match[1].trim()
  const parsed = parseChineseNumeral(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function normalizeTitleText(text) {
  return String(text || '').replace(/[\u00a0\u3000]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function isLikelyChapterTitle(line) {
  const trimmed = normalizeTitleText(line)
  if (!trimmed || trimmed.length > 80) return false
  return /^[\s\t#]*第\s*[零〇一二两三四五六七八九十百千万0-9]+\s*(?:章|节|卷|部|回)\s*[^\n\r]*$/i.test(trimmed)
}

function escapeRegExp(text) {
  return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildSearchSnippet(text, keyword) {
  const normalizedText = String(text || '').trim()
  const normalizedKeyword = String(keyword || '').trim()
  if (!normalizedText) return ''
  if (!normalizedKeyword) return normalizedText.slice(0, 15)

  const matchIndex = normalizedText.toLowerCase().indexOf(normalizedKeyword.toLowerCase())
  if (matchIndex < 0) return normalizedText.slice(0, 15)

  const start = Math.max(0, matchIndex - 5)
  const end = Math.min(normalizedText.length, matchIndex + normalizedKeyword.length + 10)
  const prefix = start > 0 ? '…' : ''
  const suffix = end < normalizedText.length ? '…' : ''
  return prefix + normalizedText.slice(start, end) + suffix
}

function normalizeApiEndpointInput(endpoint) {
  const raw = String(endpoint || '').trim()
  const lower = raw.toLowerCase()
  if (!raw) return ''
  if (lower.includes('dashscope.aliyuncs.com/apps/')) {
    return 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
  }
  if (lower.includes('dashscope.aliyuncs.com') && !lower.includes('/compatible-mode/')) {
    return 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
  }
  return raw
}

function renderHighlightedText(text, keyword) {
  const source = String(text || '')
  const query = String(keyword || '').trim()
  if (!query) return source

  const regex = new RegExp('(' + escapeRegExp(query) + ')', 'ig')
  const parts = source.split(regex)
  return parts.map((part, index) => (
    index % 2 === 1
      ? <mark key={index} className="chapter-search-mark">{part}</mark>
      : <React.Fragment key={index}>{part}</React.Fragment>
  ))
}

function parseDocxParagraphs(docXml) {
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(docXml, 'application/xml')
  const namespace = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
  const paragraphNodes = Array.from(xmlDoc.getElementsByTagNameNS(namespace, 'p'))

  return paragraphNodes.map(node => {
    const text = Array.from(node.getElementsByTagNameNS(namespace, 't'))
      .map(item => item.textContent || '')
      .join('')
    const styleNode = node.getElementsByTagNameNS(namespace, 'pStyle')[0]
    const outlineNode = node.getElementsByTagNameNS(namespace, 'outlineLvl')[0]
    const styleValue = styleNode?.getAttributeNS(namespace, 'val') || styleNode?.getAttribute('w:val') || styleNode?.getAttribute('val') || ''
    const outlineLevel = outlineNode?.getAttributeNS(namespace, 'val') || outlineNode?.getAttribute('w:val') || outlineNode?.getAttribute('val') || ''
    const normalizedStyle = String(styleValue || '').toLowerCase()
    const normalizedText = normalizeTitleText(text)
    return {
      text: normalizedText,
      rawText: text,
      styleValue,
      outlineLevel,
      hasNumbering: node.getElementsByTagNameNS(namespace, 'numPr').length > 0,
      isHeadingStyle: /heading|title|标题/.test(normalizedStyle),
      isToc: /toc/.test(normalizedStyle),
    }
  }).filter(item => item.text)
}

function isPotentialDocxChapterParagraph(paragraph) {
  if (!paragraph || paragraph.isToc) return false
  if (isLikelyChapterTitle(paragraph.text)) return true
  if (paragraph.text.length > 80) return false
  const hasChapterToken = /第\s*[零〇一二两三四五六七八九十百千万0-9]+\s*(?:章|节|卷|部|回)/i.test(paragraph.text)
  if (hasChapterToken && (paragraph.isHeadingStyle || paragraph.hasNumbering || paragraph.outlineLevel !== '')) return true

  // Some Word files use automatic numbering, so the visible text is only a short chapter name
  // like “乱世 / 恩情 / 拜师”, while the chapter number lives in numbering metadata.
  if (paragraph.hasNumbering) {
    const text = paragraph.text.trim()
    const isShortHeading = text.length > 0 && text.length <= 24
    const looksLikeSentence = /[。！？；：]/.test(text)
    const tooManyWords = text.split(/\s+/).filter(Boolean).length > 6
    return isShortHeading && !looksLikeSentence && !tooManyWords
  }

  return false
}

function scoreDecodedText(text) {
  const normalized = String(text || '').replace(/\u0000/g, '')
  const cjkCount = (normalized.match(/[\u4e00-\u9fff]/g) || []).length
  const chapterMarkers = (normalized.match(/第\s*[零〇一二两三四五六七八九十百千万0-9]+\s*(?:章|节|卷|部|回)/g) || []).length
  const replacementCount = (normalized.match(/\uFFFD/g) || []).length
  const printableCount = (normalized.match(/[a-zA-Z0-9\u4e00-\u9fff，。！？；：“”‘’、（）《》【】—…\n\r\t ]/g) || []).length
  const mojibakeMatches = normalized.match(/(?:銆|锛|鐨|鎴|闂|鍚|璇|浠|鍙|绗|绔|涔|浜|濂|宸|鐢|鎵|鍦|瀛)/g) || []
  return cjkCount * 4 + chapterMarkers * 20 + printableCount - replacementCount * 10 - mojibakeMatches.length * 12
}

function decodeArrayBufferToText(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer)
  if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return new TextDecoder('utf-8').decode(arrayBuffer)
  }
  if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
    return new TextDecoder('utf-16le').decode(arrayBuffer)
  }
  if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
    return new TextDecoder('utf-16be').decode(arrayBuffer)
  }

  try {
    const utf8Text = new TextDecoder('utf-8', { fatal: false }).decode(arrayBuffer)
    const utf8ReplacementCount = (utf8Text.match(/\uFFFD/g) || []).length
    const utf8CjkCount = (utf8Text.match(/[\u4e00-\u9fff]/g) || []).length
    const utf8MojibakeCount = (utf8Text.match(/(?:銆|锛|鐨|鎴|闂|鍚|璇|浠|鍙|绗|绔|涔|浜|濂|宸|鐢|鎵|鍦|瀛)/g) || []).length
    if (utf8ReplacementCount === 0 && utf8CjkCount > 20 && utf8MojibakeCount === 0) {
      return utf8Text.replace(/\u0000/g, '')
    }
  } catch (e) {}

  const encodings = ['utf-8', 'gb18030', 'gbk', 'utf-16le', 'utf-16be']
  const candidates = []

  encodings.forEach(encoding => {
    try {
      const text = new TextDecoder(encoding).decode(arrayBuffer)
      candidates.push({ encoding, text, score: scoreDecodedText(text) })
    } catch (e) {}
  })

  if (candidates.length === 0) {
    return ''
  }

  candidates.sort((a, b) => b.score - a.score)
  return candidates[0].text.replace(/\u0000/g, '')
}

function stripRtfToText(text) {
  return String(text || '')
    .replace(/\\par[d]?/g, '\n')
    .replace(/\\tab/g, '\t')
    .replace(/\\'[0-9a-fA-F]{2}/g, '')
    .replace(/\\[a-z]+-?\d* ?/g, '')
    .replace(/[{}]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function extractTextFromLegacyDoc(arrayBuffer) {
  const decoded = decodeArrayBufferToText(arrayBuffer)
  if (!decoded) return ''

  if (decoded.trim().startsWith('{\\rtf')) {
    return stripRtfToText(decoded)
  }

  const lines = decoded
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(line => line.replace(/[^\u4e00-\u9fffA-Za-z0-9，。！？；：“”‘’、（）《》【】—…·\-\s]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(line => line.length >= 4)

  return lines.join('\n')
}

function setInternalHeights(upperH, outlineH, charsH) {
  if (refs.rangeSectionEl) refs.rangeSectionEl.style.height = upperH + 'px'
  if (refs.outlineBlockEl) refs.outlineBlockEl.style.height = outlineH + 'px'
  if (refs.charsPanelEl) refs.charsPanelEl.style.height = charsH + 'px'
}

function normalizeInternalHeights() {
  if (!refs.mainContentEl || !refs.rangeSectionEl || !refs.outlineBlockEl || !refs.charsPanelEl) return
  const availableH = refs.mainContentEl.clientHeight - INTERNAL_RESIZER_HEIGHT * 2
  if (availableH <= 0) return

  let upperH = refs.rangeSectionEl.offsetHeight
  let outlineH = refs.outlineBlockEl.offsetHeight
  let charsH = availableH - upperH - outlineH

  if (charsH < MIN_CHARS_HEIGHT) {
    let deficit = MIN_CHARS_HEIGHT - charsH
    const outlineShrink = Math.min(deficit, Math.max(0, outlineH - MIN_OUTLINE_HEIGHT))
    outlineH -= outlineShrink
    deficit -= outlineShrink

    const upperShrink = Math.min(deficit, Math.max(0, upperH - MIN_UPPER_HEIGHT))
    upperH -= upperShrink
    deficit -= upperShrink

    charsH = availableH - upperH - outlineH
  }

  if (charsH < MIN_CHARS_HEIGHT) charsH = MIN_CHARS_HEIGHT
  setInternalHeights(upperH, outlineH, charsH)
}

// --- External resizer handlers ---
function onMouseMove(e) {
  if (!refs.isResizing) return
  const clientX = e.clientX
  if (refs.side === 'left') {
    const minLeftWidth = getEffectiveLeftPanelMinWidth()
    let newWidth = Math.max(minLeftWidth, Math.min(2300, clientX))
    const maxW = window.innerWidth - refs.rightWidth - getCenterPanelMinWidth()
    newWidth = Math.min(newWidth, maxW)
    if (refs.leftPanel) refs.leftPanel.style.width = newWidth + 'px'
    refs.leftWidth = newWidth
  } else if (refs.side === 'right') {
    let newWidth = Math.max(RIGHT_PANEL_COLLAPSED_WIDTH, Math.min(2300, window.innerWidth - clientX))
    const maxW = window.innerWidth - refs.leftWidth - getCenterPanelMinWidth()
    newWidth = Math.min(newWidth, maxW)
    if (refs.rightPanel) refs.rightPanel.style.width = newWidth + 'px'
    refs.rightWidth = newWidth
  } else if (refs.side === '__main__') {
    const renderedTools = refs._mainOrigRenderedToolIds || []
    const n = renderedTools.length
    if (n > 0) {
      const currentWidths = refs._mainOrigWidths && refs._mainOrigWidths.length
        ? [...refs._mainOrigWidths]
        : collectRightPanelWidths(renderedTools)
      const maxWidth = getRightPanelMaxWidth()
      const minToolWidth = getEffectiveMinToolWidth(n, maxWidth)
      const minWidth = getRightPanelMinWidth(n, maxWidth)
      const dragDelta = refs.rightDragStartX - clientX
      const newRightWidth = clamp(refs._mainOrigRightWidth + dragDelta, minWidth, maxWidth)
      const nextWidths = [...currentWidths]

      if (dragDelta >= 0) {
        const expandAmount = newRightWidth - refs._mainOrigRightWidth
        nextWidths[0] = currentWidths[0] + expandAmount
      } else {
        let remainingShrink = refs._mainOrigRightWidth - newRightWidth
        for (let i = 0; i < nextWidths.length && remainingShrink > 0; i++) {
          const shrinkable = Math.max(0, nextWidths[i] - minToolWidth)
          const appliedShrink = Math.min(shrinkable, remainingShrink)
          nextWidths[i] -= appliedShrink
          remainingShrink -= appliedShrink
        }
      }

      applyRightPanelLayout(renderedTools, nextWidths, newRightWidth)
      refs._mainOrigWidths = [...nextWidths]
      refs._mainOrigRightWidth = newRightWidth
      refs.rightDragStartX = clientX
    }
  } else if (refs.side && refs.side.startsWith('right-tool-')) {
    const toolId = refs.side.replace('right-tool-', '')
    const origWidths = refs._rightPanelOrigWidths
    const origToolIds = refs._rightToolIds
    if (!origToolIds || origToolIds.length < 2) return

    const dividerIdx = origToolIds.indexOf(toolId)
    if (dividerIdx < 0 || dividerIdx >= origToolIds.length - 1) return

    const deltaX = clientX - refs.rightDragStartX
    if (deltaX === 0) return

    const currentWidths = origToolIds.map(id => origWidths[id] || DEFAULT_TOOL_WIDTH)
    const nextWidths = [...currentWidths]
    const maxRightWidth = getRightPanelMaxWidth()
    const minToolWidth = getEffectiveMinToolWidth(origToolIds.length, maxRightWidth)
    let nextRightWidth = refs.rightPanel ? refs.rightPanel.offsetWidth : refs.rightWidth

    if (deltaX > 0) {
      let remaining = deltaX
      let actualMove = 0
      for (let i = dividerIdx + 1; i < nextWidths.length && remaining > 0; i++) {
        const shrinkable = Math.max(0, nextWidths[i] - minToolWidth)
        const appliedShrink = Math.min(shrinkable, remaining)
        nextWidths[i] -= appliedShrink
        actualMove += appliedShrink
        remaining -= appliedShrink
      }
      nextWidths[dividerIdx] += actualMove
    } else {
      let remaining = -deltaX
      let actualMove = 0
      for (let i = dividerIdx; i >= 0 && remaining > 0; i--) {
        const shrinkable = Math.max(0, nextWidths[i] - minToolWidth)
        const appliedShrink = Math.min(shrinkable, remaining)
        nextWidths[i] -= appliedShrink
        actualMove += appliedShrink
        remaining -= appliedShrink
      }
      if (remaining > 0) {
        const expandable = Math.max(0, maxRightWidth - nextRightWidth)
        const appliedExpand = Math.min(expandable, remaining)
        nextRightWidth += appliedExpand
        actualMove += appliedExpand
      }
      nextWidths[dividerIdx + 1] += actualMove
    }

    applyRightPanelLayout(origToolIds, nextWidths, nextRightWidth)
    refs._rightPanelOrigWidths = {}
    origToolIds.forEach((id, index) => {
      refs._rightPanelOrigWidths[id] = nextWidths[index]
    })
    refs.rightDragStartX = clientX
  }
}

function onMouseUp() {
  if (refs.isResizing) {
    const wasRightDrag = refs.side === '__main__' || (refs.side && refs.side.startsWith('right-tool-'))
    refs.isResizing = false
    refs.side = null
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    document.querySelectorAll('.resizer.active, .right-tool-resizer.active').forEach(el => el.classList.remove('active'))
    if (onMouseUp._leftWidthState) onMouseUp._leftWidthState.current = refs.leftWidth
    if (onMouseUp._rightWidthState) onMouseUp._rightWidthState.current = refs.rightWidth
    if (onMouseUp._setDragging) onMouseUp._setDragging(false)
    if (onMouseUp._setDragSide) onMouseUp._setDragSide(null)
    // Sync panel widths to state after drag ends
    if (wasRightDrag) {
      const tools = refs.currentActiveTools || []
      if (tools.length > 0) {
        const newWidths = {}
        tools.forEach(id => {
          const panel = refs.rightToolPanels[id]
          newWidths[id] = panel ? panel.offsetWidth : (refs.currentToolWidths[id] || DEFAULT_TOOL_WIDTH)
        })
        if (onMouseUp._setRightToolWidths) onMouseUp._setRightToolWidths(newWidths)
      }
    }
  }
  if (refs.isInternalResizing) {
    refs.isInternalResizing = false
    refs.internalSide = null
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    document.querySelectorAll('.internal-resizer.active').forEach(el => el.classList.remove('active'))
    if (onMouseUp._setDragging) onMouseUp._setDragging(false)
    if (onMouseUp._setDragSide) onMouseUp._setDragSide(null)
  }
}

document.addEventListener('mousemove', (e) => {
  if (refs.isResizing) onMouseMove(e)
  if (refs.isInternalResizing) onInternalMouseMove(e)
})
document.addEventListener('mouseup', onMouseUp)

// --- Internal resizer handlers ---
function onInternalMouseMove(e) {
  if (!refs.isInternalResizing) return
  const clientY = e.clientY
  const deltaY = clientY - refs.internalStartY
  const totalH = refs.internalTotalH
  const origTopDividerY = refs.internalOrigUpperH
  const origMidDividerY = refs.internalOrigUpperH + refs.internalOrigOutlineH

  if (refs.internalSide === 'top') {
    let topDividerY = clamp(origTopDividerY + deltaY, MIN_UPPER_HEIGHT, totalH - MIN_OUTLINE_HEIGHT - MIN_CHARS_HEIGHT)
    let midDividerY = origMidDividerY

    if (topDividerY > midDividerY - MIN_OUTLINE_HEIGHT) {
      midDividerY = topDividerY + MIN_OUTLINE_HEIGHT
    }
    if (midDividerY > totalH - MIN_CHARS_HEIGHT) {
      midDividerY = totalH - MIN_CHARS_HEIGHT
      topDividerY = midDividerY - MIN_OUTLINE_HEIGHT
    }

    const upperH = topDividerY
    const outlineH = midDividerY - topDividerY
    const charsH = totalH - midDividerY
    setInternalHeights(upperH, outlineH, charsH)
  } else if (refs.internalSide === 'mid') {
    let topDividerY = origTopDividerY
    let midDividerY = clamp(origMidDividerY + deltaY, MIN_UPPER_HEIGHT + MIN_OUTLINE_HEIGHT, totalH - MIN_CHARS_HEIGHT)

    if (midDividerY < topDividerY + MIN_OUTLINE_HEIGHT) {
      topDividerY = midDividerY - MIN_OUTLINE_HEIGHT
    }
    if (topDividerY < MIN_UPPER_HEIGHT) {
      topDividerY = MIN_UPPER_HEIGHT
      midDividerY = topDividerY + MIN_OUTLINE_HEIGHT
    }

    const upperH = topDividerY
    const outlineH = midDividerY - topDividerY
    const charsH = totalH - midDividerY
    setInternalHeights(upperH, outlineH, charsH)
  }
}

// --- Module-level chapters data ---
var chaptersListData = []
var lines = []

export default function App() {
  const leftPanelRef = useRef(null)
  const rightPanelRef = useRef(null)
  const leftResizerRef = useRef(null)
  const rightResizerRef = useRef(null)
  const upperSectionRef = useRef(null)
  const outlineBodyRef = useRef(null)
  const charsPanelRef = useRef(null)
  const mainContentRef = useRef(null)
  const leftWidthState = useRef(500)
  const rightWidthState = useRef(400)
  const [activeTool, setActiveTool] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragSide, setDragSide] = useState(null)
  const [extracting, setExtracting] = useState(false)
  const [activePopup, setActivePopup] = useState(null)
  const [apiConfig, setApiConfig] = useState(getApiConfig())
  const [themeConfig, setThemeConfig] = useState(getThemeConfig())
  const [outlineSearch, setOutlineSearch] = useState('')
  const [outlineMatchCount, setOutlineMatchCount] = useState(0)
  const [outlineActiveMatch, setOutlineActiveMatch] = useState(0)
  const [editorTitle, setEditorTitle] = useState('')
  const [editorContent, setEditorContent] = useState('')
  const [displayChapter, setDisplayChapter] = useState(null) // { title, content }
  const [selectedChapterIndex, setSelectedChapterIndex] = useState(-1)
  const [chapterJumpValue, setChapterJumpValue] = useState('')
  const [chapterSearchQuery, setChapterSearchQuery] = useState('')
  const [chapterSearchResults, setChapterSearchResults] = useState([])
  const [chapterSearchOpen, setChapterSearchOpen] = useState(false)
  const [chapterSearchTerm, setChapterSearchTerm] = useState('')
  const [chapterSearchTarget, setChapterSearchTarget] = useState(null)
  const [activeRightTools, setActiveRightTools] = useState([])
  const [rightToolWidths, setRightToolWidths] = useState({})
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState('feature1')
  const [themeTextTarget, setThemeTextTarget] = useState('chapterList')
  const popupRef = useRef(null)
  const settingsPanelRef = useRef(null)
  const settingsButtonRef = useRef(null)
  const chapterContentRef = useRef(null)
  const chapterSearchRef = useRef(null)
  const chapterSearchInputRef = useRef(null)
  const chapterSearchLineRefs = useRef({})
  const outlineMatchesRef = useRef([])
  const outlineCurrentMatchRef = useRef(-1)
  const outlineResultsRef = useRef([])
  const outlineRetryMapRef = useRef({})
  const [popupForm, setPopupForm] = useState({ endpoint: apiConfig.endpoint, model: apiConfig.model, apiKey: apiConfig.apiKey })
  const [themeForm, setThemeForm] = useState(normalizeThemeConfig(themeConfig))
  const UNDEV_TITLES = { 1: '未开发', 2: '未开发', 3: '未开发', 4: '未开发', 5: '未开发', 6: '未开发' }

  // Expose setState for onMouseUp cleanup
  useEffect(() => {
    onMouseUp._setDragging = setIsDragging
    onMouseUp._setDragSide = setDragSide
    onMouseUp._setRightToolWidths = setRightToolWidths
    onMouseUp._leftWidthState = leftWidthState
    onMouseUp._rightWidthState = rightWidthState
  }, [chaptersListData])

  // Sync module refs to DOM elements every render
  useEffect(() => {
    refs.leftPanel = leftPanelRef.current
    refs.rightPanel = rightPanelRef.current
    refs.currentActiveTools = activeRightTools
    refs.currentToolWidths = rightToolWidths
    refs.rangeSectionEl = upperSectionRef.current
    refs.outlineBlockEl = outlineBodyRef.current
    refs.charsPanelEl = charsPanelRef.current
    refs.mainContentEl = mainContentRef.current
  })

  useEffect(() => {
    if (refs.isResizing) return

    const maxAvailableWidth = getRightPanelMaxWidth()
    const normalizedWidths = normalizeRightToolWidths(activeRightTools, rightToolWidths, maxAvailableWidth)
    const hasWidthDrift =
      activeRightTools.length > 0 &&
      activeRightTools.some(id => (normalizedWidths[id] || DEFAULT_TOOL_WIDTH) !== (rightToolWidths[id] || DEFAULT_TOOL_WIDTH))

    if (hasWidthDrift) {
      setRightToolWidths(normalizedWidths)
      return
    }

    const renderedTools = [...activeRightTools].reverse()
    const orderedWidths = renderedTools.map(id => normalizedWidths[id] || DEFAULT_TOOL_WIDTH)
    const totalPanelWidth = orderedWidths.reduce((sum, width) => sum + width, 0) + renderedTools.length * TOOL_RESIZER_WIDTH
    const nextRightWidth = renderedTools.length > 0 ? (RIGHT_PANEL_COLLAPSED_WIDTH + totalPanelWidth) : RIGHT_PANEL_COLLAPSED_WIDTH
    applyRightPanelLayout(renderedTools, orderedWidths, nextRightWidth)
  }, [activeRightTools, rightToolWidths])

  useEffect(() => {
    const syncViewportLayout = () => {
      if (refs.isResizing) return
      const viewportWidth = getViewportWidth()
      if (!viewportWidth) return

      const minLeftWidth = getEffectiveLeftPanelMinWidth(viewportWidth)
      const centerMinWidth = getCenterPanelMinWidth(viewportWidth)
      const currentRightWidth = refs.rightPanel ? refs.rightPanel.offsetWidth : refs.rightWidth
      const currentLeftWidth = refs.leftPanel ? refs.leftPanel.offsetWidth : refs.leftWidth
      const maxLeftWidth = Math.max(minLeftWidth, viewportWidth - currentRightWidth - centerMinWidth)
      const nextLeftWidth = clamp(currentLeftWidth || minLeftWidth, minLeftWidth, maxLeftWidth)

      refs.leftWidth = nextLeftWidth
      leftWidthState.current = nextLeftWidth
      if (refs.leftPanel) refs.leftPanel.style.width = nextLeftWidth + 'px'

      const maxAvailableWidth = getRightPanelMaxWidth()
      const normalizedWidths = normalizeRightToolWidths(activeRightTools, refs.currentToolWidths || rightToolWidths, maxAvailableWidth)
      const renderedTools = [...activeRightTools].reverse()
      const orderedWidths = renderedTools.map(id => normalizedWidths[id] || DEFAULT_TOOL_WIDTH)
      const totalPanelWidth = orderedWidths.reduce((sum, width) => sum + width, 0) + renderedTools.length * TOOL_RESIZER_WIDTH
      const nextRightWidth = renderedTools.length > 0 ? (RIGHT_PANEL_COLLAPSED_WIDTH + totalPanelWidth) : RIGHT_PANEL_COLLAPSED_WIDTH
      applyRightPanelLayout(renderedTools, orderedWidths, nextRightWidth)
    }

    syncViewportLayout()
    window.addEventListener('resize', syncViewportLayout)
    return () => window.removeEventListener('resize', syncViewportLayout)
  }, [activeRightTools, rightToolWidths])

  useEffect(() => {
    if (activeTool !== 0) return
    const syncLayout = () => normalizeInternalHeights()
    syncLayout()
    window.addEventListener('resize', syncLayout)
    return () => window.removeEventListener('resize', syncLayout)
  }, [activeTool])

  // Close popup when clicking outside
  useEffect(() => {
    if (!activePopup) return
    const handler = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        setActivePopup(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [activePopup])

  useEffect(() => {
    setThemeForm(normalizeThemeConfig(themeConfig))
  }, [themeConfig])

  useEffect(() => {
    if (settingsOpen && settingsTab === 'feature2') {
      applyThemeConfig(themeForm)
      return
    }
    applyThemeConfig(themeConfig)
  }, [settingsOpen, settingsTab, themeForm, themeConfig])

  useEffect(() => {
    if (!settingsOpen) return
    const handler = (e) => {
      if (settingsPanelRef.current && settingsPanelRef.current.contains(e.target)) return
      if (settingsButtonRef.current && settingsButtonRef.current.contains(e.target)) return
      setThemeForm(normalizeThemeConfig(themeConfig))
      setSettingsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [settingsOpen, themeConfig])

  useEffect(() => {
    if (!chapterSearchOpen) return
    const handler = (e) => {
      if (chapterSearchRef.current && chapterSearchRef.current.contains(e.target)) return
      if (chapterSearchInputRef.current && chapterSearchInputRef.current.contains(e.target)) return
      setChapterSearchOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [chapterSearchOpen])

  useEffect(() => {
    const currentChapter = chaptersListData && chaptersListData[selectedChapterIndex] ? chaptersListData[selectedChapterIndex] : null
    if (currentChapter) {
      setChapterJumpValue(String(currentChapter.num || selectedChapterIndex + 1))
    } else if (selectedChapterIndex < 0) {
      setChapterJumpValue('')
    }
  }, [selectedChapterIndex, displayChapter])

  useEffect(() => {
    if (!displayChapter || !chapterSearchTarget || chapterSearchTarget.chapterIndex !== selectedChapterIndex) return
    const key = selectedChapterIndex + '-' + chapterSearchTarget.lineIndex
    const targetEl = chapterSearchLineRefs.current[key]
    if (targetEl) {
      targetEl.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [displayChapter, selectedChapterIndex, chapterSearchTarget])

  const startDrag = useCallback((side) => {
    return (e) => {
      e.preventDefault()
      refs.isResizing = true
      refs.side = side
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      setIsDragging(true)
      setDragSide(side)
      const resizerRef = side === 'left' ? leftResizerRef : rightResizerRef
      if (resizerRef && resizerRef.current) resizerRef.current.classList.add('active')
    }
  }, [chaptersListData])

  const startRightToolDrag = useCallback((toolId) => {
    return (e) => {
      e.preventDefault()
      refs.isResizing = true
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      setIsDragging(true)
      setDragSide('right-tool')

      if (toolId === '__main__') {
        refs.side = '__main__'
        refs.rightDragStartX = e.clientX
        const tools = refs.currentActiveTools || []
        const renderedTools = [...tools].reverse()
        refs._mainOrigRenderedToolIds = renderedTools
        refs._mainOrigWidths = renderedTools.map(id => {
          const panel = refs.rightToolPanels[id]
          return panel ? panel.offsetWidth : (refs.currentToolWidths[id] || DEFAULT_TOOL_WIDTH)
        })
        refs._mainOrigRightWidth = refs.rightPanel ? refs.rightPanel.offsetWidth : refs.rightWidth
      } else {
        refs.side = 'right-tool-' + toolId
        refs.rightDragStartX = e.clientX
        const tools = refs.currentActiveTools || []
        const reversed = [...tools].reverse()
        refs._rightToolIds = reversed
        refs._rightPanelOrigWidths = {}

        let pos = TOOL_RESIZER_WIDTH
        for (let i = 0; i < reversed.length; i++) {
          const id = reversed[i]
          const panel = refs.rightToolPanels[id]
          const w = panel ? panel.offsetWidth : (refs.currentToolWidths[id] || DEFAULT_TOOL_WIDTH)
          refs._rightPanelOrigWidths[id] = w
          pos += w
          if (i < reversed.length - 1) pos += TOOL_RESIZER_WIDTH
        }
        refs._rightPanelArea = pos - TOOL_RESIZER_WIDTH

        let dividerX = TOOL_RESIZER_WIDTH
        for (let i = 0; i < reversed.length; i++) {
          dividerX += refs._rightPanelOrigWidths[reversed[i]]
          if (i === reversed.indexOf(toolId)) {
            refs._rightOrigDividerX = dividerX
            break
          }
          if (i < reversed.length - 1) dividerX += TOOL_RESIZER_WIDTH
        }
      }
    }
  }, [chaptersListData])

  const startInternalDrag = useCallback((side) => {
    return (e) => {
      e.preventDefault()
      if (!refs.rangeSectionEl || !refs.outlineBlockEl || !refs.charsPanelEl) return
      refs.isInternalResizing = true
      refs.internalSide = side
      refs.internalStartY = e.clientY
      refs.internalOrigUpperH = refs.rangeSectionEl.offsetHeight
      refs.internalOrigOutlineH = refs.outlineBlockEl.offsetHeight
      refs.internalOrigCharsH = refs.charsPanelEl.offsetHeight
      refs.internalTotalH = refs.internalOrigUpperH + refs.internalOrigOutlineH + refs.internalOrigCharsH
      document.body.style.cursor = 'row-resize'
      document.body.style.userSelect = 'none'
      setIsDragging(true)
      setDragSide('internal')
    }
  }, [chaptersListData])

  // --- Helper: show HTML in center panel ---
  const showInCenterPanel = (html) => {
    const el = document.getElementById('outline-list')
    if (el) el.innerHTML = html
  }

  // --- Escape HTML ---
  const escapeHtml = (str) => {
    if (!str) return ''
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }

  const showOutlineStatus = (message, type = 'placeholder') => {
    const el = document.getElementById('outline-list')
    if (!el) return
    el.innerHTML = message ? '<p class="outline-status outline-status-' + type + '">' + escapeHtml(message) + '</p>' : ''
    outlineMatchesRef.current = []
    outlineCurrentMatchRef.current = -1
    setOutlineMatchCount(0)
    setOutlineActiveMatch(0)
  }

  const applyOutlineSearch = useCallback((term, direction = 0) => {
    const el = document.getElementById('outline-list')
    if (!el) return

    const items = Array.from(el.querySelectorAll('.outline-summary-item'))
    items.forEach(item => item.classList.remove('outline-summary-item-match', 'outline-summary-item-current'))

    const keyword = (term || '').trim().toLowerCase()
    if (!keyword) {
      outlineMatchesRef.current = []
      outlineCurrentMatchRef.current = -1
      setOutlineMatchCount(0)
      setOutlineActiveMatch(0)
      return
    }

    const matches = items.filter(item => (item.textContent || '').toLowerCase().includes(keyword))
    outlineMatchesRef.current = matches
    setOutlineMatchCount(matches.length)

    if (matches.length === 0) {
      outlineCurrentMatchRef.current = -1
      setOutlineActiveMatch(0)
      return
    }

    matches.forEach(item => item.classList.add('outline-summary-item-match'))

    let nextIndex = 0
    if (direction !== 0 && outlineCurrentMatchRef.current !== -1) {
      nextIndex = (outlineCurrentMatchRef.current + direction + matches.length) % matches.length
    } else if (outlineCurrentMatchRef.current >= 0 && outlineCurrentMatchRef.current < matches.length) {
      nextIndex = outlineCurrentMatchRef.current
    }

    outlineCurrentMatchRef.current = nextIndex
    setOutlineActiveMatch(nextIndex + 1)
    matches[nextIndex].classList.add('outline-summary-item-current')
    matches[nextIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [chaptersListData])

  const handleOutlineSearchChange = useCallback((e) => {
    const value = e.target.value
    setOutlineSearch(value)
    outlineCurrentMatchRef.current = -1
    applyOutlineSearch(value)
  }, [applyOutlineSearch])

  const jumpOutlineMatch = useCallback((direction) => {
    if (!outlineSearch.trim()) return
    applyOutlineSearch(outlineSearch, direction)
  }, [applyOutlineSearch, outlineSearch])

  const renderOutlineResults = (items, pendingMessage = '') => {
    const el = document.getElementById('outline-list')
    if (!el) return
    if ((!items || items.length === 0) && !pendingMessage) {
      el.innerHTML = ''
      outlineResultsRef.current = []
      outlineRetryMapRef.current = {}
      outlineMatchesRef.current = []
      outlineCurrentMatchRef.current = -1
      setOutlineMatchCount(0)
      setOutlineActiveMatch(0)
      return
    }
    outlineResultsRef.current = Array.isArray(items) ? items.map(item => ({ ...item })) : []
    outlineRetryMapRef.current = {}
    let html = ''
    for (const item of items || []) {
      const chapterLabel = item.chapterLabel || ''
      const title = item.title ? ' ' + escapeHtml(item.title) : ''
      const points = Array.isArray(item.points) ? item.points : []
      const retryKey = item.retryable && item.retryKey ? String(item.retryKey) : ''
      if (retryKey && item.retryPayload) {
        outlineRetryMapRef.current[retryKey] = item.retryPayload
      }
      html += '<div class="outline-summary-item">'
      html += '<div class="outline-summary-title-row">'
      html += '<div class="outline-summary-title">' + escapeHtml(chapterLabel) + title + '</div>'
      if (retryKey) {
        html += '<button type="button" class="outline-retry-btn" data-retry-key="' + escapeHtml(retryKey) + '">↻</button>'
      }
      html += '</div>'
      html += '<ol class="outline-summary-points">'
      for (const point of points) {
        html += '<li>' + escapeHtml(point) + '</li>'
      }
      html += '</ol>'
      html += '</div>'
    }
    if (pendingMessage) {
      html += '<p class="outline-status outline-status-placeholder">' + escapeHtml(pendingMessage) + '</p>'
    }
    el.innerHTML = html
    Array.from(el.querySelectorAll('.outline-retry-btn')).forEach(btn => {
      btn.addEventListener('click', () => {
        const retryKey = btn.getAttribute('data-retry-key') || ''
        retrySingleOutlineChapter(retryKey)
      })
    })
    if (outlineSearch.trim()) {
      outlineCurrentMatchRef.current = -1
      requestAnimationFrame(() => applyOutlineSearch(outlineSearch))
    } else {
      outlineMatchesRef.current = []
      outlineCurrentMatchRef.current = -1
      setOutlineMatchCount(0)
      setOutlineActiveMatch(0)
    }
  }
  const retrySingleOutlineChapter = useCallback(async (retryKey) => {
    const normalizedKey = String(retryKey || '')
    const retryPayload = outlineRetryMapRef.current[normalizedKey]
    if (!retryPayload) return
    const skill = skills.find(s => s.name === 'chapter-outline')
    if (!skill) return
    const currentItems = Array.isArray(outlineResultsRef.current) ? outlineResultsRef.current.map(item => ({ ...item })) : []
    const targetIndex = currentItems.findIndex(item => String(item.retryKey || '') === normalizedKey)
    if (targetIndex === -1) return
    const chapterLabel = getWritingChapterLabel({ number: retryPayload.num, title: retryPayload.title || retryPayload.name || '' })
    currentItems[targetIndex] = {
      ...currentItems[targetIndex],
      points: ['正在重新提取...'],
      retryable: false,
    }
    renderOutlineResults(currentItems)
    const result = await skill.run(apiConfig, [retryPayload], { startChapter: retryPayload.num, endChapter: retryPayload.num })
    if (!result.ok) {
      currentItems[targetIndex] = {
        chapter: retryPayload.num,
        chapterLabel,
        title: String(retryPayload.title || retryPayload.name || '').trim(),
        points: ['提取失败：' + String(result.error || '未知错误')],
        retryable: true,
        retryKey: normalizedKey,
        retryPayload,
      }
    } else {
      const nextItems = Array.isArray(result.data) ? result.data : []
      if (nextItems.length > 0) {
        currentItems[targetIndex] = nextItems[0]
      } else {
        currentItems[targetIndex] = {
          chapter: retryPayload.num,
          chapterLabel,
          title: String(retryPayload.title || retryPayload.name || '').trim(),
          points: ['未返回可用大纲内容'],
        }
      }
    }
    renderOutlineResults(currentItems)
  }, [apiConfig, outlineSearch, skills])

  // --- handleExtract: call skill and show results ---
  const handleExtract = async () => {
    if (!chaptersListData || chaptersListData.length === 0) {
      showInCenterPanel('<p class="placeholder-text">请先上传文件并解析章节</p>')
      return
    }
    const startRaw = String(document.getElementById('start-chapter')?.value || '').trim()
    const endRaw = String(document.getElementById('end-chapter')?.value || '').trim()
    const startVal = parseInt(startRaw || '1', 10)
    const endVal = parseInt(endRaw || String(chaptersListData.length), 10)
    const startIdx = Math.max(0, startVal - 1)
    const endIdx = Math.min(chaptersListData.length, endVal)
    if (Number.isNaN(startVal) || Number.isNaN(endVal) || startIdx >= endIdx) {
      showInCenterPanel('<p class="placeholder-text">范围无效</p>')
      return
    }
    const selectedChapters = chaptersListData.slice(startIdx, endIdx)
    setExtracting(true)
    renderOutlineResults([], `正在提取第 1 / ${selectedChapters.length} 章...`)

    const skill = skills.find(s => s.name === 'chapter-outline')
    if (!skill) {
      setExtracting(false)
      showInCenterPanel('<p class="placeholder-text">技能未找到</p>')
      return
    }

    const collected = []
    for (let i = 0; i < selectedChapters.length; i++) {
      const chapter = selectedChapters[i]
      const result = await skill.run(apiConfig, [chapter], { startChapter: chapter.num, endChapter: chapter.num })
      if (!result.ok) {
        collected.push({
          chapter: chapter.num,
          chapterLabel: getWritingChapterLabel({ number: chapter.num, title: chapter.title || chapter.name || '' }),
          title: String(chapter.title || chapter.name || '').trim(),
          points: ['提取失败：' + String(result.error || '未知错误')],
          retryable: true,
          retryKey: String(chapter.id || chapter.num),
          retryPayload: chapter,
        })
      } else {
        const nextItems = Array.isArray(result.data) ? result.data : []
        if (nextItems.length > 0) {
          collected.push(...nextItems)
        } else {
          collected.push({
            chapter: chapter.num,
            chapterLabel: getWritingChapterLabel({ number: chapter.num, title: chapter.title || chapter.name || '' }),
            title: String(chapter.title || chapter.name || '').trim(),
            points: ['未返回可用大纲内容'],
          })
        }
      }
      if (i < selectedChapters.length - 1) {
        renderOutlineResults(collected, `正在提取第 ${i + 2} / ${selectedChapters.length} 章...`)
      }
    }

    setExtracting(false)
    renderOutlineResults(collected)
  }
  // --- File upload handler ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      var fileDiv = document.getElementById('current-file')
      fileDiv.textContent = '已加载：' + file.name
      fileDiv.classList.remove('placeholder-text')
      const filename = file.name.toLowerCase()

      if (filename.endsWith('.docx')) {
        const reader = new FileReader()
        reader.onload = async (event) => {
          try {
            const arrayBuffer = event.target.result
            const zip = await JSZip.loadAsync(arrayBuffer)
            const docXml = await zip.files['word/document.xml']?.async('string')
            if (!docXml) { alert('docx 鏂囦欢瑙ｆ瀽澶辫触'); return }
            const paragraphs = parseDocxParagraphs(docXml)
            const resultLines = []
            const chapterTitleSet = new Set()
            paragraphs.forEach((paragraph) => {
              if (paragraph.isToc) return
              if (isPotentialDocxChapterParagraph(paragraph)) {
                chapterTitleSet.add(normalizeTitleText(paragraph.text))
                if (resultLines.length > 0) resultLines.push('')
                resultLines.push(paragraph.text)
              } else {
                resultLines.push(paragraph.text)
              }
            })
            let fullText = resultLines.join('\n').replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
            parseFileContent(fullText, file.name, 'docx', chapterTitleSet)
          } catch (err) { console.error(err); alert('docx 解析失败') }
        }
        reader.readAsArrayBuffer(file)
      } else if (filename.endsWith('.txt') || filename.endsWith('.md') || filename.endsWith('.rtf') || filename.endsWith('.doc')) {
        const reader = new FileReader()
        reader.onload = async (event) => {
          const ext = filename.split('.').pop().toLowerCase()
          const arrayBuffer = event.target.result
          let text = ''

          if (ext === 'rtf') {
            text = stripRtfToText(decodeArrayBufferToText(arrayBuffer))
          } else if (ext === 'doc') {
            text = extractTextFromLegacyDoc(arrayBuffer)
          } else {
            text = decodeArrayBufferToText(arrayBuffer)
          }

          if (!text || !text.trim()) {
            alert('文件内容解析失败，请优先尝试另存为 .docx 或 .txt 后再导入')
            return
          }

          parseFileContent(text, file.name, ext)
        }
        reader.readAsArrayBuffer(file)
      } else {
        alert('仅支持 .docx / .doc / .txt / .md / .rtf 等常见文字格式')
      }
    }
  }

  // --- Module-level parseFileContent ---
  const parseFileContent = (content, filename, fileExt, knownChapterTitles) => {
    let processedContent = content.replace(/\r\n/g, '\n')
    lines = processedContent.split('\n')
    const chapters = []
    const normalizedKnownChapterTitles = knownChapterTitles && knownChapterTitles.size > 0
      ? new Set(Array.from(knownChapterTitles).map(item => normalizeTitleText(item)).filter(Boolean))
      : null
    const chapterPrefixRegex = /^[\s\t#]*第\s*[零〇一二两三四五六七八九十百千万0-9]+\s*(?:章|节|卷|部|回)\s*/i

    if (normalizedKnownChapterTitles && normalizedKnownChapterTitles.size > 0) {
      let currentChap = null
      let chapContentLines = []
      for (const line of lines) {
        const normalizedLine = normalizeTitleText(line)
        if (normalizedLine.length > 0 && (normalizedKnownChapterTitles.has(normalizedLine) || isLikelyChapterTitle(normalizedLine))) {
          if (currentChap !== null) {
            const c = chapContentLines.join('\n')
            const wordCount = c.replace(/\s/g, '').length
            const num = parseChapterNumberFromTitle(currentChap, chapters.length + 1)
            const after = normalizeTitleText(currentChap).replace(chapterPrefixRegex, '').replace(/^[：:、.．\-—\s]+/, '').trim()
            const chapterName = '第' + num + '章' + (after ? ' ' + after : '')
            const fixedContent = chapterName + c.substring(c.indexOf('\n') >= 0 ? c.indexOf('\n') : c.length)
            chapters.push({ num, title: chapterName, words: wordCount, rawContent: fixedContent })
          }
          currentChap = normalizedLine
          chapContentLines = [normalizedLine]
        } else {
          chapContentLines.push(line)
        }
      }
      if (currentChap !== null) {
        const c = chapContentLines.join('\n')
        const wordCount = c.replace(/\s/g, '').length
        const num = parseChapterNumberFromTitle(currentChap, chapters.length + 1)
        const after = normalizeTitleText(currentChap).replace(chapterPrefixRegex, '').replace(/^[：:、.．\-—\s]+/, '').trim()
        const chapterName = '第' + num + '章' + (after ? ' ' + after : '')
        const fixedContent = chapterName + c.substring(c.indexOf('\n') >= 0 ? c.indexOf('\n') : c.length)
        chapters.push({ num, title: chapterName, words: wordCount, rawContent: fixedContent })
      }
    } else {
      for (let i = 0; i < lines.length; i++) {
        const trimmedLine = lines[i].trim()
        if (isLikelyChapterTitle(trimmedLine)) {
          const num = parseChapterNumberFromTitle(trimmedLine, 1)
          let chapterName = '第' + num + '章'
          const after = normalizeTitleText(trimmedLine).replace(chapterPrefixRegex, '').replace(/^[：:、.．\-—\s]+/, '').trim()
          if (after) chapterName = '第' + num + '章 ' + after
          let startIndex = i
          let j = i + 1
          while (j < lines.length) {
            const nextLine = lines[j].trim()
            if (nextLine && isLikelyChapterTitle(nextLine)) break
            j++
          }
          chapters.push({ num, title: chapterName, words: lines.slice(startIndex, j).join('\n').replace(/\s/g, '').length, rawContent: lines.slice(startIndex, j).join('\n') })
          i = j - 1
        }
      }
    }

    if (chapters.length === 0) {
      const paragraphParts = processedContent.split(/\n\n+/)
      let paraIndex = 0
      for (const p of paragraphParts) {
        if (p.trim().length > 100) {
          chapters.push({ num: ++paraIndex, title: `第${paraIndex}章`, words: p.replace(/\s/g, '').length, rawContent: p.trim() })
          if (paraIndex >= 50) break
        }
      }
    }

    const fullTextWordCount = processedContent.replace(/\s/g, '').length
    renderResults(chapters, fullTextWordCount)
    setChapterSearchResults([])
    setChapterSearchOpen(false)
    setChapterSearchQuery('')
    setChapterSearchTerm('')
    setChapterSearchTarget(null)
    if (chapters.length > 0) {
      window.setTimeout(() => window.selectChapter(0), 0)
    } else {
      loadChapterIntoEditor('')
    }
    const outlineEl = document.getElementById('outline-list')
    if (outlineEl) outlineEl.innerHTML = ''
  }

  const renderResults = (chapters, fullTextWordCount) => {
    chaptersListData = chapters.map(ch => ({ ...ch, rawContent: ch.rawContent || '' }))
    const totalWords = fullTextWordCount !== undefined ? fullTextWordCount : chapters.reduce((sum, ch) => sum + ch.words, 0)
    document.getElementById('total-chapters').textContent = chapters.length.toLocaleString()
    document.getElementById('total-words').textContent = totalWords.toLocaleString()

    var html = ''
    for (var j = 0; j < chapters.length; j++) {
      var ch = chapters[j]
      html += '<div class="chapter-item" data-index="' + j + '">' +
        '<span class="num">' + ch.num + '</span>' +
        '<span class="title">' + escapeHtml(ch.title) + '</span>' +
        '<span class="words">' + ch.words + '\u5b57</span>' +
        '</div>'
    }
    document.getElementById('chapters-list').innerHTML = html || '<p class="placeholder-text">未找到章节内容</p>'

    var outlineHtml = ''
    const maxOutline = Math.min(chapters.length, 10)
    for (var k = 0; k < maxOutline; k++) {
      var ch = chapters[k]
      outlineHtml += '<div class="outline-item" data-index="' + k + '">' +
        '<h4>' + escapeHtml(ch.title) + '</h4>' +
        '<span class="meta">' + ch.words + '字</span>' +
        '</div>'
    }
    document.getElementById('outline-list').innerHTML = outlineHtml || '<p class="placeholder-text">暂无章节大纲数据</p>'
  }

  // --- Global functions for onclick ---
  window.selectChapter = function(index) {
    var chapterItem = document.querySelectorAll('.chapter-item')[index]
    if (chapterItem) {
      document.querySelectorAll('.chapter-item').forEach(item => item.classList.remove('selected'))
      chapterItem.classList.add('selected')
      var outlineItems = document.querySelectorAll('.outline-item')
      if (outlineItems[index]) {
        document.querySelectorAll('.outline-item').forEach(item => item.classList.remove('selected'))
        outlineItems[index].classList.add('selected')
      }
    }
    const ch = chaptersListData && chaptersListData[index] ? chaptersListData[index] : null
    setDisplayChapter(ch ? { title: ch.title || ch.name || '第' + (index+1) + '章', content: ch.rawContent || '' } : null)
    setSelectedChapterIndex(index)
  }

  window.showChapterDetail = function(content) {
    var detailEl = document.getElementById('chapter-detail-content')
    if (detailEl) {
      if (!content) { detailEl.innerHTML = '暂无详细内容'; return }
      var parts = content.split('\n')
      var titleLine = escapeHtml(parts[0])
      var rest = parts.slice(1).map(function(l) { return escapeHtml(l) }).join('<br>')
      detailEl.innerHTML = '<strong>' + titleLine + '</strong><br>' + rest
    }
  }

  const togglePopup = (name) => {
    setActivePopup(activePopup === name ? null : name)
  }

  const toggleSettingsPanel = useCallback(() => {
    setSettingsOpen(current => {
      if (current) {
        setThemeForm(normalizeThemeConfig(themeConfig))
      }
      return !current
    })
  }, [themeConfig])

  const saveApiConfigForm = () => {
    const normalized = {
      provider: 'openai_compatible',
      endpoint: normalizeApiEndpointInput(popupForm.endpoint),
      model: String(popupForm.model || '').trim(),
      apiKey: String(popupForm.apiKey || '').trim(),
    }
    saveApiConfig(normalized)
    setApiConfig(normalized)
    setPopupForm({ endpoint: normalized.endpoint, model: normalized.model, apiKey: normalized.apiKey })
    setActivePopup(null)
  }

  const saveThemeConfigForm = () => {
    const normalized = normalizeThemeConfig(themeForm)
    saveThemeConfig(normalized)
    setThemeConfig(normalized)
  }

  const updateThemeFormField = useCallback((field, value) => {
    setThemeForm(current => normalizeThemeConfig({
      ...current,
      [field]: value,
      preset: 'custom',
    }))
  }, [chaptersListData])

  const updateThemeTextSection = useCallback((sectionKey, field, value) => {
    setThemeForm(current => normalizeThemeConfig({
      ...current,
      preset: 'custom',
      textSections: {
        ...(current.textSections || {}),
        [sectionKey]: {
          ...(current.textSections?.[sectionKey] || {}),
          [field]: value,
        },
      },
    }))
  }, [chaptersListData])

  const applyThemePresetToForm = useCallback((preset) => {
    setThemeForm(current => createThemeFromPreset(preset, current))
  }, [chaptersListData])

  const restoreSavedTheme = useCallback(() => {
    setThemeForm(normalizeThemeConfig(themeConfig))
  }, [themeConfig])

  const jumpToChapterNumber = useCallback((rawValue) => {
    const parsed = parseInt(String(rawValue || '').trim(), 10)
    if (!Number.isFinite(parsed) || parsed <= 0 || !chaptersListData.length) return

    let targetIndex = chaptersListData.findIndex(ch => Number(ch.num) === parsed)
    if (targetIndex < 0 && parsed <= chaptersListData.length) {
      targetIndex = parsed - 1
    }
    if (targetIndex >= 0) {
      window.selectChapter(targetIndex)
      setChapterSearchTarget(null)
    }
  }, [chaptersListData])

  const goRelativeChapter = useCallback((delta) => {
    if (!chaptersListData.length) return
    const nextIndex = clamp(
      selectedChapterIndex < 0 ? 0 : selectedChapterIndex + delta,
      0,
      Math.max(0, chaptersListData.length - 1)
    )
    window.selectChapter(nextIndex)
    setChapterSearchTarget(null)
  }, [selectedChapterIndex])

  const runChapterSearch = useCallback((rawQuery) => {
    const query = String(rawQuery || '').trim()
    setChapterSearchQuery(rawQuery)
    if (!query || !chaptersListData.length) {
      setChapterSearchResults([])
      setChapterSearchOpen(false)
      setChapterSearchTerm('')
      setChapterSearchTarget(null)
      return
    }

    const normalizedQuery = query.toLowerCase()
    const results = []
    for (let chapterIndex = 0; chapterIndex < chaptersListData.length; chapterIndex++) {
      const chapter = chaptersListData[chapterIndex]
      const searchableText = String(chapter.rawContent || chapter.content || chapter.title || '').replace(/\r\n?/g, '\n')
      const linesInChapter = searchableText.split('\n')
      for (let lineIndex = 0; lineIndex < linesInChapter.length; lineIndex++) {
        const line = linesInChapter[lineIndex]
        if (!line || !line.toLowerCase().includes(normalizedQuery)) continue
        results.push({
          id: chapterIndex + '-' + lineIndex + '-' + results.length,
          chapterIndex,
          lineIndex,
          chapterNum: chapter.num || chapterIndex + 1,
          chapterTitle: chapter.title || '第' + (chapterIndex + 1) + '章',
          snippet: buildSearchSnippet(line, query),
        })
        if (results.length >= 80) break
      }
      if (results.length >= 80) break
    }

    setChapterSearchTerm(query)
    setChapterSearchResults(results)
    setChapterSearchOpen(true)
  }, [chaptersListData])

  const handleChapterSearchSelect = useCallback((result) => {
    if (!result) return
    setChapterSearchOpen(false)
    setChapterSearchTerm(chapterSearchQuery.trim())
    setChapterSearchTarget({
      chapterIndex: result.chapterIndex,
      lineIndex: result.lineIndex,
    })
    window.selectChapter(result.chapterIndex)
  }, [chapterSearchQuery])

  const loadChapterIntoEditor = useCallback((content) => {
    const normalized = String(content || '').replace(/\r\n?/g, '\n')
    if (!normalized.trim()) {
      setEditorTitle('')
      setEditorContent('')
      return
    }

    const contentLines = normalized.split('\n')
    const firstContentLineIndex = contentLines.findIndex(line => line.trim())
    if (firstContentLineIndex === -1) {
      setEditorTitle('')
      setEditorContent('')
      return
    }

    const titleLine = contentLines[firstContentLineIndex].trim()
    const body = contentLines.slice(firstContentLineIndex + 1).join('\n').replace(/^\n+/, '')
    setEditorTitle(titleLine)
    setEditorContent(body)
  }, [chaptersListData])

  const toggleRightTool = useCallback((toolId) => {
    setActiveRightTools(current => {
      if (current.includes(toolId)) {
        return current.filter(id => id !== toolId)
      } else {
        return [...current, toolId]
      }
    })
  }, [chaptersListData])

  const renderRightDrawerContent = (toolId) => {
    switch (toolId) {
      case 'assistant':
        return <AssistantWorkspace apiConfig={apiConfig} referenceChapter={displayChapter} onClose={() => toggleRightTool(toolId)} />
      case 'map':
        return (
          <div className="right-drawer-panel">
            <div className="right-drawer-header">
              <h3>{'\u5730\u56fe'}</h3>
              <button type="button" className="drawer-close-btn" onClick={() => toggleRightTool(toolId)}>{'\u00d7'}</button>
            </div>
            <div className="right-drawer-body">
              <div className="drawer-card">
                <strong>{'\u5730\u56fe\u9762\u677f\u9884\u7559'}</strong>
                <p>{'\u8fd9\u91cc\u540e\u7eed\u53ef\u4ee5\u653e\u4e16\u754c\u5730\u56fe\u3001\u57ce\u6c60\u5206\u5e03\u3001\u8def\u7ebf\u5173\u7cfb\u548c\u573a\u666f\u4f4d\u7f6e\u7b49\u5185\u5bb9\u3002'}</p>
              </div>
            </div>
          </div>
        )
      case 'setting':
        return (
          <div className="right-drawer-panel">
            <div className="right-drawer-header">
              <h3>{'\u8bbe\u5b9a'}</h3>
              <button type="button" className="drawer-close-btn" onClick={() => toggleRightTool(toolId)}>{'\u00d7'}</button>
            </div>
            <div className="right-drawer-body">
              <div className="drawer-card">
                <strong>{'\u8bbe\u5b9a\u8d44\u6599\u533a'}</strong>
                <p>{'\u540e\u9762\u53ef\u4ee5\u5728\u8fd9\u91cc\u653e\u4e16\u754c\u89c2\u3001\u529b\u91cf\u4f53\u7cfb\u3001\u52bf\u529b\u3001\u7269\u54c1\u89c4\u5219\u7b49\u8bbe\u5b9a\u3002'}</p>
              </div>
            </div>
          </div>
        )
      case 'characters':
        return (
          <div className="right-drawer-panel">
            <div className="right-drawer-header">
              <h3>{'\u89d2\u8272'}</h3>
              <button type="button" className="drawer-close-btn" onClick={() => toggleRightTool(toolId)}>{'\u00d7'}</button>
            </div>
            <div className="right-drawer-body">
              <div className="drawer-card">
                <strong>{'\u89d2\u8272\u4fa7\u8fb9\u680f'}</strong>
                <p>{'\u53ef\u4ee5\u5728\u8fd9\u91cc\u5bf9\u5e94\u5de6\u4fa7\u89d2\u8272\u5217\u8868\uff0c\u540e\u7eed\u518d\u6269\u5c55\u5173\u7cfb\u3001\u72b6\u6001\u3001\u51fa\u573a\u7ae0\u8282\u7b49\u4fe1\u606f\u3002'}</p>
              </div>
            </div>
          </div>
        )
      case 'placeholder1':
        return (
          <div className="right-drawer-panel">
            <div className="right-drawer-header">
              <h3>{'\u529f\u80fd1'}</h3>
              <button type="button" className="drawer-close-btn" onClick={() => toggleRightTool(toolId)}>{'\u00d7'}</button>
            </div>
            <div className="right-drawer-body">
              <div className="drawer-card">
                <strong>{'\u6682\u65f6\u7559\u7a7a'}</strong>
                <p>{'\u8fd9\u4e2a\u529f\u80fd\u4f4d\u73b0\u5728\u5148\u9884\u7559\u7ed9\u540e\u7eed\u529f\u80fd 1\u3002'}</p>
              </div>
            </div>
          </div>
        )
      case 'placeholder2':
        return (
          <div className="right-drawer-panel">
            <div className="right-drawer-header">
              <h3>{'\u529f\u80fd2'}</h3>
              <button type="button" className="drawer-close-btn" onClick={() => toggleRightTool(toolId)}>{'\u00d7'}</button>
            </div>
            <div className="right-drawer-body">
              <div className="drawer-card">
                <strong>{'\u6682\u65f6\u7559\u7a7a'}</strong>
                <p>{'\u8fd9\u4e2a\u529f\u80fd\u4f4d\u73b0\u5728\u5148\u9884\u7559\u7ed9\u540e\u7eed\u529f\u80fd 2\u3002'}</p>
              </div>
            </div>
          </div>
        )
      case 'placeholder3':
        return (
          <div className="right-drawer-panel">
            <div className="right-drawer-header">
              <h3>{'\u529f\u80fd3'}</h3>
              <button type="button" className="drawer-close-btn" onClick={() => toggleRightTool(toolId)}>{'\u00d7'}</button>
            </div>
            <div className="right-drawer-body">
              <div className="drawer-card">
                <strong>{'\u6682\u65f6\u7559\u7a7a'}</strong>
                <p>{'\u8fd9\u4e2a\u529f\u80fd\u4f4d\u73b0\u5728\u5148\u9884\u7559\u7ed9\u540e\u7eed\u529f\u80fd 3\u3002'}</p>
              </div>
            </div>
          </div>
        )
      case 'writing':
        return <WritingWorkspace onClose={() => toggleRightTool(toolId)} />
      default:
        return null
    }
  }

  const renderSettingsDetail = () => {
    switch (settingsTab) {
      case 'feature1':
        return (
          <div className="settings-detail-body">
            <h4>{'API\u914d\u7f6e'}</h4>
            <p className="settings-detail-desc">{'\u628a\u73b0\u5728\u7684 API \u914d\u7f6e\u6536\u5230\u8fd9\u91cc\uff0c\u4fdd\u5b58\u540e\u4f1a\u76f4\u63a5\u540c\u6b65\u5230\u63d0\u53d6\u548c\u540e\u7eed AI \u529f\u80fd\u91cc\u3002'}</p>
            <div className="drawer-form settings-form">
              <div className="popup-field">
                <label>{'\u7aef\u70b9\u5730\u5740'}</label>
                <input type="text" value={popupForm.endpoint} onChange={e => setPopupForm({ ...popupForm, endpoint: e.target.value })} placeholder="https://api.openai.com/v1/chat/completions" />
              </div>
              <div className="popup-field">
                <label>{'\u6a21\u578b\u540d\u79f0'}</label>
                <input type="text" value={popupForm.model} onChange={e => setPopupForm({ ...popupForm, model: e.target.value })} placeholder="gpt-4o" />
              </div>
              <div className="popup-field">
                <label>API Key</label>
                <input type="password" value={popupForm.apiKey} onChange={e => setPopupForm({ ...popupForm, apiKey: e.target.value })} placeholder="sk-..." />
              </div>
              <div className="drawer-actions">
                <button className="action-btn drawer-action-btn" onClick={saveApiConfigForm}>{'\u4fdd\u5b58'}</button>
              </div>
            </div>
          </div>
        )
      case 'feature2':
        const activeTextSection = themeForm.textSections?.[themeTextTarget] || themeForm.textSections?.chapterList
        return (
          <div className="settings-detail-body">
            <h4>{'\u4e3b\u9898\u914d\u7f6e'}</h4>
            <p className="settings-detail-desc">{'\u5148\u9009\u9884\u8bbe\u4e3b\u9898\uff0c\u518d\u5fae\u8c03\u5b57\u4f53\u3001\u989c\u8272\u548c\u5b57\u53f7\u3002\u5f53\u524d\u9875\u9762\u4f1a\u5b9e\u65f6\u9884\u89c8\uff0c\u70b9\u786e\u5b9a\u540e\u624d\u4fdd\u5b58\u3002'}</p>
            <div className="drawer-form settings-form settings-theme-form">
              <div className="settings-section">
                <div className="settings-section-title">{'\u4e3b\u9898\u9884\u8bbe'}</div>
                <div className="settings-preset-row">
                  {['light', 'dark', 'custom'].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      className={'settings-preset-btn' + (themeForm.preset === preset ? ' active' : '')}
                      onClick={() => applyThemePresetToForm(preset)}
                    >
                      {THEME_PRESET_LABELS[preset]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-section">
                <div className="settings-section-title">{'\u5b57\u4f53\u4e0e\u5b57\u53f7'}</div>
                <div className="settings-grid">
                  <div className="popup-field">
                    <label>{'\u754c\u9762\u5b57\u4f53'}</label>
                    <select value={themeForm.uiFontFamily} onChange={e => updateThemeFormField('uiFontFamily', e.target.value)}>
                      {FONT_FAMILY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </div>
                  <div className="popup-field">
                    <label>{'\u6b63\u6587\u5b57\u4f53'}</label>
                    <select value={themeForm.contentFontFamily} onChange={e => updateThemeFormField('contentFontFamily', e.target.value)}>
                      {FONT_FAMILY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </div>
                  <div className="popup-field">
                    <label>{'\u754c\u9762\u5b57\u53f7'}</label>
                    <input type="range" min="12" max="16" value={themeForm.uiFontSize} onChange={e => updateThemeFormField('uiFontSize', Number(e.target.value))} />
                    <span className="settings-value-text">{themeForm.uiFontSize}px</span>
                  </div>
                  <div className="popup-field">
                    <label>{'\u6b63\u6587\u5b57\u53f7'}</label>
                    <input type="range" min="14" max="22" value={themeForm.contentFontSize} onChange={e => updateThemeFormField('contentFontSize', Number(e.target.value))} />
                    <span className="settings-value-text">{themeForm.contentFontSize}px</span>
                  </div>
                  <div className="popup-field">
                    <label>{'\u6807\u9898\u5b57\u53f7'}</label>
                    <input type="range" min="16" max="28" value={themeForm.titleFontSize} onChange={e => updateThemeFormField('titleFontSize', Number(e.target.value))} />
                    <span className="settings-value-text">{themeForm.titleFontSize}px</span>
                  </div>
                </div>
              </div>

              <div className="settings-section">
                <div className="settings-section-title">{'\u6587\u5b57\u914d\u7f6e'}</div>
                <div className="settings-grid">
                  <div className="popup-field">
                    <label>{'\u5b57\u4f53\u533a\u57df'}</label>
                    <select value={themeTextTarget} onChange={e => setThemeTextTarget(e.target.value)}>
                      {TEXT_SECTION_OPTIONS.map(option => <option key={option.key} value={option.key}>{option.label}</option>)}
                    </select>
                  </div>
                  <div className="popup-field">
                    <label>{'\u5b57\u4f53'}</label>
                    <select value={activeTextSection.fontFamily} onChange={e => updateThemeTextSection(themeTextTarget, 'fontFamily', e.target.value)}>
                      {FONT_FAMILY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </div>
                  <div className="popup-field">
                    <label>{'\u5b57\u53f7'}</label>
                    <input type="range" min="12" max="22" value={activeTextSection.fontSize} onChange={e => updateThemeTextSection(themeTextTarget, 'fontSize', Number(e.target.value))} />
                    <span className="settings-value-text">{activeTextSection.fontSize}px</span>
                  </div>
                  <div className="popup-field">
                    <label>{'\u5b57\u4f53\u989c\u8272'}</label>
                    <div className="settings-color-control">
                      <input type="color" value={activeTextSection.color} onChange={e => updateThemeTextSection(themeTextTarget, 'color', e.target.value)} />
                      <input type="text" value={activeTextSection.color} onChange={e => updateThemeTextSection(themeTextTarget, 'color', e.target.value)} />
                    </div>
                  </div>
                </div>
                <label className="settings-check-row">
                  <input
                    type="checkbox"
                    checked={Number(activeTextSection.fontWeight) >= 600}
                    onChange={e => updateThemeTextSection(themeTextTarget, 'fontWeight', e.target.checked ? 600 : 400)}
                  />
                  <span>{'\u52a0\u7c97'}</span>
                </label>
              </div>

              <div className="settings-section">
                <div className="settings-section-title">{'\u754c\u9762\u914d\u8272'}</div>
                <div className="settings-grid settings-grid-colors">
                  {[
                    ['accent', '\u5f3a\u8c03\u8272'],
                    ['pageBg', '\u9875\u9762\u80cc\u666f'],
                    ['panelBg', '\u4fa7\u680f\u80cc\u666f'],
                    ['centerBg', '\u4e2d\u533a\u80cc\u666f'],
                    ['surfaceBg', '\u5de5\u4f5c\u533a\u80cc\u666f'],
                    ['cardBg', '\u5361\u7247\u80cc\u666f'],
                    ['inputBg', '\u8f93\u5165\u6846\u80cc\u666f'],
                    ['editorBg', '\u7f16\u8f91\u533a\u80cc\u666f'],
                    ['headingColor', '\u6807\u9898\u989c\u8272'],
                    ['textColor', '\u6b63\u6587\u989c\u8272'],
                    ['mutedTextColor', '\u6b21\u7ea7\u6587\u5b57'],
                    ['borderColor', '\u8fb9\u6846\u989c\u8272'],
                  ].map(([field, label]) => (
                    <div className="popup-field settings-color-field" key={field}>
                      <label>{label}</label>
                      <div className="settings-color-control">
                        <input type="color" value={themeForm[field]} onChange={e => updateThemeFormField(field, e.target.value)} />
                        <input type="text" value={themeForm[field]} onChange={e => updateThemeFormField(field, e.target.value)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="settings-section">
                <div className="settings-section-title">{'\u4e3b\u9898\u9884\u89c8'}</div>
                <div className="settings-theme-preview-card">
                  <div className="settings-theme-preview-top">
                    <strong>{THEME_PRESET_LABELS[themeForm.preset]}</strong>
                    <span>{themeForm.accent}</span>
                  </div>
                  <div className="settings-theme-preview-line">
                    <span className="settings-theme-chip" style={{ backgroundColor: themeForm.accent }}></span>
                    <span>{'\u754c\u9762\u3001\u6b63\u6587\u3001\u5de5\u5177\u680f\u90fd\u4f1a\u6309\u5f53\u524d\u8868\u5355\u5b9e\u65f6\u9884\u89c8\u3002'}</span>
                  </div>
                </div>
              </div>

              <div className="drawer-actions settings-theme-actions">
                <button className="action-btn drawer-action-btn secondary" onClick={restoreSavedTheme}>{'\u6062\u590d\u5df2\u4fdd\u5b58'}</button>
                <button className="action-btn drawer-action-btn" onClick={saveThemeConfigForm}>{'\u786e\u5b9a\u4fdd\u5b58'}</button>
              </div>
            </div>
          </div>
        )
      default:
        return (
          <div className="settings-detail-body">
            <h4>{'\u5f85\u6dfb\u52a0'}</h4>
            <p className="settings-detail-desc">{'\u8fd9\u4e2a\u914d\u7f6e\u9879\u5148\u7a7a\u7740\uff0c\u540e\u7eed\u9700\u8981\u4ec0\u4e48\u529f\u80fd\u53ef\u4ee5\u76f4\u63a5\u5f80\u8fd9\u91cc\u7ee7\u7eed\u589e\u52a0\u3002'}</p>
          </div>
        )
    }
  }

  // Delegate clicks on chapter items to window.selectChapter
  useEffect(() => {
    const handleClick = (e) => {
      const item = e.target.closest('[data-index]')
      if (item) {
        const index = parseInt(item.dataset.index, 10)
        window.selectChapter(index)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [chaptersListData])

  return (
    <div className="app">
      <div className="left-wrapper">
        <div className="left-panel" ref={leftPanelRef} style={{ width: leftWidthState.current + 'px' }}>
          <div className="main-content-section" ref={mainContentRef}>
            {activeTool === 0 && (
              <div className="detail-section">
                <div className="detail-body">

                  {/* Upper section: upload + stats + chapter list */}
                  <div className="upper-section" ref={upperSectionRef}>
                    <div className="upload-section"><div className="file-upload-row">
                        <label htmlFor="file-upload" className="upload-btn">选择文件</label>
                        <div id="current-file" className="current-file placeholder-text">支持 .docx / .doc / .txt / .md / .rtf</div>
                        <input type="file" id="file-upload" accept=".txt,.docx,.md,.doc,.rtf" className="file-input" onChange={handleFileUpload} />
                      </div>
                    </div>
                    <div className="info-section">
                      <div className="stats-row">
                        <div className="stats-row-title">{'\u7ae0\u8282\u5217\u8868'}</div>
                        <div className="stat-card stat-card-inline">
                          <div className="stat-value" id="total-chapters">0</div>
                          <div className="stat-label">总章节数</div>
                        </div>
                        <div className="stat-card">
                          <div className="stat-value" id="total-words">0</div>
                          <div className="stat-label">总字数</div>
                        </div>
                      </div>
                    </div>
                    <div className="result-preview">
                      
                      <div id="chapters-list" className="chapters-result">
                        <p className="placeholder-text">请上传文件后选择范围</p>
                      </div>
                    </div>
                  </div>

                  {/* Top resizer */}
                  <div className={'internal-resizer' + (isDragging && dragSide === 'internal' ? ' active' : '')} onMouseDown={startInternalDrag('top')}></div>

                  {/* Outline block: range selector + outline list */}
                  <div className="outline-block" ref={outlineBodyRef}>
                    <div className="range-selector">
                      <span>章节大纲</span>
                      <input type="number" id="start-chapter" defaultValue="" min={1} className="range-input" />
                      <span>-</span>
                      <input type="number" id="end-chapter" defaultValue="" min={1} className="range-input" />
                      <button className="action-btn" id="extract-btn" onClick={handleExtract} disabled={extracting}>
                        {extracting ? '提取中...' : '提取'}
                      </button>
                      <input
                        type="text"
                        className="outline-search-input"
                        placeholder={'搜索章纲'}
                        value={outlineSearch}
                        onChange={handleOutlineSearchChange}
                      />
                      {outlineMatchCount > 0 && (
                        <span className="outline-search-count">{outlineActiveMatch}/{outlineMatchCount}</span>
                      )}
                      {outlineMatchCount > 1 && (
                        <div className="outline-search-nav">
                          <button type="button" className="outline-nav-btn" onClick={() => jumpOutlineMatch(-1)}>{'↑'}</button>
                          <button type="button" className="outline-nav-btn" onClick={() => jumpOutlineMatch(1)}>{'↓'}</button>
                        </div>
                      )}
                    </div>
                    <div className="detail-panel outline-panel">
                      <h3>章节大纲</h3>
                      <div id="outline-list" className="outline-list">
                        <p className="placeholder-text">暂无章节大纲数据</p>
                      </div>
                    </div>
                  </div>

                  {/* Mid resizer */}
                  <div className={'internal-resizer' + (isDragging && dragSide === 'internal' ? ' active' : '')} onMouseDown={startInternalDrag('mid')}></div>

                  {/* Characters panel: character list + dead characters */}
                  <div className="detail-panel characters-panel" ref={charsPanelRef}>
                    <div className="characters-empty-state">功能空置</div>
                  </div>

                </div>
              </div>
            )}
            {activeTool >= 1 && activeTool <= 6 && (
              <div className="detail-section">
                <div className="detail-body" style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <p className="placeholder-text" style={{ fontSize: '16px', textAlign: 'center' }}>{'「' + UNDEV_TITLES[activeTool] + '」功能尚未开发'}</p>
                </div>
              </div>
            )}
          </div>

          <div className="bottom-buttons-section">
            <button className={'tool-btn' + (activeTool === 0 ? ' tool-btn-active' : '')} onClick={() => setActiveTool(activeTool === 0 ? null : 0)}>大纲提取</button>
            <button className={'tool-btn' + (activeTool === 1 ? ' tool-btn-active' : '')} onClick={() => setActiveTool(activeTool === 1 ? null : 1)}>未开发1</button>
            <button className={'tool-btn' + (activeTool === 2 ? ' tool-btn-active' : '')} onClick={() => setActiveTool(activeTool === 2 ? null : 2)}>未开发2</button>
          </div>
        </div>
      </div>

      <div ref={leftResizerRef} className={'resizer' + (isDragging && dragSide === 'left' ? ' active' : '')} onMouseDown={startDrag('left')}></div>

      <div className="center-panel">
        <div className="center-body">
          <div className="chapter-display-area">
            {displayChapter ? (
              <>
                <div className="chapter-display-header">
                  <div className="chapter-display-title-group">
                    <h3>{displayChapter.title}</h3>
                    <div className="chapter-display-tools">
                      <label className="chapter-jump-group">
                        <span className="chapter-jump-label">{'跳转到'}</span>
                        <input
                          type="number"
                          min={1}
                          className="chapter-jump-input"
                          value={chapterJumpValue}
                          onChange={e => setChapterJumpValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              jumpToChapterNumber(chapterJumpValue)
                            }
                          }}
                        />
                      </label>
                      <div className="chapter-jump-nav">
                        <button type="button" className="chapter-nav-btn" onClick={() => goRelativeChapter(-1)} disabled={selectedChapterIndex <= 0}>{'↑'}</button>
                        <button type="button" className="chapter-nav-btn" onClick={() => goRelativeChapter(1)} disabled={selectedChapterIndex < 0 || selectedChapterIndex >= chaptersListData.length - 1}>{'↓'}</button>
                      </div>
                      <div className="chapter-search-box">
                        <input
                          ref={chapterSearchInputRef}
                          type="text"
                          className="chapter-search-input"
                          placeholder={'搜索全文'}
                          value={chapterSearchQuery}
                          onFocus={() => {
                            if (chapterSearchResults.length > 0) setChapterSearchOpen(true)
                          }}
                          onChange={e => runChapterSearch(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              runChapterSearch(chapterSearchQuery)
                            }
                          }}
                        />
                        {chapterSearchOpen && (
                          <div className="chapter-search-popup" ref={chapterSearchRef}>
                            <div className="chapter-search-popup-header">
                              <strong>{chapterSearchResults.length > 0 ? '搜索结果' : '没有找到结果'}</strong>
                              <span>{chapterSearchResults.length > 0 ? chapterSearchResults.length + ' 条' : '换个关键词试试'}</span>
                            </div>
                            <div className="chapter-search-popup-body">
                              {chapterSearchResults.map(result => (
                                <button
                                  key={result.id}
                                  type="button"
                                  className="chapter-search-result"
                                  onClick={() => handleChapterSearchSelect(result)}
                                >
                                  <span className="chapter-search-result-chapter">{result.chapterTitle}</span>
                                  <span className="chapter-search-result-snippet">{renderHighlightedText(result.snippet, chapterSearchTerm)}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="chapter-word-count">{'\u5b57\u6570\uff1a'}{displayChapter.content.replace(/\s/g, '').length}</span>
                </div>
                <div className="chapter-display-content" ref={chapterContentRef}>
                  {displayChapter.content.split('\n').map((line, i) => {
                    const targetKey = selectedChapterIndex + '-' + i
                    const isTargetLine =
                      chapterSearchTarget &&
                      chapterSearchTarget.chapterIndex === selectedChapterIndex &&
                      chapterSearchTarget.lineIndex === i

                    return (
                      <p
                        key={i}
                        ref={el => {
                          if (el) {
                            chapterSearchLineRefs.current[targetKey] = el
                          } else {
                            delete chapterSearchLineRefs.current[targetKey]
                          }
                        }}
                        className={isTargetLine ? 'chapter-search-target-line' : ''}
                      >
                        {line
                          ? renderHighlightedText(
                              line,
                              chapterSearchTerm && chapterSearchTarget?.chapterIndex === selectedChapterIndex ? chapterSearchTerm : ''
                            )
                          : '\u00a0'}
                      </p>
                    )
                  })}
                </div>
              </>
            ) : (
              <div className="chapter-display-empty">
                <p>{'\u8bf7\u5728\u5de6\u4fa7\u7ae0\u8282\u5217\u8868\u4e2d\u70b9\u51fb\u67e5\u770b\u7ae0\u8282\u5185\u5bb9'}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {settingsOpen && (
        <div className="settings-flyout" ref={settingsPanelRef}>
          <div className="settings-flyout-header">
            <h3>{'\u8bbe\u7f6e'}</h3>
            <button type="button" className="drawer-close-btn" onClick={() => setSettingsOpen(false)}>{'\u00d7'}</button>
          </div>
          <div className="settings-flyout-body">
            <div className="settings-nav">
              <button
                type="button"
                className={'settings-nav-btn' + (settingsTab === 'feature1' ? ' active' : '')}
                onClick={() => setSettingsTab('feature1')}
              >
                {'API\u914d\u7f6e'}
              </button>
              <button
                type="button"
                className={'settings-nav-btn' + (settingsTab === 'feature2' ? ' active' : '')}
                onClick={() => setSettingsTab('feature2')}
              >
                {'\u4e3b\u9898\u914d\u7f6e'}
              </button>
              <button
                type="button"
                className={'settings-nav-btn' + (settingsTab === 'pending' ? ' active' : '')}
                onClick={() => setSettingsTab('pending')}
              >
                {'\u5f85\u6dfb\u52a0'}
              </button>
            </div>
            <div className="settings-detail">
              {renderSettingsDetail()}
            </div>
          </div>
        </div>
      )}

      <div className="right-panel" ref={rightPanelRef} style={{ width: refs.rightWidth + 'px' }}>
        {activeRightTools.length > 0 && (
          <div className="right-tool-resizer right-panel-main-resizer" onMouseDown={startRightToolDrag('__main__')}></div>
        )}
        {activeRightTools.length > 0 && [...activeRightTools].reverse().map((toolId, index) => (
          <React.Fragment key={toolId}>
            <div
              className="right-tool-panel"
              ref={el => {
                if (el) {
                  refs.rightToolPanels[toolId] = el
                } else {
                  delete refs.rightToolPanels[toolId]
                }
              }}
            >
              {renderRightDrawerContent(toolId)}
            </div>
            {index < activeRightTools.length - 1 && (
              <div
                className="right-tool-resizer"
                onMouseDown={startRightToolDrag(toolId)}
              ></div>
            )}
          </React.Fragment>
        ))}
        <div className="right-dock">
          <div className="right-dock-tools">
            {RIGHT_DOCK_ITEMS.map(item => (
              <button
                key={item.id}
                type="button"
                className={'right-dock-btn' + (activeRightTools.includes(item.id) ? ' active' : '')}
                onClick={() => toggleRightTool(item.id)}
              >
                <span className="right-dock-icon">{item.shortLabel}</span>
                <span className="right-dock-text">{item.label}</span>
              </button>
            ))}
          </div>
          <div className="right-dock-bottom" ref={settingsButtonRef}>
            <button
              type="button"
              className={'right-dock-btn right-dock-settings-btn' + (settingsOpen ? ' settings-active' : '')}
              onClick={toggleSettingsPanel}
            >
              <span className="right-dock-icon">{RIGHT_SETTINGS_ITEM.shortLabel}</span>
              <span className="right-dock-text">{RIGHT_SETTINGS_ITEM.label}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

























