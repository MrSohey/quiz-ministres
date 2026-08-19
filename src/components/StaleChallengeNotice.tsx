interface Props {
  onRestart: () => void;
}

/**
 * Avertissement affiché quand la base a changé depuis la création du lien ouvert.
 * Voir CLAUDE.md §7.7.
 *
 * Une graine fige le tirage, pas les données : si une fiche est entrée ou sortie du
 * vivier, la partie n'est plus celle qu'a jouée l'expéditeur. Mieux vaut le dire que
 * laisser croire à une comparaison équitable.
 *
 * Ce bandeau ne signale QUE cette anomalie. Il n'annonce pas « vous jouez un défi » :
 * l'URL portant la graine dès la première manche, un simple rechargement passerait
 * par le même chemin, et le message serait faux une fois sur deux.
 */
export function StaleChallengeNotice({ onRestart }: Props) {
  return (
    <aside className="challenge challenge--stale">
      <p>
        <strong>La base a changé</strong> depuis la création de ce lien : les photos
        tirées peuvent différer de celles de votre adversaire.
      </p>
      <button type="button" onClick={onRestart}>
        Choisir un niveau
      </button>
    </aside>
  );
}
