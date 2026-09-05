import os, re, json
fields = ['is_correct','status','response','answer','answer_id','selected_option','correct_option','is_attempted','attempted','time_spent_seconds','correct','incorrect']
matches = {}
for root,_,files in os.walk('.'):
    for f in files:
        if any(f.endswith(ext) for ext in ('.js','.jsx','.json')):
            p = os.path.join(root,f)
            try:
                b = open(p,'rb').read()
                s = b.decode('utf-8',errors='replace')
            except Exception as e:
                continue
            for kw in fields:
                if kw in s:
                    matches.setdefault(kw,[]).append(p)
for k in sorted(matches.keys()):
    print(k, len(matches[k]))
    for p in matches[k][:8]:
        print('  ',p)
    print()
# If there are sample result files under tests or papers, try to load first JSON and print question keys
for d in ('tests','papers_2026','papers_2026/import','papers_2026/import'):
    if os.path.isdir(d):
        for f in os.listdir(d):
            if f.endswith('.json'):
                p=os.path.join(d,f)
                print('Sample JSON',p)
                try:
                    j=json.load(open(p,'r',encoding='utf-8'))
                    q0 = j.get('questions') or j.get('questions_list') or j
                    if isinstance(q0, list) and len(q0)>0:
                        print('Question keys:', list(q0[0].keys())[:40])
                except Exception as e:
                    print('Could not parse',p,e)
                break
            
