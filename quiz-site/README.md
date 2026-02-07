# Quiz Site

Static learning content for GitHub Pages.

## Included content
- Learning roadmap for implementation priorities
- Term cards (definition + analogy + project example)
- Security operation checklist
- Security-focused quiz and all-topic quiz
- Offline support via service worker (PWA-lite)

## Local preview
```bash
cd quiz-site
python -m http.server 8080
```
Open `http://localhost:8080`.

## Notes
- This is static content, so it can be hosted on GitHub Pages.
- Quiz progress and checklist state are saved in browser localStorage.
