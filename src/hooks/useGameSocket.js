import { useEffect } from "react";
import { GAME_STATES, STOP_GRACE_SECONDS, VOTING_DURATION_SECONDS } from "../constants/game";
import { INCOMING_EVENTS, OUTGOING_EVENTS } from "../constants/socketEvents";
import { useAuthStore } from "../store/authStore";
import { useGameStore } from "../store/gameStore";
import { connectSocket, disconnectSocket, emitSocketEvent } from "../services/socketClient";
import { fromApiAnswers, normalizePlayer, normalizeRoundResults, toApiAnswers } from "../utils/backendAdapters";
import { expireSession, isAuthError } from "../utils/sessionExpiry";

function bindEventAliases(socket, aliases, handler) {
  aliases.forEach((event) => socket.on(event, handler));
  return () => aliases.forEach((event) => socket.off(event, handler));
}

function resolveSelectorId(payload) {
  return (
    payload?.currentSelectorId ??
    payload?.selectorId ??
    payload?.selectorPlayerId ??
    payload?.selector?.id ??
    payload?.selector?.playerId ??
    payload?.selector?.userId ??
    ""
  );
}

function resolveRoundNumber(payload, currentRound, advance = false) {
  const explicitRound = Number(payload?.roundNumber ?? payload?.round);
  if (Number.isFinite(explicitRound) && explicitRound > 0) {
    return explicitRound;
  }

  const safeCurrentRound = Math.max(0, Number(currentRound) || 0);
  return advance ? safeCurrentRound + 1 : Math.max(1, safeCurrentRound || 1);
}

function resolveSelectorByRound(players, ownerId, roundNumber) {
  const orderedPlayers = (players ?? []).filter((player) => player?.id);
  if (!orderedPlayers.length) {
    return "";
  }
  const ownerIndex = Math.max(
    0,
    orderedPlayers.findIndex((player) => player.id === ownerId)
  );
  const safeRound = Math.max(1, Number(roundNumber) || 1);
  const selectorIndex = (ownerIndex + safeRound - 1) % orderedPlayers.length;
  return orderedPlayers[selectorIndex]?.id ?? "";
}

