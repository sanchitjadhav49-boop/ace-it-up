p='frontend/src/DifficultyAnalysis.jsx'
with open(p,'rb') as f:
    b=f.read()
s=b.decode('utf-8',errors='replace')
print('exists', True if b else False)
print('size', len(b))
for kw in ['diffStats','attempted','unattempted','is_correct','selected_option_id','numerical_answer']:
    print(kw, kw in s)
# print the metrics cards snippet
start = s.find('/* New: Attempt / correctness summary per difficulty */')
if start!=-1:
    print('\nSNIPPET:\n', s[start:start+600])
else:
    # fallback: find first occurrence of 'attempted/' or 'attempted' lines
    idx = s.find('attempted/')
    if idx==-1:
        idx = s.find('attempted')
    if idx!=-1:
        print('\nFALLBACK SNIPPET:\n', s[idx-120:idx+300])
    else:
        print('\nCould not find snippet')
