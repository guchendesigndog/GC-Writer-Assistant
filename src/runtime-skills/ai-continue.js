import { callLLM } from '../services/llm-service.js'

function buildContinueMessages(referenceChapter, writingChapter, storyline) {
  const referenceText = String(referenceChapter?.content || '').trim()
  const currentTitle = String(writingChapter?.title || '').trim()
  const currentContent = String(writingChapter?.content || '').trim()
  const currentStoryline = String(storyline || '').trim()

  return [
    {
      role: 'system',
      content:
        '你是中文网文续写助手。请根据作者当前正文、参考章节文风和给定主线框架，续写约 500 字左右的正文。只输出续写正文，不要解释，不要分析，不要分点。',
    },
    {
      role: 'user',
      content:
        '请结合以下信息续写正文。\n\n' +
        '【参考章节文风】\n' + (referenceText || '暂无参考章节内容。') +
        '\n\n【当前章节标题】\n' + (currentTitle || '未命名章节') +
        '\n\n【当前正文】\n' + currentContent +
        '\n\n【当前主线框架】\n' + (currentStoryline || '暂无主线框架，请根据当前正文谨慎承接。') +
        '\n\n要求：\n1. 续写紧接当前正文向下写。\n2. 明显参考当前文风，不要跳戏。\n3. 优先承接当前主线框架里的推进点。\n4. 长度控制在约 400-600 字。\n5. 只输出可直接接在正文后面的续写内容。',
    },
  ]
}

export const aiContinueSkill = {
  name: 'ai-continue',
  label: 'AI续写',
  description: '结合当前正文和主线框架，续写约 500 字正文。',

  async run(apiConfig, payload) {
    if (!payload?.writingChapter?.content?.trim()) {
      return { ok: false, error: '当前没有可续写的正文内容' }
    }

    const result = await callLLM(
      apiConfig,
      buildContinueMessages(payload.referenceChapter, payload.writingChapter, payload.storyline),
    )
    if (!result.ok) return result

    return {
      ok: true,
      data: {
        content: String(result.content || '').trim(),
      },
    }
  },
}
