# Markdown Guide

Quick reference for writing course pages and reflections.

## Headings
Use `#` for titles and smaller headings.

```markdown
# Page Title
## Section
### Subsection
```

## Paragraphs and Line Breaks
Blank lines separate paragraphs. End a line with two spaces for a soft break.

```markdown
First line with a soft break.  
Second line in the same paragraph.
```

## Emphasis

```markdown
*italic* or _italic_
**bold**
***bold italic***
```

## Lists
Unordered, ordered, and task lists.

```markdown
- bullet item
- another item

1. first
2. second

- [x] done
- [ ] to do
```

## Links and Images
Use relative paths inside the repo.

```markdown
[Week 01 reflection](../reflections/week01.md)
[Outside resource](https://example.com)
![Alt text for image](../assets/images/example.png)
```

### Embedding local images
- Put images in assets/images.
- From reflections/ or pages/ folders, link with `../assets/images/filename.ext`.
- Write helpful alt text that describes the image.

```markdown
![Alt text: campus map sketch](../assets/images/campus-sketch.png)
```

## Code and Quotes

```markdown
Inline `code` in a sentence.

```
code fence for multiple lines
```

> Blockquotes are great for citing sources.
```

## Tables

```markdown
| Item | Detail |
| --- | --- |
| Row 1 | Text |
| Row 2 | More text |
```

## Horizontal Rules and Escaping

```markdown
---
\*Escape characters\* so they render literally.
```

## Footnotes (optional)

```markdown
Here is a footnote.[^1]

[^1]: Footnote text goes here.
```

## Course Tips
- Keep filenames lowercase with hyphens (no spaces).
- Place images in assets/images and link with ../assets/images/filename.png from pages/.
- Preview markdown in VS Code (built-in) before submitting.
- Keep headings in order (do not jump from # to ### directly).
- Use descriptive alt text for images (what someone would miss if the image did not load).
- When copying from Word/Google Docs, paste as plain text to avoid odd characters.

## Weekly Reflection Template

Use this structure for weekly reflections (adjust prompts as needed).

```markdown
# Week 13 Reflection

## Prompt 1: Key insight
Write 3-5 sentences answering the question. Focus on what surprised you or changed your view.

## Prompt 2: Example or evidence
- Briefly describe an artifact, reading, or class activity.
- Explain how it supports or challenges your thinking.

## Prompt 3: Next steps
1. What will you try next week?
2. What do you still need to learn or clarify?

## Media (optional)
![Alt text: short description](../assets/images/example.png)
```

Tips for reflections
- Start with a clear H1 title: `# Week X Reflection`.
- Keep sections in order; avoid skipping heading levels.
- Prefer short paragraphs and bullet points over long blocks of text.
- If you include images, explain why they matter in the surrounding text.
