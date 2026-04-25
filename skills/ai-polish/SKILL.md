---
name: ai-polish
description: References the currently displayed chapter style and polishes the user's live writing in real time.
allowed-tools: Read Write Edit
---

# AI Polish Skill

## Purpose

Polish the text currently being written while preserving plot facts and the author's intent.

## Rules

- Reference the tone, rhythm, and narrative texture of the currently displayed chapter.
- Keep the user's original plot facts, causality, and character relationships unchanged.
- Only optimize wording, flow, sentence rhythm, and readability.
- Output only the polished正文，不解释。

## UI Binding

- Triggered by the `AI润色` switch inside the right-side `AI辅助` panel.
- Requires a valid API configuration.
- Target render area: the upper half of the `AI辅助` workspace.
