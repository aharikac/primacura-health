import { Loader2, Search } from 'lucide-react';

export function SearchBox({
  value,
  onChange,
  home = false,
  onSearch,
  loading,
}: {
  value: string;
  onChange: (value: string) => void;
  home?: boolean;
  onSearch?: () => void;
  loading?: boolean;
}) {
  if (home) {
    return (
      <form
        className="search-box search-box-home"
        onSubmit={(event) => {
          event.preventDefault();
          onSearch?.();
        }}
      >
        <div style={{ position: 'relative', flex: 1, display: 'flex' }}>
        <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={'Type the situation in detail...'}
            aria-label={'Type the situation in detail...'}
            rows={2}
            disabled={loading}
            maxLength={500}
            style={{ width: '100%', paddingBottom: '20px', resize: 'none', overflowY: 'auto' }}
          />

          <span style={{ position: 'absolute', bottom: '8px', right: '12px', fontSize: '0.75rem', color: '#9ca3af', pointerEvents: 'none' }}>
            {value.length}/500
          </span>
        </div>

        <button className="search-submit" type="submit" aria-label="Get help" disabled={loading}>
          {loading ? (
            <Loader2 size={30} strokeWidth={2.8} className="spin" aria-hidden="true" />
          ) : (
            <Search size={30} strokeWidth={2.8} aria-hidden="true" />
          )}
        </button>
      </form>
    );
  }

  return (
    <label className="search-box">
      <Search size={24} strokeWidth={2.8} aria-hidden="true" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={'Search conditions...'}
        aria-label={'Search conditions'}
      />
    </label>
  );
}
