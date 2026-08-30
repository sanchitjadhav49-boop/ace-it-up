import glob, json, os, re, sys

files = sorted(glob.glob(os.path.join('papers_2026', 'import', '*.json')))
ok = True
for f in files:
    p = json.load(open(f, encoding='utf-8'))
    errors = []
    ids = []
    total = 0
    for sec in p['sections']:
        if sec['name'] not in ('Physics', 'Chemistry', 'Mathematics'):
            errors.append('bad section name %r' % sec['name'])
        if len(sec['mcq']) != 20:
            errors.append('%s: %d MCQ (want 20)' % (sec['name'], len(sec['mcq'])))
        if len(sec['num']) != 5:
            errors.append('%s: %d numerical (want 5)' % (sec['name'], len(sec['num'])))
        for q in sec['mcq'] + sec['num']:
            total += 1
            m = re.search(r'Q(\d+) \(id (\d+)\)', q[0])
            if not m:
                errors.append('placeholder missing Q marker: %r' % q[0][:40])
            else:
                ids.append(int(m.group(2)))
    if len(ids) != len(set(ids)):
        errors.append('duplicate question ids')
    if total != 75:
        errors.append('total %d (want 75)' % total)
    status = 'OK  ' if not errors else 'FAIL'
    if errors:
        ok = False
    print('%s %s  %d q / %d unique ids  %s' % (status, os.path.basename(f), total, len(set(ids)), '; '.join(errors)))
sys.exit(0 if ok else 1)
