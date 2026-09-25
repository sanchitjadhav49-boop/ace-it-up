// ---------------------------------------------------------------------------
// NOTE EDITOR - write (or update) the learning note for one test, with
// one-click prompt chips that seed the usual sections of a good note.
// ---------------------------------------------------------------------------

const NTS_PROMPTS = [
  { label: 'Mistakes I made', head: 'Mistakes I made', icon: 'target' },
  { label: 'Concepts to revise', head: 'Concepts to revise', icon: 'brain' },
  { label: 'What I learnt', head: 'What I learnt', icon: 'bulb' },
  { label: 'Time management', head: 'Time management', icon: 'clock' },
];

function ntsEscapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function NoteEditor({ note, test, onSave, onCancel, saving }) {
  const [content, setContent] = useState(
    note && typeof note.content === 'string' ? note.content : ''
  );
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const areaRef = useRef(null);
  const flashTimer = useRef(null);

  const hasText = content.trim().length > 0;
  const words = ntsWords(content);

  useEffect(() => {
    return () => {
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
    };
  }, []);

  // a prompt is "done" once its heading is already in the note
  function promptDone(head) {
    return new RegExp('(^|\\n)\\s*' + ntsEscapeRegExp(head) + '\\s*:', 'i').test(content);
  }

  function addPrompt(prompt) {
    if (promptDone(prompt.head)) {
      setFlash('"' + prompt.label + '" is already in this note');
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
      flashTimer.current = window.setTimeout(() => setFlash(''), 2200);
      const node = areaRef.current;
      if (node) node.focus();
      return;
    }

    const trimmed = content.replace(/\s+$/, '');
    setContent((trimmed ? trimmed + '\n\n' : '') + prompt.head + ':\n');
    setFlash('Added "' + prompt.label + '"');
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(''), 2200);

    window.setTimeout(() => {
      const node = areaRef.current;
      if (!node) return;
      node.focus();
      const end = node.value.length;
      node.setSelectionRange(end, end);
    }, 0);
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    try {
      await onSave(content);
    } catch (err) {
      setError(err.message || 'Could not save the note');
    }
  }

  return (
    <div className="nts-root">
      <div className="nts-wrap">
        <header className="nts-head">
          <button className="nts-back" type="button" onClick={onCancel}>
            <NtsIcon name="back" size={17} /> Back
          </button>
          <div className="nts-head__txt">
            <h1>{hasText ? 'Edit Note' : 'New Note'}</h1>
            <p>Write down your mistakes, track your learning and build a stronger you!</p>
          </div>
          <div className="nts-head__art">
            <NtsBulbArt />
            <span className="nts-head__slogan">
              Small notes.<br />
              <b>Big progress!</b>
            </span>
          </div>
        </header>

        <section className="nts-editor">
          <div className="nts-editor__test">
            <span className="nts-editor__badge"><NtsIcon name="doc" size={20} /></span>
            <div className="nts-editor__testinfo">
              <strong>{test ? test.title : 'Unknown Test'}</strong>
              {test && test.description
                ? <p>{test.description}</p>
                : <p>Keep this note short and specific - you will read it again before the next test.</p>}
            </div>
          </div>

          <form onSubmit={handleSave} className="nts-editor__form">
            <p className="nts-editor__prompt">
              Mistakes I made, what I learnt, and what I must revise before the next test:
            </p>

            <div className="nts-chips">
              <span className="nts-chips__label">Quick start:</span>
              {NTS_PROMPTS.map((p) => {
                const done = promptDone(p.head);
                return (
                  <button
                    key={p.head}
                    type="button"
                    className={`nts-chip${done ? ' nts-chip--done' : ''}`}
                    onClick={() => addPrompt(p)}
                    title={done ? `"${p.label}" is already in this note` : `Add a "${p.label}" section`}
                  >
                    <NtsIcon name={done ? 'check' : p.icon} size={15} /> {p.label}
                  </button>
                );
              })}
              <span className="nts-chips__flash">{flash}</span>
            </div>

            <textarea
              ref={areaRef}
              className="nts-editor__area"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={'Q12 Physics - I rushed the rotation formula.\nLearnt: always write the torque balance first.\nRevise: moment of inertia of standard bodies.'}
              rows={18}
              spellCheck={true}
            />

            {error ? <p className="nts-editor__error">{error}</p> : null}

            <div className="nts-editor__foot">
              <span className="nts-editor__count">
                {words} {words === 1 ? 'word' : 'words'} {'\u00B7'} {content.length} characters
              </span>
              <div className="nts-editor__actions">
                <button type="button" className="nts-btn nts-btn--ghost" onClick={onCancel}>Cancel</button>
                <button
                  type="submit"
                  className="nts-btn nts-btn--primary"
                  disabled={saving || !hasText}
                  title={hasText ? 'Save this note' : 'Write something before saving'}
                >
                  {saving ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </div>
          </form>
        </section>

        <div className="nts-tip">
          <span className="nts-tip__icon"><NtsIcon name="bulb" size={22} /></span>
          <span className="nts-tip__label">Pro Tip:</span>
          <span className="nts-tip__div" />
          <p>Include what you got wrong, why it happened, and how you{'\u2019'}ll avoid it next time.</p>
        </div>
      </div>
    </div>
  );
}
