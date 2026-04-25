---
name: chapter-outline
description: Extracts selected chapter-range outlines. Each chapter should be summarized into about 200 Chinese characters and organized as 3 main-line bullet points. Use when the user clicks "提取" for chapter outlines.
allowed-tools: Read Write Edit
---

# Chapter Outline Skill

## Purpose

Generate per-chapter outline summaries for a selected chapter range.

## Output Rules

- Scope: only the selected chapter range
- Unit: one output block per chapter
- Length: around 200 Chinese characters per chapter
- Structure:
  - `第X章`
  - `1.`
  - `2.`
  - `3.`
- Focus: main plot line, key conflict, and meaningful progression
- Avoid filler, vague praise, and generic wording

## UI Binding

- Triggered by the left toolbar `提取` button in the chapter-outline section
- Render target: the blank result panel directly under `章节大纲`
- The selector row stays fixed at the top; only the result content scrolls

## References

- [Output Format](references/output-format.md)

