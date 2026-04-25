---
name: ai-continue
description: Continues the user's current writing in real time based on the current prose and editable storyline frame.
allowed-tools: Read Write Edit
---

# AI Continue Skill

## Purpose

Continue the user's current chapter by around 200-500 Chinese characters.

## Rules

- Continue directly from the user's current text.
- Reference the user's own prose style first.
- Also reference the editable storyline frame maintained in the same panel.
- Keep continuation coherent with the current main plot, character state, and emotional momentum.
- Output only续写正文，不解释。

## UI Binding

- Triggered by the `AI续写` switch inside the right-side `AI辅助` panel.
- Uses the lower-upper section of the assistant workspace.
