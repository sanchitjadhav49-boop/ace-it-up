  // ============================= START SCREEN ==============================

  if (phase === 'start') {
    const initial = user && user.full_name ? user.full_name.charAt(0).toUpperCase() : 'A';

    return (
      <div className="hp-root">
        <aside className="hp-side">
          <div className="hp-brand">
            <span className="hp-brand__logo">A</span>
            <div>
              <h1 className="hp-brand__name">Ace It Up</h1>
              <p className="hp-brand__tag">Practice {'\u00B7'} Improve {'\u00B7'} Achieve</p>
            </div>
          </div>

          <nav className="hp-nav">
            <button className="hp-nav__item hp-nav__item--active" type="button">
              <HpIcon name="home" /> Home
            </button>
            <button className="hp-nav__item" type="button" onClick={openHistory}>
              <HpIcon name="clock" /> My History
            </button>
            <button className="hp-nav__item" type="button" onClick={openNotes}>
              <HpIcon name="note" /> Notes
            </button>
          </nav>

          <div className="hp-promo">
            <span className="hp-promo__icon"><HpIcon name="target" size={22} /></span>
            <p>
              Small steps<br />
              every day lead to<br />
              <b>big results!</b>
            </p>
            <span className="hp-promo__dot hp-promo__dot--a" />
            <span className="hp-promo__dot hp-promo__dot--b" />
            <span className="hp-promo__dot hp-promo__dot--c" />
          </div>

          <button className="hp-logout" type="button" onClick={handleLogout}>
            <HpIcon name="logout" /> Logout
          </button>
        </aside>

        <div className="hp-main">
          <header className="hp-topbar">
            <div className="hp-search">
              <HpIcon name="search" size={18} />
              <input
                type="text"
                placeholder="Search tests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  className="hp-search__clear"
                  type="button"
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                >
                  {'\u00D7'}
                </button>
              )}
            </div>

            <div className="hp-topbar__spacer" />

            <button className="hp-theme" type="button" onClick={() => setDarkMode((v) => !v)}>
              <HpIcon name={darkMode ? 'sun' : 'moon'} size={17} />
              <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </button>

            <div className="hp-avatar-wrap">
              <button className="hp-avatar" type="button" onClick={() => setShowProfileMenu((v) => !v)}>
                {initial}
              </button>
              {showProfileMenu && (
                <div className="hp-menu">
                  <div className="hp-menu__name">{user && user.full_name}</div>
                  <div className="hp-menu__email">{user && user.email}</div>
                  <button type="button" onClick={() => { setShowProfileMenu(false); openHistory(); }}>My History</button>
                  <button type="button" onClick={openNotes}>Notes</button>
                  <button type="button" onClick={() => setDarkMode((v) => !v)}>
                    {darkMode ? 'Light Mode' : 'Dark Mode'}
                  </button>
                  <button type="button" onClick={handleLogout}>Logout</button>
                </div>
              )}
            </div>
          </header>

          <main className="hp-content">
            <section className="hp-hero">
              <div>
                <span className="hp-hero__pill"><HpIcon name="star" size={13} /> Keep Going!</span>
                <h2>
                  Practice Today, <em>Perform Tomorrow</em>
                  <svg className="hp-hero__under" viewBox="0 0 190 12" fill="none" aria-hidden="true">
                    <path d="M3 8c31-6 62 3 94-2 30-5 60 5 90-1" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
                  </svg>
                </h2>
                <p>Let{'\u2019'}s go beyond rote learning.</p>
              </div>

              <div className="hp-hero__art">
                <span className="hp-hero__note">
                  Better<br />Scores<br />Ahead
                  <svg width="46" height="42" viewBox="0 0 46 42" fill="none" aria-hidden="true">
                    <path d="M6 38c8-4 14-12 16-24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M15 16l7-4 1 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>

                <svg className="hp-hero__books" width="196" height="122" viewBox="0 0 196 122" fill="none" aria-hidden="true">
                  <g strokeLinecap="round" strokeLinejoin="round">
                    <rect x="14" y="84" width="104" height="22" rx="5" fill="#f7c948" stroke="#e2a300" strokeWidth="2.2" />
                    <rect x="24" y="62" width="94" height="22" rx="5" fill="#4a86f7" stroke="#1f5ed6" strokeWidth="2.2" />
                    <rect x="8" y="40" width="92" height="22" rx="5" fill="#ffffff" stroke="#8fb4ee" strokeWidth="2.2" />
                    <path d="M20 51h36" stroke="#a8c6f2" strokeWidth="2.2" />
                    <path d="M138 106h46l-7 14h-32z" fill="#7cc7d9" stroke="#3f9cb4" strokeWidth="2.2" />
                    <path d="M161 106V74" stroke="#2f9e5f" strokeWidth="2.4" />
                    <path d="M161 82c-15-2-24-12-24-25 13 0 22 9 24 25z" fill="#63c88a" stroke="#2f9e5f" strokeWidth="2.2" />
                    <path d="M161 84c13-6 19-17 17-30-13 2-19 13-17 30z" fill="#4cbb77" stroke="#2f9e5f" strokeWidth="2.2" />
                    <path d="M162 58V34" stroke="#2f9e5f" strokeWidth="2.2" />
                    <path d="M162 40c-8-2-12-7-13-14 7 1 12 6 13 14z" fill="#63c88a" stroke="#2f9e5f" strokeWidth="2" />
                  </g>
                </svg>
              </div>
            </section>

            <div className="hp-tests-head">
              <h2 className="hp-tests-title">Available Tests</h2>
              <span className="hp-count">
                {filteredTests.length} {filteredTests.length === 1 ? 'Test' : 'Tests'}
              </span>

              <div className="hp-sort">
                <button className="hp-sort__btn" type="button" onClick={() => setHpSortOpen((v) => !v)}>
                  <HpIcon name="filter" size={16} /> Sort / Filter
                </button>
                {hpSortOpen && (
                  <div className="hp-sort__menu">
                    <div className="hp-sort__label">Difficulty</div>
                    <button className="hp-sort__opt" type="button" onClick={() => { setHpLevel('all'); setHpSortOpen(false); }}>
                      All levels {hpLevel === 'all' && <HpIcon name="check" size={15} />}
                    </button>
                    <button className="hp-sort__opt" type="button" onClick={() => { setHpLevel('easy'); setHpSortOpen(false); }}>
                      Easy {hpLevel === 'easy' && <HpIcon name="check" size={15} />}
                    </button>
                    <button className="hp-sort__opt" type="button" onClick={() => { setHpLevel('moderate'); setHpSortOpen(false); }}>
                      Moderate {hpLevel === 'moderate' && <HpIcon name="check" size={15} />}
                    </button>
                    <button className="hp-sort__opt" type="button" onClick={() => { setHpLevel('difficult'); setHpSortOpen(false); }}>
                      Difficult {hpLevel === 'difficult' && <HpIcon name="check" size={15} />}
                    </button>
                    <div className="hp-sort__sep" />
                    <div className="hp-sort__label">Sort by</div>
                    <button className="hp-sort__opt" type="button" onClick={() => { setHpSort('default'); setHpSortOpen(false); }}>
                      Default order {hpSort === 'default' && <HpIcon name="check" size={15} />}
                    </button>
                    <button className="hp-sort__opt" type="button" onClick={() => { setHpSort('easy'); setHpSortOpen(false); }}>
                      Easy to difficult {hpSort === 'easy' && <HpIcon name="check" size={15} />}
                    </button>
                    <button className="hp-sort__opt" type="button" onClick={() => { setHpSort('hard'); setHpSortOpen(false); }}>
                      Difficult to easy {hpSort === 'hard' && <HpIcon name="check" size={15} />}
                    </button>
                    <button className="hp-sort__opt" type="button" onClick={() => { setHpSort('az'); setHpSortOpen(false); }}>
                      Name (A - Z) {hpSort === 'az' && <HpIcon name="check" size={15} />}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="hp-grid">
              {tests.length === 0 && (
                <p className="hp-empty">No published tests available.</p>
              )}

              {tests.length > 0 && filteredTests.length === 0 && (
                <p className="hp-empty">
                  No tests match your search or filter right now.
                </p>
              )}

              {filteredTests.map((t, index) => (
                <TestCard
                  key={t.id}
                  test={t}
                  index={index}
                  userId={userId}
                  onStart={(resumeId) => {
                    setPendingTest(t);
                    setPendingResumeId(resumeId);
                    setPhase('instructions');
                  }}
                />
              ))}
            </div>

            <section className="hp-suggest">
              <div className="hp-suggest__intro">
                <span className="hp-suggest__bulb"><HpIcon name="bulb" size={24} /></span>
                <div>
                  <h3>Suggestions for You</h3>
                  <p>Based on your performance and pattern, here are a few helpful tips:</p>
                </div>
              </div>

              <div className="hp-suggest__cards">
                <button className="hp-suggest__card" type="button" onClick={openHistory}>
                  <span className="hp-suggest__ic hp-suggest__ic--violet"><HpIcon name="chart" size={20} /></span>
                  <span className="hp-suggest__txt">
                    <strong>Analyse your past tests</strong>
                    <span>Find your weak topics</span>
                  </span>
                  <HpIcon name="chevron" size={17} />
                </button>

                <button className="hp-suggest__card" type="button" onClick={openHistory}>
                  <span className="hp-suggest__ic hp-suggest__ic--green"><HpIcon name="focus" size={20} /></span>
                  <span className="hp-suggest__txt">
                    <strong>Focus on time management</strong>
                    <span>Try 1-2 more moderate mocks</span>
                  </span>
                  <HpIcon name="chevron" size={17} />
                </button>

                <button className="hp-suggest__card" type="button" onClick={openNotes}>
                  <span className="hp-suggest__ic hp-suggest__ic--blue"><HpIcon name="note" size={20} /></span>
                  <span className="hp-suggest__txt">
                    <strong>Keep short notes</strong>
                    <span>Revise key formulas {'&'} concepts</span>
                  </span>
                  <HpIcon name="chevron" size={17} />
                </button>
              </div>
            </section>
          </main>
        </div>
      </div>
    );
  }

