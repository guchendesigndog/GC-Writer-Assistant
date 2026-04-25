import { callLLM } from '../services/llm-service.js'

const POLISH_CURRENT_LIMIT = 500

function sliceLatestDraft(text, limit = POLISH_CURRENT_LIMIT) {
  const source = String(text || '').trim()
  if (!source) return ''
  return source.length > limit ? '...\n' + source.slice(source.length - limit) : source
}

function buildPolishMessages(referenceChapter, writingChapter) {
  const referenceText = String(referenceChapter?.content || '').trim()
  const currentTitle = String(writingChapter?.title || '').trim()
  const currentContent = sliceLatestDraft(writingChapter?.content || '')

  return [
    {
      role: 'system',
      content:
        '你是中文网文润色助手。你的任务是参考给定章节的文笔、节奏和叙述气质，对作者当前正在写的正文做润色。只输出润色后的正文，不要解释，不要分析，不要加标题，不要分点。',
    },
    {
      role: 'user',
      content:
        '请先参考下面这段章节展示区正文的写法，再润色我当前正在写的内容。\\n\\n' +
        '【参考章节文风（整章）】\\n' + (referenceText || '暂无参考章节内容。') +
        '\\n\\n【当前章节标题】\\n' + (currentTitle || '未命名章节') +
        '\\n\\n【当前正在写的最近正文】\\n' + currentContent +
        '\\n\\n要求：\\n1. 参考整章文风，但只润色上面给出的最近正文。\\n2. 不改变剧情事实和人物关系。\\n3. 不新增设定。\\n4. 保留作者原意，只优化表达、节奏、衔接和流畅度。\\n5. 输出可直接替换进正文的润色结果。',
    },
  ]
}

export const aiPolishSkill = {
  name: 'ai-polish',
  label: 'AI润色',
  description: '参考章节展示区整章文风，对当前码字最近内容进行润色。',

  async run(apiConfig, payload) {
    if (!payload?.writingChapter?.content?.trim()) {
      return { ok: false, error: '当前没有可润色的正文内容' }
    }

    const result = await callLLM(apiConfig, buildPolishMessages(payload.referenceChapter, payload.writingChapter))
    if (!result.ok) return result

    return {
      ok: true,
      data: {
        content: String(result.content || '').trim(),
      },
    }
  },
}
