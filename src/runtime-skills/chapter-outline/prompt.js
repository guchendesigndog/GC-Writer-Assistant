const CHAPTER_CHAR_LIMIT = 6000

function normalizeChapterContent(chapter) {
  const raw = chapter.rawContent || chapter.content || ''
  return raw.length > CHAPTER_CHAR_LIMIT ? raw.slice(0, CHAPTER_CHAR_LIMIT) + '\n...' : raw
}

export function buildChapterOutlineMessages(chapter) {
  const content = normalizeChapterContent(chapter)
  const chapterLabel = `第${chapter.num || ''}章`
  const chapterTitle = chapter.title || chapterLabel

  return [
    {
      role: 'system',
      content:
        '你是小说章节大纲整理助手。请阅读给定章节内容，输出严格 JSON，不要输出任何额外说明。' +
        'JSON 格式为 {"title":"章节标题","points":["要点1","要点2","要点3"]}。' +
        '要求：' +
        '1. points 必须正好 3 条；' +
        '2. 每条聚焦这一章的重要主线、关键冲突或剧情推进；' +
        '3. 三条合计约 200 字；' +
        '4. 不要空话，不要写“本章主要讲述了”；' +
        '5. 保持中文表达自然清晰。',
    },
    {
      role: 'user',
      content:
        `${chapterLabel} ${chapterTitle}\n\n` +
        '请按要求整理这一章的大纲。\n\n' +
        content,
    },
  ]
}

