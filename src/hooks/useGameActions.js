// useGameActions.js – full corrected version

import { useCallback } from "react";
import { OUTGOING_EVENTS } from "../constants/socketEvents";
import { useAuthStore } from "../store/authStore";
import { useGameStore } from "../store/gameStore";
import { emitSocketEvent } from "../services/socketClient";
import { toApiAnswers, toVoteTargetPayload } from "../utils/backendAdapters";
import { normalizeLetter, pickRandomAvailableLetter } from "../utils/letters";

function tryEmit(event, payload, setError) {
  console.log(`Emitting ${event}`, payload);
  try {
    emitSocketEvent(event, payload);
    setError(null);
    return true;
  } catch (error) {
    console.error(`Failed to emit ${event}`, error);
    setError(error.message);
    return false;
  }
}

export function useGameActions() {
  const authUser = useAuthStore((state) => state.user);
  const setError = useGameStore((state) => state.setError);
  const currentUserId = useGameStore((state) => state.currentUserId);

  const createRoom = useCallback(
    ({ rounds, timeLimitSeconds, letterMode, alphabet }) =>
      tryEmit(
        OUTGOING_EVENTS.CREATE_ROOM,
        {
          totalRounds: rounds,
          timeLimit: timeLimitSeconds,
          letterMode,
          alphabet
        },
        setError
      ),
    [setError]
  );

  const joinRoom = useCallback(
    ({ roomId }) =>
      tryEmit(OUTGOING_EVENTS.JOIN_ROOM, { roomId }, setError),
    [setError]
  );

  const leaveRoom = useCallback(
    (roomId) => tryEmit(OUTGOING_EVENTS.LEAVE_ROOM, { roomId }, setError),
    [setError]
  );

  const startGame = useCallback(
    (roomId) => tryEmit(OUTGOING_EVENTS.START_GAME, { roomId }, setError),
    [setError]
  );

  const pauseGame = useCallback(
    (roomId, paused) =>
      tryEmit(paused ? OUTGOING_EVENTS.PAUSE_GAME : OUTGOING_EVENTS.RESUME_GAME, { roomId }, setError),
    [setError]
  );

  const kickPlayer = useCallback(
    (roomId, playerId) =>
      tryEmit(OUTGOING_EVENTS.KICK_PLAYER, { roomId, targetUserId: playerId }, setError),
    [setError]
  );

  const reconnectGame = useCallback(
    (roomId) => tryEmit(OUTGOING_EVENTS.RECONNECT_GAME, { roomId }, setError),
    [setError]
  );

  const addBots = useCallback(
    (roomId, count = 0, difficulty = "medium") => {
      const safeCount = Math.max(0, Number(count) || 0);
      if (!safeCount) return true;
      if (safeCount === 1) {
        return tryEmit(OUTGOING_EVENTS.ADD_BOT, { roomId, difficulty }, setError);
      }
      return tryEmit(OUTGOING_EVENTS.ADD_BOTS, { roomId, count: safeCount, difficulty }, setError);
    },
    [setError]
  );

  const submitAnswer = useCallback(
    (roomId, inputs) =>
      tryEmit(OUTGOING_EVENTS.SUBMIT_ANSWER, { roomId, answers: toApiAnswers(inputs) }, setError),
    [setError]
  );

  const pressStop = useCallback(
    (roomId) => tryEmit(OUTGOING_EVENTS.STOP_GAME, { roomId }, setError),
    [setError]
  );

  // ✅ FIXED: accept alphabet and pass to normalizeLetter
  const selectLetter = useCallback(
    (roomId, letter, alphabet = 'en') => {
      const normalized = normalizeLetter(letter, alphabet);
      const diagnostics = {
        phase: "before-emit",
        event: OUTGOING_EVENTS.SELECT_LETTER,
        roomId,
        alphabet,
        rawLetter: letter,
        normalizedLetter: normalized,
        usedLettersSnapshot: useGameStore.getState().game.usedLetters ?? [],
        timestamp: new Date().toISOString()
      };
      console.log("[LetterDebug][Frontend]", diagnostics);
      if (typeof window !== "undefined") {
        window.__lastLetterSelectEmit = diagnostics;
      }

      return tryEmit(
        OUTGOING_EVENTS.SELECT_LETTER,
        { roomId, letter: normalized },
        setError
      );
    },
    [setError]
  );

  // ✅ FIXED: use the room's alphabet for random selection
  const chooseRandomLetter = useCallback(
    (roomId) => {
      const { game: liveGame, room: liveRoom } = useGameStore.getState();
      const alphabet = liveRoom.settings?.alphabet || 'en';
      const letter = pickRandomAvailableLetter(liveGame.usedLetters, alphabet);
      if (!letter) {
        setError("No letters are available.");
        return false;
      }
      // Pass the same alphabet to selectLetter
      return selectLetter(roomId, letter, alphabet);
    },
    [selectLetter, setError]
  );

  const startVoting = useCallback(
    (roomId, target) =>
      tryEmit(OUTGOING_EVENTS.START_VOTING, { roomId, answerDetails: toVoteTargetPayload(target) }, setError),
    [setError]
  );

  const submitVote = useCallback(
    (roomId, voteType, duplicateTargets) =>
      tryEmit(OUTGOING_EVENTS.SUBMIT_VOTE, { roomId, voteChoice: voteType, duplicateAnswersIds: duplicateTargets ?? [] }, setError),
    [setError]
  );

  const nextRound = useCallback(
    (roomId) => tryEmit(OUTGOING_EVENTS.NEXT_ROUND, { roomId }, setError),
    [setError]
  );

  const submitCurrentRow = useCallback(
    (roomId) => {
      const playerId = currentUserId || authUser?.id;
      if (!playerId) {
        setError("Missing player ID.");
        return false;
      }
      const { answersByPlayer } = useGameStore.getState();
      return submitAnswer(roomId, answersByPlayer?.[playerId] ?? {});
    },
    [authUser?.id, currentUserId, setError, submitAnswer]
  );

  return {
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    pauseGame,
    reconnectGame,
    addBots,
    kickPlayer,
    submitAnswer,
    submitCurrentRow,
    pressStop,
    selectLetter,
    chooseRandomLetter,
    startVoting,
    submitVote,
    nextRound
  };
}
