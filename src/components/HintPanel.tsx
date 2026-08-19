interface Props {
  hints: string[];
}

export function HintPanel({ hints }: Props) {
  if (hints.length === 0) return null;

  return (
    <>
      <h2 className="visually-hidden">Indices obtenus</h2>
      {/* Les indices déjà obtenus restent affichés pendant toute la manche. */}
      <ul className="hints" aria-live="polite">
        {hints.map((hint) => (
          <li key={hint}>
            <span aria-hidden="true">💡</span>
            {hint}
          </li>
        ))}
      </ul>
    </>
  );
}
