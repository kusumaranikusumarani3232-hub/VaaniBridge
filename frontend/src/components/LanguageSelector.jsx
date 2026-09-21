const LANGUAGES = [
  { code: "en", label: "English", flag: "🇺🇸", voice: "ivy" },
  { code: "hi", label: "हिंदी", flag: "🇮🇳", voice: "james" },
];

export function LanguageSelector({ selected, onChange, disabled }) {
  return (
    <div className="language-selector" role="group" aria-label="Select language">
      <span className="language-label">Language</span>
      <div className="language-options">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            id={`lang-${lang.code}`}
            className={`language-btn ${selected === lang.code ? "active" : ""}`}
            onClick={() => onChange(lang)}
            disabled={disabled}
            aria-pressed={selected === lang.code}
            title={lang.label}
          >
            <span className="lang-flag">{lang.flag}</span>
            <span className="lang-name">{lang.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export const DEFAULT_LANGUAGE = LANGUAGES[0];
export { LANGUAGES };
