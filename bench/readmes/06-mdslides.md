# mdslides

Turn a Markdown file into a slide deck that runs in the browser. Keyboard navigation, speaker notes, print to PDF.

Separate slides with a line containing only `---`. Put speaker notes after `Note:`.

```
# Title
---
## Point one
Note: say the story here
```

Build with `npx mdslides build talk.md`, present with `npx mdslides serve talk.md`.

## Themes

Two themes: `light` and `dark`. Pick one with `--theme`. Custom CSS goes in `mdslides.css` next to the file.

Contributions welcome, but please open an issue first.
