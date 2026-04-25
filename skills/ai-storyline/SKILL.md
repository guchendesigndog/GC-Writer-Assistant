---
name: ai-storyline
description: Summarizes the user's current chapter into a short editable storyline frame for continuation guidance.
allowed-tools: Read Write Edit
---

# AI Storyline Skill

## Purpose

Summarize the current chapter draft into a 100-300 Chinese character storyline frame.

## Rules

- Focus on current main-line progression, conflict direction, and next-step hooks.
- Keep the output concise and editable.
- Do not output analysis prose or extra explanation.
- Output only the storyline frame text itself.

## UI Binding

- Runs under the `AI续写` section.
- The generated storyline is shown in the lower editable box.
- The `AI续写` output should reference this edited storyline frame.
