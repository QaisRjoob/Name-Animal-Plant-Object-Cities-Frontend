import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CATEGORIES } from "../constants/game";
import { historyApi } from "../services/apiClient";
import { fromApiAnswers } from "../utils/backendAdapters";
import { useAuthStore } from "../store/authStore";
import { useGameStore } from "../store/gameStore";
import { useTranslation } from "../i18n";
import { TopBar } from "../components/TopBar";
import { Scoreboard } from "../components/Scoreboard";

const PAGE_SIZE = 5;

export function ResultsPage() {
  const token = useAuthStore((state) => state.token);
  const authUser = useAuthStore((state) => state.user);
  const players = useGameStore((state) => state.room.players);
  const scoresByPlayer = useGameStore((state) => state.scoresByPlayer);
  const roundResults = useGameStore((state) => state.roundResults);
  const currentUserId = useGameStore((state) => state.currentUserId);
  const roomId = useGameStore((state) => state.room.id);
  const setRoundResults = useGameStore((state) => state.setRoundResults);
  const { t } = useTranslation();

  // Lazy "load more" pagination — frontend slices, backend can replace with cursor.
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visibleRounds = (roundResults ?? []).slice(0, visibleCount);
  const hasMore = (roundResults?.length ?? 0) > visibleCount;
  const [historyGames, setHistoryGames] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPages, setHistoryPages] = useState(1);

  useEffect(() => {
    if (!token || !authUser?.id) {
      return;
    }
    let cancelled = false;
    const loadInitialHistory = async () => {
      try {
        const payload = await historyApi.listByUser({
          userId: authUser.id,
          token,
          page: 1,
          limit: 10
        });
        if (cancelled) {
          return;
        }
        setHistoryGames(payload?.games ?? []);
        setHistoryPage(payload?.pagination?.page ?? 1);
        setHistoryPages(payload?.pagination?.pages ?? 1);
      } catch {
        if (!cancelled) {
          setHistoryGames([]);
        }
      }
    };
    loadInitialHistory();
    return () => {
      cancelled = true;
    };
  }, [authUser?.id, token]);

  const loadMoreHistory = async () => {
    if (!token || !authUser?.id || historyPage >= historyPages) {
      return;
    }
    try {
      const nextPage = historyPage + 1;
      const payload = await historyApi.listByUser({
        userId: authUser.id,
        token,
        page: nextPage,
        limit: 10
      });
      setHistoryGames((current) => [...current, ...(payload?.games ?? [])]);
      setHistoryPage(payload?.pagination?.page ?? nextPage);
      setHistoryPages(payload?.pagination?.pages ?? historyPages);
    } catch {
      // Keep previous history state on pagination errors.
    }
  };

  const loadGameDetails = async (historyId) => {
    if (!token || !historyId) {
      return;
    }
    try {
      const payload = await historyApi.getGame({ historyId, token });
      const rounds = payload?.game?.rounds ?? [];
      const mapped = rounds.map((round) => ({
        roundNumber: round.roundNumber,
        letter: round.letter,
        rows: (round.answers ?? []).map((row) => ({
          playerId: row.playerId ?? row.userId,
          playerName: row.username ?? row.playerName ?? "Player",
          answers: fromApiAnswers(row.answers ?? row),
          points: Number(row.points ?? row.score ?? 0)
        }))
      }));
      setRoundResults(mapped);
      setVisibleCount(PAGE_SIZE);
    } catch {
      // Ignore detail loading failures and keep current view.
    }
  };

  return (
    <main className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-4 sm:py-6">
      <TopBar
        title={t("results.title")}
        subtitle={t("results.subtitle")}
        actions={
          <>
            <Link className="game-btn-secondary" to="/lobby">
              {t("nav.lobby")}
            </Link>
            <Link
              className="game-btn-secondary"
              to={roomId ? `/room/${roomId}` : "/lobby"}
            >
              {t("nav.backToRoom")}
            </Link>
          </>
        }
      />

      <section className="mb-4">
        <Scoreboard
          players={players ?? []}
          scoresByPlayer={scoresByPlayer ?? {}}
          highlightUserId={currentUserId}
        />
      </section>

      <section className="game-card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("results.roundHistory")}</h2>
          {roundResults?.length ? (
            <span className="text-xs subtle-text">
              {roundResults.length} {t("game.round")}
              {roundResults.length === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>

        {!roundResults?.length ? (
          <p className="text-sm subtle-text">{t("results.noResults")}</p>
        ) : (
          <div className="space-y-3">
            {visibleRounds.map((round, index) => (
              <article
                key={round.id ?? index}
                className="rounded-lg border border-border bg-muted/40 p-3 animate-fade-in"
              >
                <header className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold">
                    {t("game.round")} {round.roundNumber ?? index + 1}
                  </h3>
                  <span className="chip-accent">
                    {t("game.letter")}: <strong>{round.letter ?? "-"}</strong>
                  </span>
                </header>

                <div className="overflow-x-auto scrollbar-thin">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-wide subtle-text">
                        <th className="px-3 py-2">{t("common.player")}</th>
                        {CATEGORIES.map((category) => (
                          <th key={category} className="px-3 py-2">
                            {t(`categories.${category}`)}
                          </th>
                        ))}
                        <th className="px-3 py-2 text-end">{t("results.points")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(round.rows ?? []).map((row) => (
                        <tr
                          key={row.playerId}
                          className={`border-b border-border/60 ${
                            row.playerId === currentUserId ? "bg-accent/5" : ""
                          }`}
                        >
                          <td className="px-3 py-2 font-medium">{row.playerName}</td>
                          {CATEGORIES.map((category) => (
                            <td key={category} className="px-3 py-2 subtle-text">
                              {row.answers?.[category] ?? ""}
                            </td>
                          ))}
                          <td className="px-3 py-2 text-end font-bold text-accent">
                            {row.points ?? 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            ))}

            {hasMore ? (
              <div className="flex justify-center">
                <button
                  type="button"
                  className="game-btn-secondary"
                  onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}
                >
                  {t("common.loading").replace("...", "")} +{PAGE_SIZE}
                </button>
              </div>
            ) : null}
          </div>
        )}
      </section>

      <section className="game-card mt-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Saved Games History</h2>
          <span className="text-xs subtle-text">
            {historyGames.length} / {historyPage} of {historyPages} pages
          </span>
        </div>
        {!historyGames.length ? (
          <p className="text-sm subtle-text">No saved game history found yet.</p>
        ) : (
          <div className="space-y-2">
            {historyGames.map((game) => (
              <div
                key={game._id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-mono truncate">{game.roomId}</p>
                  <p className="text-xs subtle-text">
                    {new Date(game.createdAt).toLocaleString()} · {game.totalRounds} rounds
                  </p>
                </div>
                <button
                  type="button"
                  className="game-btn-secondary flex-shrink-0"
                  onClick={() => loadGameDetails(game._id)}
                >
                  Load Details
                </button>
              </div>
            ))}
            {historyPage < historyPages ? (
              <button type="button" className="game-btn-secondary w-full" onClick={loadMoreHistory}>
                Load More History
              </button>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}
