import { eventTheme } from '../../lib/event-theme';
import logoUrl from '../../assets/clt-logo-white.svg';

// Dark, Luma-style sign-in hero (design_handoff_user_events screen 0). SSO entry — the
// button calls the same Google sign-in the light screen used.

function Deco({ themeColor, glyph, title, meta, style }: { themeColor: string; glyph: string; title: string; meta: string; style: React.CSSProperties }) {
  const th = eventTheme(themeColor, glyph);
  return (
    <div className="c7d-deco" style={style}>
      <div className="cov" style={{ background: th.coverBg }}>
        <span className="blob" style={{ background: th.glow }} />
        <span className="glyph">{glyph}</span>
      </div>
      <div className="t">{title}</div>
      <div className="m">{meta}</div>
    </div>
  );
}

export function DarkSignIn({ onSignIn, onDemo }: { onSignIn?: () => void; onDemo?: () => void }) {
  const handleAction = onDemo || onSignIn;
  return (
    <div className="c7d" style={{ position: 'relative' }}>
      <a
        href="../../index.html"
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          zIndex: 50,
          color: '#e5e5e5',
          fontSize: 13,
          fontWeight: 500,
          textDecoration: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          background: 'rgba(255,255,255,0.1)',
          padding: '6px 14px',
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.15)'
        }}
      >
        ← Portfolio
      </a>
      <div className="c7d-signin">
        <div className="l">
          <img className="logo" src={logoUrl} alt="CLT" />
          <h1>Internal events,<br />one place.</h1>
          <p className="lead">Browse programs, assessments and workshops across CyberLogitec — register, pick your time, and add it to your calendar in a tap.</p>
          <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
            <button type="button" className="c7d-btn" onClick={handleAction}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/></svg>
              Explore Platform
            </button>
          </div>
          <p className="subline">Click Explore Platform to preview and manage internal events, workshops, and L&D programs.</p>
        </div>
        <div className="r">
          {/* Decorative sample cards (pre-auth, no real data). Meta stays evergreen —
              no hardcoded dates that read as stale once a specific day passes. */}
          <Deco themeColor="amber" glyph="A+" title="English Proficiency Assessment" meta="By Team L&D"
            style={{ top: 30, right: 60, transform: 'rotate(-4deg)' }} />
          <Deco themeColor="violet" glyph="Q3" title="Q3 Leadership Workshop" meta="By Team L&D"
            style={{ top: 150, right: 0, transform: 'rotate(5deg)' }} />
        </div>
      </div>
    </div>
  );
}
