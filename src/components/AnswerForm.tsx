import { useEffect, useRef, useState } from "react";
import { PORTFOLIOS } from "../game/portfolios";
import type { AnswerField, Round } from "../game/reducer";

interface Props {
  round: Round;
  canHint: boolean;
  hintsUsed: number;
  maxHints: number;
  onSubmit: (field: AnswerField, value: string) => void;
  onHint: () => void;
  onReveal: () => void;
  onType: () => void;
}

export function AnswerForm({
  round,
  canHint,
  hintsUsed,
  maxHints,
  onSubmit,
  onHint,
  onReveal,
  onType,
}: Props) {
  const [name, setName] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const nameInput = useRef<HTMLInputElement>(null);
  const portfolioInput = useRef<HTMLInputElement>(null);

  // Vider les champs se fait par remontage : App passe `key={minister.id}`, ce qui
  // recrée le composant à chaque nouvelle personne. Réinitialiser l'état depuis un
  // effet déclencherait un rendu en cascade pour le même résultat.
  //
  // Le focus, lui, est un effet légitime : c'est une action sur le DOM.
  useEffect(() => {
    nameInput.current?.focus();
  }, []);

  const submitAll = () => {
    if (!round.nameFound && name.trim()) onSubmit("name", name);
    if (!round.portfolioFound && portfolio.trim()) onSubmit("portfolio", portfolio);
  };

  const rejectedField = round.lastRejected?.field ?? null;

  return (
    <form
      className="answer-form"
      onSubmit={(event) => {
        event.preventDefault();
        submitAll();
      }}
    >
      <div className={`field ${rejectedField === "name" ? "shake" : ""}`}>
        <label htmlFor="answer-name">Qui est-ce&nbsp;?</label>
        {round.nameFound ? (
          <p className="field__found">
            <span aria-hidden="true">✓</span>
            {round.minister.firstName} {round.minister.lastName}
          </p>
        ) : (
          <>
            <input
              id="answer-name"
              ref={nameInput}
              value={name}
              autoComplete="off"
              autoCapitalize="words"
              spellCheck={false}
              aria-invalid={rejectedField === "name"}
              aria-describedby={
                rejectedField === "name" ? "answer-name-error" : undefined
              }
              onChange={(event) => {
                setName(event.target.value);
                onType();
              }}
            />
            {rejectedField === "name" && (
              <p className="field__error" id="answer-name-error" role="status">
                Pas tout à fait… essayez encore.
              </p>
            )}
          </>
        )}
      </div>

      <div className={`field ${rejectedField === "portfolio" ? "shake" : ""}`}>
        <label htmlFor="answer-portfolio">
          Quel ministère cette personne a-t-elle occupé&nbsp;?
        </label>
        {round.portfolioFound ? (
          <p className="field__found">
            <span aria-hidden="true">✓</span>Ministère trouvé
          </p>
        ) : (
          <>
            <input
              id="answer-portfolio"
              ref={portfolioInput}
              value={portfolio}
              // Les suggestions aident sans contraindre : la validation part
              // toujours du texte saisi (CLAUDE.md §8.3).
              list="portfolio-suggestions"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={rejectedField === "portfolio"}
              aria-describedby={
                rejectedField === "portfolio"
                  ? "answer-portfolio-error"
                  : "portfolio-help"
              }
              onChange={(event) => {
                setPortfolio(event.target.value);
                onType();
              }}
            />
            <datalist id="portfolio-suggestions">
              {PORTFOLIOS.map((p) => (
                <option key={p.id} value={p.canonicalLabel} />
              ))}
            </datalist>
            {rejectedField === "portfolio" ? (
              <p className="field__error" id="answer-portfolio-error" role="status">
                Pas tout à fait… essayez encore.
              </p>
            ) : (
              <p className="muted" id="portfolio-help">
                Les formes courtes et les sigles sont acceptés.
              </p>
            )}
          </>
        )}
      </div>

      <div className="actions">
        <button type="submit" className="primary">
          Valider
        </button>
        {canHint ? (
          <button type="button" onClick={onHint}>
            Indice ({hintsUsed}/{maxHints})
          </button>
        ) : (
          <button type="button" onClick={onReveal}>
            Donner la réponse
          </button>
        )}
        <button type="button" onClick={onReveal}>
          Passer
        </button>
      </div>
    </form>
  );
}
