interface Props {
  roundIndex: number;
  totalRounds: number;
  score: number;
  streak: number;
  levelLabel: string;
}

export function ScoreBar({ roundIndex, totalRounds, score, streak, levelLabel }: Props) {
  return (
    <div className="score-bar">
      {/* Les deux blocs sont séparés visuellement par le flex, mais un lecteur
          d'écran lit le textContent d'affilée : sans libellés explicites,
          « Manche 1 / 10 » suivi de « 0 pts » s'entend « Manche 1 sur 100 pts ». */}
      <span>
        Manche {roundIndex + 1} sur {totalRounds}
        <span className="score-bar__level"> · {levelLabel}</span>
        <span className="visually-hidden">.</span>
      </span>
      <span>
        {streak > 1 && <span className="score-bar__streak">série&nbsp;×{streak} — </span>}
        <span className="score-bar__score">{score}</span>
        <span className="muted">&nbsp;points</span>
      </span>
    </div>
  );
}
