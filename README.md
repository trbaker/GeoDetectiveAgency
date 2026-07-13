# 🧭 Geo Detective Agency

A geography inquiry game for grades 3–5. Students "close cases" about real places by asking and answering the three geographic questions: **Where is it? Why is it there? Why does it matter to me?**

Built with plain HTML, CSS, and JavaScript — no build step, no dependencies.

## Files

| File | What it does |
|---|---|
| `index.html` | The page shell |
| `styles.css` | All styling |
| `data.js` | **All game content** — cases, questions, hints, badges. Edit this to add or change cases. |
| `app.js` | Game logic, screens, and saved progress |

## How students learn

1. **Sort the questions** — classify prompts as Where / Why There / Matters to Me.
2. **Investigate** — answer 6 clue questions per case. A wrong pick triggers a hint and a second try; every answer ends with a plain-language explanation (self-check).
3. **You ask the questions** — pick the strongest geographic question a detective would ask next.
4. **Cold Case Files** — questions missed twice go into a practice deck; solving them later upgrades mastery (self-improvement).
5. **Detective Passport** — badges tied to concepts attained (Location Locator, Pattern Sleuth, Connection Champ, Question Sorter, Question Master, Comeback Detective, Master Detective) plus a stamp per closed case.

Progress saves automatically in the browser via `localStorage` — each student's progress lives on their own device/browser profile. Clearing browser data resets it.

## Deploy to GitHub Pages

1. Create a new repository on GitHub (e.g., `geo-detective`).
2. Upload these four files (`index.html`, `styles.css`, `data.js`, `app.js`) to the repository root. Drag-and-drop on github.com works fine: **Add file → Upload files**.
3. In the repository, go to **Settings → Pages**.
4. Under **Build and deployment**, set Source to **Deploy from a branch**, choose the `main` branch and `/ (root)` folder, and click **Save**.
5. After a minute or two, your game will be live at `https://YOUR-USERNAME.github.io/geo-detective/`.

Any edit you push to `main` (for example, new cases in `data.js`) redeploys automatically.

## Adding a case

In `data.js`, copy an existing object in the `CASES` array and change:

- `id` (must be unique), `title`, `place`, `emoji`, `intro`
- 3 `sort` items (each tagged `where`, `why`, or `matters`)
- 6 `questions` (2 per lens) with `options`, `correct` index, `hint`, and `explain`
- 1 `ask` item with exactly one option marked `good: true`

Badge targets at the bottom of `data.js` assume 5 cases (15 sort items, 10 questions per lens, 5 ask items). If you add cases, you can raise those targets so badges stay meaningful.
