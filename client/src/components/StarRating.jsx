import { useState } from 'react';
import { Star } from 'lucide-react';

const LABELS = ['', 'Slab', 'Acceptabil', 'Bun', 'Foarte bun', 'Excelent'];

/**
 * Input de rating cu stele: click, hover și navigare cu tastatura (ArrowLeft/Right).
 * Folosește radiogroup pentru cititoare de ecran.
 */
export default function StarRating({ value = 5, onChange, label = 'Rating' }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  const set = (next) => onChange(Math.min(5, Math.max(1, next)));

  return (
    <div className="star-input" role="radiogroup" aria-label={label} onMouseLeave={() => setHover(0)}>
      <div className="star-input__stars">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} ${n === 1 ? 'stea' : 'stele'} — ${LABELS[n]}`}
            className={`star-input__btn${n <= shown ? ' is-on' : ''}`}
            onMouseEnter={() => setHover(n)}
            onFocus={() => setHover(n)}
            onBlur={() => setHover(0)}
            onClick={() => set(n)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); set(value + 1); }
              if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); set(value - 1); }
            }}
          >
            <Star size={22} fill={n <= shown ? 'currentColor' : 'none'} strokeWidth={1.6} />
          </button>
        ))}
      </div>
      <span className="star-input__label small">{LABELS[shown]}{value ? ` · ${value}/5` : ''}</span>
    </div>
  );
}
