# Research Notes – website content

This folder is a static, GitHub Pages-compatible notes library.

- `index.html` — searchable topic index and links to original CSDN posts.
- `step-trend.html` — expanded first academic-method note.
- `template.html` — standardized academic note to duplicate for subsequent posts.
- `style.css` — shared note styling.

## Add one article
1. Duplicate `template.html` as a descriptive filename such as `gnss-strain.html`.
2. Fill sections; verify formulas, code, original dates, figure attributions, references and results.
3. Add a card to the `articles` array in the *build script* if regenerating, or directly add a card in `notes/index.html` if maintaining HTML manually.
4. Commit all website files to the repository root; preserve `images/geoid.gif` and the research-highlight images.

CSDN links labelled `CSDN archive` go to the profile, not directly to an article, until individual links are verified. Original blog text has not been copied wholesale.
