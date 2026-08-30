$ErrorActionPreference = 'Stop'
$app = 'frontend\src\App.jsx'
$css = 'frontend\src\exam.css'
$utf8 = New-Object System.Text.UTF8Encoding($false)
$mul = [string][char]0xD7  # multiplication sign x

# ---------------- App.jsx ----------------
$content = [System.IO.File]::ReadAllText((Resolve-Path $app), [System.Text.Encoding]::UTF8)
$content = $content.Replace("`r`n", "`n")  # normalize to LF so multi-line anchors match

# 1) searchQuery state next to tests state
$stateAnchor = "const [tests, setTests] = useState([]);"
$stateAdd = "const [tests, setTests] = useState([]);`n  const [searchQuery, setSearchQuery] = useState('');"
if (-not $content.Contains($stateAnchor)) { throw 'state anchor not found' }
$content = $content.Replace($stateAnchor, $stateAdd)

# 2) filteredTests memo before the buildAnswersFromTest comment
$memoAnchor = "// --- build the answers map from server state (questions carry status) ----"
$memo = @"
  // --- filter the catalogue by the topbar search box -----------------------
  const filteredTests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tests;
    return tests.filter((t) =>
      (t.title || '').toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q)
    );
  }, [tests, searchQuery]);

"@
if (-not $content.Contains($memoAnchor)) { throw 'memo anchor not found' }
$content = $content.Replace($memoAnchor, $memo + $memoAnchor)

# 3) enable + bind the search input, add a clear button
$inputAnchor = '<input type="text" placeholder="Search tests..." disabled />'
$inputNew = @"
              <input
                type="text"
                placeholder="Search tests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="topbar__search-clear" onClick={() => setSearchQuery('')} title="Clear search">$mul</button>
              )}
"@
if (-not $content.Contains($inputAnchor)) { throw 'input anchor not found' }
$content = $content.Replace($inputAnchor, $inputNew)

# 4) render the filtered list with a no-match empty state
$listAnchor = @"
              {tests.length === 0 && <p className="muted">No published tests available.</p>}
              {tests.map((t) => (
"@
$listAnchor = $listAnchor.Replace("`r`n", "`n")
$listNew = @"
              {tests.length === 0 && <p className="muted">No published tests available.</p>}
              {tests.length > 0 && filteredTests.length === 0 && (
                <p className="muted">No tests match "{searchQuery}".</p>
              )}
              {filteredTests.map((t) => (
"@
if (-not $content.Contains($listAnchor)) { throw 'list anchor not found' }
$content = $content.Replace($listAnchor, $listNew)

$content = $content.Replace("`n", "`r`n")  # back to Windows line endings
[System.IO.File]::WriteAllText((Resolve-Path $app), $content, $utf8)

# ---------------- exam.css ----------------
$cssContent = [System.IO.File]::ReadAllText((Resolve-Path $css), [System.Text.Encoding]::UTF8)
$cssContent = $cssContent.Replace("`r`n", "`n")

$cssAnchor = ".topbar__search {`n  flex: 1;`n  max-width: 460px;`n}"
$cssNew = @"
.topbar__search {
  flex: 1;
  max-width: 460px;
  position: relative;
}

.topbar__search-clear {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: none;
  color: #6b7280;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 50%;
}
.topbar__search-clear:hover { color: #111827; }
body.dark .topbar__search-clear { color: #9ca3af; }
body.dark .topbar__search-clear:hover { color: #f3f4f6; }
"@
if (-not $cssContent.Contains($cssAnchor)) { throw 'css anchor not found' }
$cssContent = $cssContent.Replace($cssAnchor, $cssNew)

$cssInputAnchor = "padding: 9px 16px;"
if (-not $cssContent.Contains($cssInputAnchor)) { throw 'css input anchor not found' }
$cssContent = $cssContent.Replace($cssInputAnchor, "padding: 9px 32px 9px 16px;")

$cssContent = $cssContent.Replace("`n", "`r`n")
[System.IO.File]::WriteAllText((Resolve-Path $css), $cssContent, $utf8)

Write-Host 'Search patch applied OK'
