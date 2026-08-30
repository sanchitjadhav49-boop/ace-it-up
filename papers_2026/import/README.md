# Importing the official NTA JEE Main 2026 papers (9 shifts)

This folder contains **one fill-in JSON template per official NTA paper** (from your
Downloads folder). The NTA PDFs store question bodies and options as **images**, so
they cannot be extracted as text automatically. The templates below already contain
the correct skeleton extracted from each PDF (subject order, Section A = 20 MCQ,
Section B = 5 numerical, question numbers, and the NTA question id for
cross-referencing). Your job is to paste the visible question text, options and
answers into each template, then run one command to import everything.

## Files

| Template file                 | Paper                       |
|-------------------------------|-----------------------------|
| `2026-04-02_shift1.json`      | JEE Main 2026 - 2 Apr Shift 1 |
| `2026-04-02_shift2.json`      | JEE Main 2026 - 2 Apr Shift 2 |
| `2026-04-04_shift1.json`      | JEE Main 2026 - 4 Apr Shift 1 |
| `2026-04-04_shift2.json`      | JEE Main 2026 - 4 Apr Shift 2 |
| `2026-04-05_shift1.json`      | JEE Main 2026 - 5 Apr Shift 1 |
| `2026-04-05_shift2.json`      | JEE Main 2026 - 5 Apr Shift 2 |
| `2026-04-06_shift1.json`      | JEE Main 2026 - 6 Apr Shift 1 |
| `2026-04-06_shift2.json`      | JEE Main 2026 - 6 Apr Shift 2 |
| `2026-04-08_shift2.json`      | JEE Main 2026 - 8 Apr Shift 2 |

## Template format (this is what `import_real_paper.js` consumes)

Each template has 3 sections: `Mathematics`, `Physics`, `Chemistry` - in the order
the paper prints them. Every section has:

- `mcq` - 20 entries, each an array of 4 items:
  ```json
  [
    "Question body text (paste here)",
    ["Option 1", "Option 2", "Option 3", "Option 4"],
    2,
    "moderate"
  ]
  ```
  - `[0]` question body
  - `[1]` exactly 4 options, in the order the PDF shows them
  - `[2]` **correct option index, 0-3** (0 = first option, 3 = fourth). This is the
    answer! Set it from the official answer key. The template defaults it to `0`,
    which is almost certainly WRONG - you must change it.
  - `[3]` difficulty: `easy` | `moderate` | `difficult` (optional; defaults to moderate)

- `num` - 5 entries, each an array of 3 items:
  ```json
  [
    "Question body text (paste here)",
    "42",
    "moderate"
  ]
  ```
  - `[1]` is the **exact numerical answer**. JEE Main Section B answers are
    integers between 0 and 9 (or decimal, e.g. `1.33` for units questions).
    Use a plain number or numeric string; do not include units.

## Workflow

1. **Open a paper PDF** (e.g. `20260409481957146.pdf` = 2 Apr Shift 2) and open its
   matching template JSON in a text editor (VS Code recommended).
2. **Replace every placeholder**:
   - `__Q1 (id 691121151) PASTE QUESTION BODY HERE__` -> the question text (delete
     the `Q1 (id ...)` marker or keep it, it is just for cross-referencing)
   - `__OPTION 1__` ... `__OPTION 4__` -> the four options as printed
   - `__NUMERICAL ANSWER__` -> the exact numerical answer
   - The correct-option index `0` -> the real answer's index (0-3)
3. **Save the file as UTF-8.** The app is ASCII-friendly, but Unicode is fine for
   question text (subscripts, Greek letters, etc.).
4. **Check** that no placeholders are left (optional but recommended):
   ```
   node-v22.23.2-win-x64\node.exe check_import_templates.js
   ```
5. **Import everything** (idempotent - re-running replaces same-named tests):
   ```
   node-v22.23.2-win-x64\node.exe import_templates.js
   ```
6. Each paper appears in the app as a **published mock test** titled
   `JEE Main 2026 - <date> Shift <n> (NTA)` - visible in the mock-test list,
   "My History", Analysis and Answer Key.

## Where to get the answers

The official NTA question-paper PDFs do **not** include the answer key. Use any of:

- **Official NTA answer keys**: published on the official JEE Main site
  (jeemain.nta.nic.in) per shift, usually a few days after the exam.
- **Coaching-site solutions**: MathonGo, eSaral, Resonance, Allen, Motion, etc.
  publish free PDFs with fully worked solutions for every shift - search e.g.
  "JEE Main 2 April 2026 Shift 2 answer key MathonGo".
- **NTA answer-key challenge PDFs** also list the correct option id per question
  id - you can match against the id shown in each placeholder.

## Marking (for reference)

- MCQ: +4 correct, -1 wrong, 0 unattempted
- Numerical: +4 correct, 0 wrong, 0 unattempted (no negative marking)

## Scripts in this folder's parent directory

- `gen_import_templates.py` - regenerates the templates from the PDFs (already run).
- `check_import_templates.js` - flags any template still containing placeholders.
- `import_templates.js` - imports all filled templates as published tests.
