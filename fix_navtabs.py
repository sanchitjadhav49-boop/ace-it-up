# Modify App.jsx to move the Difficulty Analysis button inside navTabs
import io,sys
p='frontend/src/App.jsx'
s=open(p,'rb').read()
t=s.decode('utf-8',errors='replace')
nav_start = t.find('const navTabs = (')
if nav_start == -1:
    print('navTabs not found'); sys.exit(1)
# find the closing </div> that ends the navTabs div; assume first </div> after nav_start
div_close = t.find('</div>', nav_start)
if div_close == -1:
    print('navTabs </div> not found'); sys.exit(1)
# prepare button HTML (use same indentation as other buttons)
button_block = '\r\n      <button\r\n        role="tab"\r\n        className={`ta-nav__tab${view === \'difficulty\' ? \' ta-nav__tab--active\' : \'\'}`}\r\n        onClick={() => { setShowSummary(false); setView(\'difficulty\'); }}\r\n      >\r\n        Difficulty Analysis\r\n      </button>\r\n'
# check if button already inside navTabs
if 'Difficulty Analysis' in t[nav_start:div_close+7]:
    print('Difficulty button already inside navTabs')
else:
    # insert before div_close
    insert_at = div_close
    t = t[:insert_at] + button_block + t[insert_at:]
    print('Inserted button into navTabs')
# remove stray button elsewhere: find 'Difficulty Analysis' occurrences beyond nav_start
pos = t.find('Difficulty Analysis')
while pos != -1:
    if pos > nav_start and pos < insert_at:
        # this is inside navTabs we just inserted; skip
        pass
    else:
        # find the start of the <button before pos
        bs = t.rfind('<button', 0, pos)
        be = t.find('</button>', pos)
        if bs != -1 and be != -1:
            # remove from bs to be+len
            t = t[:bs] + t[be+9:]
            print('Removed stray button at', bs)
        else:
            print('Could not remove stray occurrence at', pos)
    pos = t.find('Difficulty Analysis', pos+1)
# write back
open(p,'wb').write(t.replace('\n','\r\n').encode('utf-8'))
print('done')
