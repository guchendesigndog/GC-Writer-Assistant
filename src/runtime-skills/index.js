import { chapterOutlineSkill } from './chapter-outline/index.js'
import { characterAnalysisSkill } from './character-analysis.js'
import { timelineSkill } from './timeline.js'
import { aiPolishSkill } from './ai-polish.js'
import { aiContinueSkill } from './ai-continue.js'
import { aiStorylineSkill } from './ai-storyline.js'

export const skills = [chapterOutlineSkill, characterAnalysisSkill, timelineSkill, aiPolishSkill, aiContinueSkill, aiStorylineSkill]

export function getSkillByName(name) {
  return skills.find(s => s.name === name) || null
}
