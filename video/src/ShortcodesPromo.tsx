import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

const SUGGESTIONS = [
  { shortcut: ':fire:', value: '🔥', label: 'Emoji' },
  { shortcut: ':date:', value: '2026-05-06', label: 'Variable' },
  { shortcut: ':gm:', value: 'Good morning', label: 'Text alias' },
];

const pageStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  background: '#f5f5f4',
  color: '#111827',
  fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
};

const inputShellStyle: React.CSSProperties = {
  position: 'relative',
  width: 520,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: 20,
  border: '1px solid #d1d5db',
  background: '#ffffff',
  padding: '22px 24px',
  fontSize: 30,
  lineHeight: 1.2,
  fontWeight: 600,
  letterSpacing: '-0.04em',
  color: '#111827',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 0 0 1px rgba(255,255,255,0.6)',
};

function Cursor() {
  return <span style={{ opacity: 0.9 }}>|</span>;
}

export const ShortcodesPromo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = spring({ frame, fps, config: { damping: 18, stiffness: 110 } });
  const typingProgress = interpolate(frame, [16, 54], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const dropdownProgress = interpolate(frame, [40, 78], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const selectProgress = interpolate(frame, [78, 122], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const typedText = typingProgress < 0.3 ? '' : typingProgress < 0.65 ? ':' : ':f';
  const selected = selectProgress > 0.5 ? SUGGESTIONS[0] : null;
  const inputValue = selected ? selected.value : typedText;
  const cursorVisible = frame % 24 < 12 && !selected;
  const inputScale = interpolate(selectProgress, [0, 1], [1, 1.015]);
  const noteText = selected ? 'Shortcut expanded.' : dropdownProgress > 0.15 ? 'Select a suggestion.' : 'Type : to open suggestions.';
  const dropdownVisible = !selected ? dropdownProgress : 0;

  return (
    <div style={pageStyle}>
      <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
        <div style={{ width: 1000, opacity: fadeIn, transform: `translateY(${(1 - fadeIn) * 12}px)` }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#6b7280' }}>
              Shortcodes
            </div>
            <div style={{ marginTop: 12, fontSize: 54, fontWeight: 800, letterSpacing: '-0.06em', lineHeight: 1.02 }}>
              Type a shortcut. See it expand.
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '28px 0 8px' }}>
              <div style={inputShellStyle}>
                <div style={{ ...inputStyle, transform: `scale(${inputScale})`, transition: 'transform 120ms linear' }}>
                  {inputValue}
                  {cursorVisible ? <Cursor /> : null}
                </div>

                {dropdownVisible > 0 ? (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 86,
                      width: '100%',
                      borderRadius: 18,
                      background: '#ffffff',
                      border: '1px solid #d1d5db',
                      boxShadow: '0 18px 36px rgba(15, 23, 42, 0.10)',
                      overflow: 'hidden',
                      opacity: dropdownVisible,
                      transform: `translateY(${(1 - dropdownVisible) * 10}px) scale(${0.985 + dropdownVisible * 0.015})`,
                    }}
                  >
                    <div style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.14em', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb' }}>
                      Suggestions
                    </div>
                    {SUGGESTIONS.map((item, index) => {
                      const active = index === 0;
                      return (
                        <div
                          key={item.shortcut}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 16,
                            padding: '13px 16px',
                            background: active ? '#f9fafb' : '#ffffff',
                            borderLeft: active ? '4px solid #111827' : '4px solid transparent',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 17, fontWeight: 700 }}>{item.shortcut}</div>
                            <div style={{ marginTop: 4, fontSize: 13, color: '#64748b' }}>{item.label}</div>
                          </div>
                          <div style={{ fontSize: 18, color: '#0f172a', fontWeight: 600 }}>{item.value}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>

            <div style={{ marginTop: 18, textAlign: 'center', fontSize: 17, color: '#4b5563' }}>{noteText}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
