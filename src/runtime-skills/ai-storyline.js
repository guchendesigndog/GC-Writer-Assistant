import { callLLM } from '../services/llm-service.js'

function buildStorylineMessages(referenceChapter, writingChapter) {
  const referenceText = String(referenceChapter?.content || '').trim()
  const currentTitle = String(writingChapter?.title || '').trim()
  const currentContent = String(writingChapter?.content || '').trim()

  return [
    {
      role: 'system',
      content:
        '你是中文网文剧情整理助手。请根据当前章节正文，用具体事实整理当前剧情重点。只写中肯、细节化、可直接用于写作承接的内容，不要写概念化评价，不要写空泛判断。',
    },
    {
      role: 'user',
      content:
        '请根据以下内容整理当前主线框架。\n\n' +
        '【参考章节文风】\n' + (referenceText || '暂无参考章节内容。') +
        '\n\n【当前章节标题】\n' + (currentTitle || '未命名章节') +
        '\n\n【当前正文】\n' + currentContent +
        '\n\n要求：\n1. 直接用 1. 2. 3. 这样的编号列举 3-6 条。\n2. 每条只总结当前文章里已经写出来的具体剧情重点、人物动作、冲突变化、信息推进。\n3. 不要写“节奏加快”“埋下伏笔”“世界观展开”这种概念化判断。\n4. 不要补总结段，不要分析，只保留编号条目。\n5. 每条尽量具体、能直接指导后续续写。',
    },
  ]
}

export const aiStorylineSkill = {
  name: 'ai-storyline',
  label: 'AI主线框架',
  description: '整理当前章节主线框架，先分点概括，再补总结。',

  async run(apiConfig, payload) {
    if (!payload?.writingChapter?.content?.trim()) {
      return { ok: false, error: '当前没有可整理的正文内容' }
    }

    const result = await callLLM(apiConfig, buildStorylineMessages(payload.referenceChapter, payload.writingChapter))
    if (!result.ok) return result

    return {
      ok: true,
      data: {
        content: String(result.content || '').trim(),
      },
    }
  },
}
