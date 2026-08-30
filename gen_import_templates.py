# -*- coding: utf-8 -*-
# ============================================================================
# gen_import_templates.py
#
# Reads the official NTA JEE Main 2026 question-paper PDFs (the ones in
# ~/Downloads whose text layer contains the "Question Paper Name : B Tech ..."
# header) and emits one FILL-IN JSON template per paper into
#   papers_2026/import/<date>_shift<n>.json
#
# Why templates? The official NTA PDFs store question bodies and options as
# IMAGES, so text extraction only yields the skeleton: subject, section
# (A = 20 MCQ, B = 5 numerical), question number and NTA question id. Each
# template contains that exact skeleton with placeholders where the human
# pastes the visible question text, the four options, and the answers.
#
# The template is already in the exact format import_real_paper.js consumes,
# so once filled in, importing is a single command.
#
# Run:  python gen_import_templates.py
# ============================================================================

import io
import json
import os
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from pypdf import PdfReader  # noqa: E402

DOWNLOADS = os.path.expanduser('~/Downloads')
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'papers_2026', 'import')

MONTHS = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
    'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12',
}

SUBJECTS = ('Mathematics', 'Physics', 'Chemistry')


def sanitize(name):
    return re.sub(r'[^A-Za-z0-9_\- ]+', ' ', name).strip()


def parse_paper(pdf_path):
    """Return (meta, sections) from the PDF text layer."""
    reader = PdfReader(pdf_path)
    pages_text = [p.extract_text() or '' for p in reader.pages]
    text = '\n'.join(pages_text)

    m = re.search(r'Question Paper Name :\s*(.+)', text)
    raw_name = m.group(1).strip() if m else os.path.basename(pdf_path)

    # Stream of (kind, value) markers: section headers and question records,
    # in the order they appear in the PDF text layer.
    events = []
    for line in text.splitlines():
        line = line.strip()
        m = re.match(r'^(Mathematics|Physics|Chemistry) Section [AB]$', line)
        if m:
            events.append(('section', line))
            continue
        m = re.match(r'^Question Number : (\d+) Question Id : (\d+) Question Type : (\S+)', line)
        if m:
            events.append(('question', (int(m.group(1)), int(m.group(2)), m.group(3))))

    # Assign every question to the section header that precedes it.
    current = None  # e.g. 'Mathematics Section A'
    order = []      # list of (subject, is_mcq, qnum, qid)
    for kind, val in events:
        if kind == 'section':
            current = val
        else:
            qnum, qid, qtype = val
            if current is None:
                raise ValueError('Question before any section header: ' + str(val))
            subject, part = current.split(' Section ')
            is_mcq = part == 'A'
            order.append((subject, is_mcq, qnum, qid))
            if qtype != ('MCQ' if is_mcq else 'SA'):
                raise ValueError('Type mismatch: %s in %s (got %s)' % (qnum, current, qtype))

    # Group by subject, preserving PDF order.
    sections = []
    for subject in SUBJECTS:
        qs = [q for q in order if q[0] == subject]
        mcq = [q for q in qs if q[1]]
        num = [q for q in qs if not q[1]]
        if len(mcq) != 20 or len(num) != 5:
            raise ValueError('%s in %s: expected 20 MCQ + 5 SA, got %d + %d'
                             % (subject, raw_name, len(mcq), len(num)))
        sections.append({
            'subject': subject,
            'mcq': mcq,
            'num': num,
        })
    return raw_name, sections


def build_template(raw_name):
    m = re.search(r'(\d{1,2})(?:st|nd|rd|th)?\s+(\w{3})\s+(\d{4})\s+Shift\s+(\d+)', raw_name)
    if not m:
        raise ValueError('Cannot parse shift info from paper name: %r' % raw_name)
    day = int(m.group(1))
    month = m.group(2)
    year = m.group(3)
    shift = int(m.group(4))
    month_num = MONTHS.get(month)
    if month_num is None:
        raise ValueError('Unknown month %r in %r' % (month, raw_name))

    title = 'JEE Main 2026 - %d %s Shift %d (NTA)' % (day, month, shift)
    file_name = '%s-%02d-%02d_shift%d.json' % (year, int(month_num), day, shift)
    description = (
        'Real NTA paper (%s). Imported verbatim via template fill-in; '
        'difficulty tags default to moderate and can be edited per question.' % raw_name
    )
    return title, description, file_name


def make_template_paper(raw_name):
    title, description, file_name = build_template(raw_name)
    _, sections = parse_paper(os.path.join(DOWNLOADS, pdf_for(raw_name)))

    out_sections = []
    for sec in sections:
        mcq = []
        for i, (subject, is_mcq, qnum, qid) in enumerate(sec['mcq'], start=1):
            mcq.append([
                '__Q%d (id %d) PASTE QUESTION BODY HERE__' % (qnum, qid),
                ['__OPTION 1__', '__OPTION 2__', '__OPTION 3__', '__OPTION 4__'],
                0,  # correctIdx -- SET to the real answer's index (0-3)!
                'moderate',
            ])
        num = []
        for i, (subject, is_mcq, qnum, qid) in enumerate(sec['num'], start=1):
            num.append([
                '__Q%d (id %d) PASTE QUESTION BODY HERE__' % (qnum, qid),
                '__NUMERICAL ANSWER__',
                'moderate',
            ])
        out_sections.append({'name': sec['subject'], 'mcq': mcq, 'num': num})

    return {
        'title': title,
        'description': description,
        'duration_minutes': 180,
        'sections': out_sections,
    }, file_name


def pdf_for(raw_name):
    """Find the PDF in ~/Downloads whose paper name matches raw_name."""
    for f in os.listdir(DOWNLOADS):
        if not f.lower().endswith('.pdf'):
            continue
        try:
            r = PdfReader(os.path.join(DOWNLOADS, f))
            t = r.pages[0].extract_text() or ''
            m = re.search(r'Question Paper Name :\s*(.+)', t)
            if m and m.group(1).strip() == raw_name:
                return f
        except Exception:
            continue
    raise ValueError('No PDF found for paper name %r' % raw_name)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    # Scan all candidate PDFs once, group by paper name.
    found = {}
    for f in sorted(os.listdir(DOWNLOADS)):
        if not f.lower().endswith('.pdf'):
            continue
        path = os.path.join(DOWNLOADS, f)
        try:
            r = PdfReader(path)
            t = r.pages[0].extract_text() or ''
        except Exception:
            continue
        m = re.search(r'Question Paper Name :\s*(.+)', t)
        if m and 'B Tech' in m.group(1):
            found[m.group(1).strip()] = f

    if not found:
        print('No official NTA "B Tech" papers found in %s' % DOWNLOADS)
        sys.exit(1)

    written = []
    for raw_name in sorted(found):
        try:
            paper, file_name = make_template_paper(raw_name)
        except Exception as e:
            print('SKIP %r: %s' % (raw_name, e))
            continue
        out_path = os.path.join(OUT_DIR, file_name)
        with open(out_path, 'w', encoding='utf-8') as fh:
            json.dump(paper, fh, indent=2, ensure_ascii=False)
        written.append((file_name, paper['title']))

    print('Wrote %d templates to %s' % (len(written), OUT_DIR))
    for file_name, title in written:
        print('  %-28s %s' % (file_name, title))
    print('NOTE: every template has placeholder bodies/options/answers - fill them in, then import.')


if __name__ == '__main__':
    main()
