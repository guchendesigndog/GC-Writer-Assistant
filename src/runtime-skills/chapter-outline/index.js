import { callLLM } from '../../services/llm-service.js'
import { buildChapterOutlineMessages } from './prompt.js'

function extractJson(content) {
  if (!content) return null
  try {
    return JSON.parse(content)
  } catch {
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1])
      } catch {
        return null
      }
    }
    return null
  }
}

function normalizePoints(points) {
  if (!Array.isArray(points)) return []
  return points
    .map(item => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 3)
}

export const chapterOutlineSkill = {
  name: 'chapter-outline',
  label: '章节大纲',
  description: '提取选定章节范围内每一章的 200 字左右要点式大纲',

  async run(apiConfig, chapters) {
    if (!chapters || chapters.length === 0) {
      return { ok: false, error: '没有可提取的章节数据' }
    }

    const results = []

    for (const chapter of chapters) {
      const messages = buildChapterOutlineMessages(chapter)
      const result = await callLLM(apiConfig, messages)
      if (!result.ok) return result

      const parsed = extractJson(result.content)
      if (!parsed) {
        return { ok: false, error: '模型返回格式无法解析，请重试' }
      }

      const points = normalizePoints(parsed.points)
      if (points.length === 0) {
        return { ok: false, error: '模型未返回有效大纲要点，请重试' }
      }

      results.push({
        chapter: chapter.num,
        chapterLabel: `第${chapter.num || results.length + 1}章`,
        title: String(parsed.title || chapter.title || '').trim(),
        points,
      })
    }

    return { ok: true, data: results }
  },
}