export function useGameSocket() {
  const token = useAuthStore((state) => state.token);
  const authUserId = useAuthStore((state) => state.user?.id ?? "");

  const setCurrentUserId = useGameStore((state) => state.setCurrentUserId);
  const setConnection = useGameStore((state) => state.setConnection);
  const setDisconnected = useGameStore((state) => state.setDisconnected);
  const setRoom = useGameStore((state) => state.setRoom);
  const applySnapshot = useGameStore((state) => state.applySnapshot);
  const upsertPlayers = useGameStore((state) => state.upsertPlayers);
  const removePlayer = useGameStore((state) => state.removePlayer);
  const setGameState = useGameStore((state) => state.setGameState);
  const startLetterSelection = useGameStore((state) => state.startLetterSelection);
  const setRound = useGameStore((state) => state.setRound);
  const setTimer = useGameStore((state) => state.setTimer);
  const updatePlayerInputs = useGameStore((state) => state.updatePlayerInputs);
  const replaceInputs = useGameStore((state) => state.replaceInputs);
  const setStopPressed = useGameStore((state) => state.setStopPressed);
  const setVoting = useGameStore((state) => state.setVoting);
  const setScores = useGameStore((state) => state.setScores);
  const setRoundResults = useGameStore((state) => state.setRoundResults);
  const resetRoundTransient = useGameStore((state) => state.resetRoundTransient);
  const setNextRoundReadyList = useGameStore((state) => state.setNextRoundReadyList);
  const applyVotingOutcome = useGameStore((state) => state.applyVotingOutcome);
  const setError = useGameStore((state) => state.setError);

  useEffect(() => {
    if (authUserId) {
      setCurrentUserId(authUserId);
    }
  }, [authUserId, setCurrentUserId]);

  useEffect(() => {
    if (!token) {
      disconnectSocket();
      setDisconnected("Not connected. Login first.");
      return undefined;
    }

    const socket = connectSocket(token);
    setConnection({ reconnecting: true, error: null });

    const onConnect = () => {
      setConnection({ connected: true, reconnecting: false, error: null });
      const activeRoomId = useGameStore.getState().room.id;
      if (activeRoomId) {
        emitSocketEvent(OUTGOING_EVENTS.RECONNECT_GAME, { roomId: activeRoomId });
      }
    };
    const onDisconnect = () => setDisconnected("Disconnected. Reconnecting...");
    const onReconnectAttempt = () => setConnection({ reconnecting: true });
    const onConnectError = (error) => {
      if (isAuthError(error.message)) {
        expireSession();
      } else {
        setDisconnected(error.message);
      }
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("reconnect_attempt", onReconnectAttempt);
    socket.on("connect_error", onConnectError);

    const unbinders = [
      bindEventAliases(socket, INCOMING_EVENTS.ROOM_CREATED, (payload) => {
        const config = payload?.config ?? {};
        const settings = {
          rounds: config.totalRounds ?? 5,
          timeLimitSeconds: config.timeLimit ?? 60,
        };
        if (config.letterMode != null) settings.letterMode = config.letterMode;
        if (config.alphabet != null) settings.alphabet = config.alphabet;
        setRoom({ id: payload?.roomId ?? "", settings });
      }),
      bindEventAliases(socket, INCOMING_EVENTS.ROOM_SYNC, (payload) => {
          console.log("📨 ROOM_CREATED received", payload);  // <-- ADD THIS

        const votingSession = payload?.votingSession;
        applySnapshot({
          ...(payload ?? {}),
          voting: votingSession
            ? {
                active: true,
                target: {
                  playerId: votingSession.targetPlayerId,
                  category:
                    votingSession.category === "cities"
                      ? "city"
                      : votingSession.category,
                  answer: votingSession.answer
                },
                progress: {
                  voted: votingSession.voted ?? 0,
                  total: votingSession.total ?? 0
                }
              }
            : payload?.voting
        });
      }),
      bindEventAliases(socket, INCOMING_EVENTS.PLAYER_JOINED, (payload) => {
        upsertPlayers([normalizePlayer(payload?.player ?? payload)]);
      }),
      bindEventAliases(socket, INCOMING_EVENTS.BOT_JOINED, (payload) => {
        upsertPlayers([normalizePlayer(payload?.bot)]);
      }),
      bindEventAliases(socket, INCOMING_EVENTS.BOTS_JOINED, (payload) => {
        upsertPlayers((payload?.bots ?? []).map((bot) => normalizePlayer(bot)));
      }),
      bindEventAliases(socket, INCOMING_EVENTS.PLAYER_LEFT, (payload) => {
        const playerId = payload?.userId ?? payload?.playerId ?? payload?.id;
        if (!playerId) return;
        if (payload?.temporary) {
          // Keep them in the list but mark as disconnected — they have 30s to reconnect
          upsertPlayers([{ id: playerId, username: payload.username, disconnected: true }]);
        } else {
          removePlayer(playerId);
        }
      }),
      bindEventAliases(socket, INCOMING_EVENTS.PLAYER_RECONNECTED, (payload) => {
        const playerId = payload?.userId ?? payload?.playerId ?? payload?.id;
        if (!playerId) return;
        upsertPlayers([{ id: playerId, username: payload.username, disconnected: false }]);
      }),
      bindEventAliases(socket, INCOMING_EVENTS.OWNER_CHANGED, (payload) => {
        if (payload?.newOwnerId) {
          setRoom({ ownerId: payload.newOwnerId });
        }
      }),
      bindEventAliases(socket, INCOMING_EVENTS.PLAYER_KICKED, (payload) => {
        const playerId = payload?.targetId;
        if (playerId) {
          removePlayer(playerId);
        }
      }),
      bindEventAliases(socket, INCOMING_EVENTS.START_GAME, (payload) => {
        const roomConfig = payload?.roomConfig ?? {};
        if (roomConfig) {
          const settings = {
            rounds: roomConfig.totalRounds,
            timeLimitSeconds: roomConfig.timeLimit,
          };
          if (roomConfig.letterMode != null) settings.letterMode = roomConfig.letterMode;
          if (roomConfig.alphabet != null) settings.alphabet = roomConfig.alphabet;
          setRoom({ settings });
          if (Array.isArray(roomConfig.players)) {
            upsertPlayers(roomConfig.players.map((player) => normalizePlayer(player)));
          }
        }
        setGameState(GAME_STATES.STARTING);
      }),
      bindEventAliases(socket, INCOMING_EVENTS.START_ROUND, (payload) => {
        const state = useGameStore.getState();
        // Prevent auto-advance: if game is waiting for user confirmation (NEXT_ROUND state),
        // only proceed if the current user has marked themselves ready by clicking "Next Round"
        if (
          state.game.state === GAME_STATES.NEXT_ROUND &&
          !state.nextRoundReadyPlayerIds.includes(state.currentUserId)
        ) {
          return; // Ignore START_ROUND until user marks themselves ready
        }
        // Don't override a stop that was already registered locally — the server
        // may have sent START_ROUND before it processed our STOP_GAME event.
        if (state.game.state === GAME_STATES.STOPPED) {
          return;
        }
        const fallbackSelectorId = resolveSelectorByRound(
          state.room.players,
          state.room.ownerId,
          resolveRoundNumber(payload, state.game.roundNumber, true)
        );
        setGameState(GAME_STATES.PLAYING);
        setRound({
          roundNumber: resolveRoundNumber(payload, state.game.roundNumber, true),
          totalRounds: payload?.totalRounds,
          currentLetter: payload?.letter ?? payload?.currentLetter ?? "",
          usedLetters: payload?.usedLetters ?? useGameStore.getState().game.usedLetters,
          timerSeconds:
            payload?.timeLeft ??
            payload?.timerSeconds ??
            payload?.seconds ??
            useGameStore.getState().room.settings.timeLimitSeconds ??
            0,
          selectorPlayerId: resolveSelectorId(payload) || fallbackSelectorId,
          startedAt: Date.now()
        });
        resetRoundTransient();
      }),
      bindEventAliases(socket, INCOMING_EVENTS.SELECT_LETTER, (payload) => {
        const state = useGameStore.getState();
        console.log("[LetterDebug][Socket][SELECT_LETTER received]", {
          payload,
          currentGameState: state.game.state,
          currentLetter: state.game.currentLetter,
          usedLettersBefore: state.game.usedLetters,
          timestamp: new Date().toISOString()
        });
        const fallbackSelectorId = resolveSelectorByRound(
          state.room.players,
          state.room.ownerId,
          resolveRoundNumber(payload, state.game.roundNumber)
        );
        startLetterSelection(
          resolveSelectorId(payload) || fallbackSelectorId,
          payload?.usedLetters ?? payload?.availableLetters ?? null
        );
      }),
      bindEventAliases(socket, INCOMING_EVENTS.NEW_LETTER, (payload) => {
        const lastEmit =
          typeof window !== "undefined" ? window.__lastLetterSelectEmit ?? null : null;
        console.log("[LetterDebug][Socket][NEW_LETTER received]", {
          payload,
          lastManualEmit: lastEmit,
          matchesLastManualEmit:
            lastEmit?.normalizedLetter != null
              ? String(lastEmit.normalizedLetter) === String(payload?.letter ?? "")
              : null,
          timestamp: new Date().toISOString()
        });
        replaceInputs({});
        setRound({
          currentLetter: payload?.letter ?? "",
          roundNumber: payload?.round ?? useGameStore.getState().game.roundNumber
        });
        // In random-only mode the backend never emits select-letter, so the
        // frontend stays stuck in STARTING/NEXT_ROUND. Advance to
        // SELECTING_LETTER here so canEdit becomes true and the round plays
        // identically to manual mode.
        const st = useGameStore.getState().game.state;
        if (st === GAME_STATES.STARTING || st === GAME_STATES.NEXT_ROUND) {
          setGameState(GAME_STATES.SELECTING_LETTER);
        }
      }),
      bindEventAliases(socket, INCOMING_EVENTS.TIMER_UPDATE, (payload) => {
        const seconds = payload?.timeLeft ?? payload?.remainingSeconds ?? payload?.seconds;
        if (seconds !== undefined) {
          setTimer(Number(seconds));
        }
      }),
      bindEventAliases(socket, INCOMING_EVENTS.INPUT_UPDATE, (payload) => {
        const playerId = payload?.userId ?? payload?.playerId ?? payload?.id;
        if (!playerId) {
          return;
        }
        // Skip echoes of our own submissions — in production the server round-trip
        // (~100-300ms) means the echo arrives after the user has typed more,
        // which would overwrite newer local state with stale server data.
        if (playerId === useGameStore.getState().currentUserId) {
          return;
        }
        updatePlayerInputs(playerId, fromApiAnswers(payload?.answers ?? {}));
      }),
      bindEventAliases(socket, [...INCOMING_EVENTS.PRESS_STOP, ...INCOMING_EVENTS.ROUND_STOPPED], (payload) => {
        const byPlayerId = payload?.initiatorId ?? payload?.playerId ?? "";
        setTimer(0);
        setStopPressed(byPlayerId, payload?.gracePeriod ?? STOP_GRACE_SECONDS);
        // Submit current answers immediately so the server has all players' answers
        // and can start comparison right after the grace period, without waiting for
        // the original timer to expire.
        const { answersByPlayer, currentUserId, room } = useGameStore.getState();
        const playerId = currentUserId || authUserId;
        if (playerId && room?.id) {
          const answers = answersByPlayer?.[playerId] ?? {};
          emitSocketEvent(OUTGOING_EVENTS.SUBMIT_ANSWER, { roomId: room.id, answers: toApiAnswers(answers) });
        }
      }),
      bindEventAliases(socket, INCOMING_EVENTS.START_VOTING, (payload) => {
        const targetAnswer = payload?.targetAnswer ?? {};
        const duration = payload?.timer ?? VOTING_DURATION_SECONDS;
        const category = targetAnswer.category === "cities" ? "city" : targetAnswer.category;
        const targetPlayerId = targetAnswer.targetPlayerId;

        // Build list of other players with non-empty answers in this category
        const state = useGameStore.getState();
        const candidateDuplicates = state.room.players
          .filter((p) => p.id !== targetPlayerId)
          .map((p) => ({
            id: p.id,
            playerName: p.name ?? p.username ?? "Player",
            answer: state.answersByPlayer[p.id]?.[category] ?? "",
          }))
          .filter((c) => c.answer.trim() !== "");

        setGameState(GAME_STATES.VOTING);
        setVoting({
          active: true,
          initiatorId: payload?.initiatorId ?? "",
          target: {
            playerId: targetPlayerId,
            category,
            answer: targetAnswer.answer,
          },
          candidateDuplicates,
          progress: {
            voted: 0,
            total: useGameStore.getState().room.players.length,
          },
          endsAt: Date.now() + duration * 1000,
        });
      }),
      bindEventAliases(socket, INCOMING_EVENTS.VOTE_PROGRESS, (payload) => {
        setVoting({
          progress: {
            voted: payload?.voted ?? 0,
            total: payload?.total ?? 0
          }
        });
      }),
      bindEventAliases(socket, INCOMING_EVENTS.END_VOTING, (payload) => {
        setVoting({
          active: false,
          endsAt: 0,
          lastResult: payload,
        });
        setGameState(GAME_STATES.SCORING);
        if (payload?.targetPlayerId && payload?.category && payload?.outcome) {
          const cat = payload.category === "cities" ? "city" : payload.category;
          applyVotingOutcome(payload.targetPlayerId, cat, payload.outcome);
        }
      }),
      bindEventAliases(socket, INCOMING_EVENTS.UPDATE_SCORES, (payload) => {
        setScores(payload?.scores ?? payload);
      }),
      bindEventAliases(socket, INCOMING_EVENTS.ROUND_RESULTS, (payload) => {
        const roomPlayers = useGameStore.getState().room.players ?? [];
        const botIds = new Set(roomPlayers.filter((p) => p?.isBot).map((p) => p.id));
        const rawBotAnswers = (payload?.answersTable ?? [])
          .filter((row) => botIds.has(row?.playerId ?? row?.userId))
          .map((row) => ({
            playerId: row?.playerId ?? row?.userId,
            answers: row?.answers ?? row
          }));
        console.log("[BotAnswersDebug][ROUND_RESULTS payload]", {
          round: payload?.round ?? payload?.roundNumber,
          letter: payload?.letter,
          rawBotAnswers
        });

        const existing = useGameStore.getState().roundResults ?? [];
        const normalized = normalizeRoundResults(payload);
        const normalizedBotRows = normalized
          .flatMap((round) => round?.rows ?? [])
          .filter((row) => botIds.has(row?.playerId))
          .map((row) => ({ playerId: row.playerId, answers: row.answers }));
        console.log("[BotAnswersDebug][ROUND_RESULTS normalized]", {
          round: payload?.round ?? payload?.roundNumber,
          normalizedBotRows
        });
        setRoundResults([...existing, ...normalized]);
      }),
      bindEventAliases(socket, INCOMING_EVENTS.NEXT_ROUND, (payload) => {
        const state = useGameStore.getState();
        const nextRoundNumber = resolveRoundNumber(payload, state.game.roundNumber, true);
        const fallbackSelectorId = resolveSelectorByRound(
          state.room.players,
          state.room.ownerId,
          nextRoundNumber
        );
        setGameState(GAME_STATES.NEXT_ROUND);
        resetRoundTransient();
        setRound({
          roundNumber: nextRoundNumber,
          selectorPlayerId: resolveSelectorId(payload) || fallbackSelectorId
        });
      }),
      bindEventAliases(socket, INCOMING_EVENTS.READY_PROGRESS, (payload) => {
        setNextRoundReadyList(payload?.readyPlayerIds ?? []);
      }),
      bindEventAliases(socket, INCOMING_EVENTS.GAME_PAUSED, () => {
        setRound({ paused: true });
      }),
      bindEventAliases(socket, INCOMING_EVENTS.GAME_RESUMED, () => {
        setRound({ paused: false });
      }),
      bindEventAliases(socket, INCOMING_EVENTS.GAME_FINISHED, (payload) => {
        setGameState(GAME_STATES.FINISHED);
        if (payload?.finalScores) {
          setScores(payload.finalScores);
        }
      }),
      bindEventAliases(socket, INCOMING_EVENTS.SOCKET_ERROR, (payload) => {
        setError(payload?.message ?? "Socket error");
      })
    ];

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("reconnect_attempt", onReconnectAttempt);
      socket.off("connect_error", onConnectError);
      unbinders.forEach((unbind) => unbind());
    };
  }, [
    token,
    applySnapshot,
    removePlayer,
    resetRoundTransient,
    setConnection,
    setDisconnected,
    setError,
    setGameState,
    setRoom,
    setRound,
    setRoundResults,
    setScores,
    setStopPressed,
    setTimer,
    setVoting,
    setNextRoundReadyList,
    startLetterSelection,
    replaceInputs,
    updatePlayerInputs,
    upsertPlayers,
    applyVotingOutcome,
  ]);
}
