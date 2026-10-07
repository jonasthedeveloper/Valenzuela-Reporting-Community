import { useState } from 'react';
import Icon from '../components/Icon';
import AnnouncementPreview from '../components/AnnouncementPreview';
import { APP_NAME, APP_TAGLINE } from '../constants';

/* ---------------------------------------------------------------------------
   AUTH BACKGROUND PHOTO

   To use your own picture, replace this one file:

       src/assets/images/auth-background.jpg

   Keep the same name and folder — nothing in the code needs to change.
   The overlay strength is a single CSS variable in src/styles/globals.css:

       --auth-overlay-opacity: 0.62;

   The photo is rendered as ONE full-screen layer inside .auth-bg, behind the
   entire page — it is never boxed into a panel. If the file is missing or
   fails to load, the page falls back to the blue-to-teal gradient.
--------------------------------------------------------------------------- */
import authBackground from '../assets/images/auth-background.jpg';

const FEATURES = [
  {
    icon: 'map-pin',
    title: 'Report Community Issues',
    text: 'Submit concerns and incidents in your barangay with complete details and supporting photos.',
  },
  {
    icon: 'clock',
    title: 'Track Report Progress',
    text: 'Follow your report from submission and review to resolution and closure.',
  },
  {
    icon: 'megaphone',
    title: 'Stay Updated',
    text: 'View barangay announcements and important community updates in one place.',
  },
];

export default function AuthLayout({ title, subtitle, children, wide = false, footer }) {
  const [imageBroken, setImageBroken] = useState(false);

  return (
    <div className="auth-page">
      {/* Layer 1 — full-screen background photo (always behind everything) */}
      <div className="auth-bg" aria-hidden="true">
        {!imageBroken && (
          <img
            className="auth-photo"
            src={authBackground}
            alt=""
            aria-hidden="true"
            onError={() => setImageBroken(true)}
          />
        )}
      </div>

      {/* Layer 2 — blue-teal gradient, transparent toward the photo side */}
      <div className="auth-overlay" aria-hidden="true" />

      {/* Layer 3 — content */}
      <div className="auth-content">
        {/* Compact brand — shown above the card on mobile only */}
        <div className="auth-brand auth-mobile-brand">
          <span className="brand-mark"><Icon name="map-pin" size={20} /></span>
          <div>
            <div className="auth-brand-name">{APP_NAME}</div>
            <div className="auth-brand-sub">{APP_TAGLINE}</div>
          </div>
        </div>

        <aside className="auth-info">
          <div className="auth-brand">
            <span className="brand-mark"><Icon name="map-pin" size={22} /></span>
            <div>
              <div className="auth-brand-name">Valenzuela Community<br />Reporting System</div>
              <div className="auth-brand-sub">{APP_TAGLINE}</div>
            </div>
          </div>

          <div className="auth-intro">
            <h1 className="auth-headline">Tell the barangay what needs fixing.</h1>
            <p className="auth-copy">
              Report community concerns, stay updated, and follow the progress of
              issues in your barangay.
            </p>

            <div className="auth-features">
              {FEATURES.map((feature) => (
                <div className="auth-feature" key={feature.title}>
                  <span className="auth-feature-icon"><Icon name={feature.icon} size={16} /></span>
                  <div>
                    <div className="auth-feature-title">{feature.title}</div>
                    <p className="auth-feature-text">{feature.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live announcement preview — public feed, carousel + details */}
          <AnnouncementPreview />

          <p className="auth-foot">
            Serving Barangay Ugong and Barangay Gen. T. De Leon, Valenzuela City
          </p>
        </aside>

        <main className={`auth-card${wide ? ' auth-card-wide' : ''}`}>
          <div className="stack-sm" style={{ marginBottom: 'var(--sp-6)' }}>
            <h1 className="auth-title">{title}</h1>
            {subtitle && <p className="auth-subtitle">{subtitle}</p>}
          </div>

          {children}

          {footer && <div style={{ marginTop: 'var(--sp-5)' }}>{footer}</div>}
        </main>
      </div>
    </div>
  );
}
