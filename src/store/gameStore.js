import { create } from "zustand";
import { CATEGORIES, GAME_STATES, STOP_GRACE_SECONDS } from "../constants/game";
import { normalizePlayer } from "../utils/backendAdapters";

const createEmptyAnswerRow = () =>
  CATEGORIES.reduce((accumulator, category) => {
    accumulator[category] = "";
    return accumulator;
  }, {});

const mergePlayers = (existingPlayers, incomingPlayers) => {
  const map = new Map(existingPlayers.map((player) => [player.id, player]));
  for (const player of incomingPlayers) {
    const normalized = normalizePlayer(player);
    if (!normalized?.id) {
      continue;
    }
    map.set(normalized.id, { ...map.get(normalized.id), ...normalized });
  }
  return Array.from(map.values());
};

const normalizeScores = (scores) => {
  if (!scores) {
    return {};
  }

  if (Array.isArray(scores)) {
    return scores.reduce((accumulator, item) => {
      if (item?.playerId) {
        accumulator[item.playerId] = Number(item.score ?? item.points ?? 0);
      }
      return accumulator;
    }, {});
  }

  return scores;
};

const initialState = {
  connection: {
    connected: false,
    reconnecting: false,
    error: null
  },
  room: {
    id: "",
    status: GAME_STATES.WAITING,
    ownerId: "",
    players: [],
    botCount: 0,
    settings: {
      rounds: 5,
      timeLimitSeconds: 60,
      letterMode: "both",
      alphabet: "en"
    }
  },
  game: {
    state: GAME_STATES.WAITING,
    roundNumber: 0,
    totalRounds: 0,
    currentLetter: "",
    usedLetters: [],
    timerSeconds: 0,
    selectorPlayerId: "",
    startedAt: 0,
    stopPressedBy: "",
    stopGraceEndsAt: 0,
    paused: false
  },
  answersByPlayer: {},
  scoresByPlayer: {},
  roundResults: [],
  voting: {
    active: false,
    endsAt: 0,
    target: null,
    candidateDuplicates: [],
    progress: {
      voted: 0,
      total: 0
    },
    lastResult: null
  },
  nextRoundReadyPlayerIds: [],
  currentUserId: "",
  error: null
};

export const useGameStore = create((set) => ({
  ...initialState,
  setError: (error) => set({ error }),
  setCurrentUserId: (currentUserId) => set({ currentUserId }),
  setConnection: (connection) =>
    set((state) => ({
      connection: { ...state.connection, ...connection }
    })),
  setDisconnected: (error = "Disconnected from game server.") =>
    set((state) => ({
      connection: {
        ...state.connection,
        connected: false,
        reconnecting: false,
        error
      }
    })),
  setRoom: (roomPatch) =>
    set((state) => ({
      room: {
        ...state.room,
        ...roomPatch,
        settings: {
          ...state.room.settings,
          ...(roomPatch?.settings ?? {})
        }
      }
    })),
  upsertPlayers: (incomingPlayers) =>
    set((state) => ({
      room: {
        ...state.room,
        players: mergePlayers(state.room.players, incomingPlayers)
      }
    })),
  removePlayer: (playerId) =>
    set((state) => ({
      room: {
        ...state.room,
        players: state.room.players.filter((player) => player.id !== playerId)
      }
    })),
  setGameState: (gameState) =>
    set((state) => ({
      game: {
        ...state.game,
        state: gameState
      }
    })),
  startLetterSelection: (selectorPlayerId, usedLetters) =>
    set((state) => ({
      game: {
        ...state.game,
        state: GAME_STATES.SELECTING_LETTER,
        selectorPlayerId: selectorPlayerId ?? "",
        ...(usedLetters != null && { usedLetters }),
      }
    })),
  setRound: (roundPatch) =>
    set((state) => ({
      game: {
        ...state.game,
        roundNumber: roundPatch?.roundNumber ?? state.game.roundNumber,
        totalRounds: roundPatch?.totalRounds ?? state.game.totalRounds,
        currentLetter: roundPatch?.currentLetter ?? state.game.currentLetter,
        usedLetters: roundPatch?.usedLetters ?? state.game.usedLetters,
        timerSeconds: roundPatch?.timerSeconds ?? state.game.timerSeconds,
        selectorPlayerId: roundPatch?.selectorPlayerId ?? state.game.selectorPlayerId,
        startedAt: roundPatch?.startedAt ?? state.game.startedAt,
        paused: roundPatch?.paused ?? state.game.paused
      }
    })),
  setTimer: (timerSeconds) =>
    set((state) => ({
      game: {
        ...state.game,
        timerSeconds
      }
    })),
  setCurrentLetter: (currentLetter) =>
    set((state) => ({
      game: {
        ...state.game,
        currentLetter
      }
    })),
  updatePlayerInputs: (playerId, inputsPatch) =>
    set((state) => ({
      answersByPlayer: {
        ...state.answersByPlayer,
        [playerId]: {
          ...(state.answersByPlayer[playerId] ?? createEmptyAnswerRow()),
          ...inputsPatch
        }
      }
    })),
  replaceInputs: (answersByPlayer) =>
    set({
      answersByPlayer: answersByPlayer ?? {}
    }),
  setStopPressed: (playerId, graceSeconds = STOP_GRACE_SECONDS) =>
    set((state) => ({
      game: {
        ...state.game,
        state: GAME_STATES.STOPPED,
        stopPressedBy: playerId,
        stopGraceEndsAt: Date.now() + graceSeconds * 1000
      }
    })),
  setVoting: (votingPatch) =>
    set((state) => ({
      voting: {
        ...state.voting,
        ...votingPatch,
        progress: {
          ...state.voting.progress,
          ...(votingPatch?.progress ?? {})
        }
      }
    })),
  setScores: (scores) =>
    set({
      scoresByPlayer: normalizeScores(scores)
    }),
  setRoundResults: (roundResults) => set({ roundResults: roundResults ?? [] }),
  applyVotingOutcome: (targetPlayerId, category, outcome) =>
    set((state) => {
      if (!state.roundResults.length) return state;
      const lastIdx = state.roundResults.length - 1;
      const last = state.roundResults[lastIdx];
      if (!last?.rows) return state;
      const updatedRows = last.rows.map((row) => {
        if (row.playerId !== targetPlayerId) return row;
        const cs = row.catScores?.[category];
        if (!cs) return row;
        return {
          ...row,
          catScores: {
            ...row.catScores,
            [category]: {
              ...cs,
              ...(outcome === "incorrect" ? { valid: false, votedIncorrect: true } : {}),
              ...(outcome === "duplicate" ? { duplicate: true, votedDuplicate: true } : {}),
            },
          },
        };
      });
      const updated = [...state.roundResults];
      updated[lastIdx] = { ...last, rows: updatedRows };
      return { roundResults: updated };
    }),
  markNextRoundReady: (playerId) =>
    set((state) => {
      if (!playerId || state.nextRoundReadyPlayerIds.includes(playerId)) {
        return state;
      }
      return {
        nextRoundReadyPlayerIds: [...state.nextRoundReadyPlayerIds, playerId]
      };
    }),
  setNextRoundReadyList: (playerIds) =>
    set({
      nextRoundReadyPlayerIds: Array.isArray(playerIds) ? [...playerIds] : []
    }),
  resetRoundTransient: () =>
    set((state) => ({
      game: {
        ...state.game,
        stopPressedBy: "",
        stopGraceEndsAt: 0,
        currentLetter: ""
      },
      voting: {
        ...state.voting,
        active: false,
        endsAt: 0,
        target: null,
        candidateDuplicates: [],
        progress: {
          voted: 0,
          total: 0
        }
      },
      nextRoundReadyPlayerIds: []
    })),
  applySnapshot: (snapshot) =>
    set((state) => ({
      room: {
        ...state.room,
        ...(snapshot?.room ?? {}),
        id:
          snapshot?.roomId ??
          snapshot?.room?.roomId ??
          snapshot?.room?.id ??
          state.room.id,
        ownerId:
          snapshot?.ownerId ??
          snapshot?.room?.ownerId ??
          state.room.ownerId,
        status:
          snapshot?.gameState ??
          snapshot?.room?.gameState ??
          snapshot?.room?.status ??
          state.room.status,
        settings: {
          ...state.room.settings,
          ...(snapshot?.room?.settings ?? {}),
          rounds:
            snapshot?.totalRounds ??
            snapshot?.room?.totalRounds ??
            snapshot?.room?.settings?.rounds ??
            state.room.settings.rounds,
          timeLimitSeconds:
            snapshot?.timeLimit ??
            snapshot?.room?.timeLimit ??
            snapshot?.room?.settings?.timeLimitSeconds ??
            state.room.settings.timeLimitSeconds,
          letterMode:
            snapshot?.letterMode ??
            snapshot?.room?.letterMode ??
            snapshot?.room?.settings?.letterMode ??
            state.room.settings.letterMode,
          alphabet:
            snapshot?.alphabet ??
            snapshot?.room?.alphabet ??
            snapshot?.room?.settings?.alphabet ??
            state.room.settings.alphabet
        },
        players: mergePlayers(state.room.players, snapshot?.players ?? snapshot?.room?.players ?? [])
      },
      game: {
        ...state.game,
        ...(snapshot?.game ?? {}),
        roundNumber: snapshot?.round ?? snapshot?.game?.roundNumber ?? state.game.roundNumber,
        totalRounds: snapshot?.totalRounds ?? snapshot?.game?.totalRounds ?? state.game.totalRounds,
        currentLetter:
          snapshot?.currentLetter ?? snapshot?.game?.currentLetter ?? state.game.currentLetter,
        usedLetters: snapshot?.usedLetters ?? snapshot?.game?.usedLetters ?? state.game.usedLetters,
        selectorPlayerId:
          snapshot?.currentSelectorId ??
          snapshot?.game?.selectorPlayerId ??
          "",
        state: snapshot?.gameState ?? snapshot?.game?.state ?? state.game.state
      },
      currentUserId: snapshot?.currentUserId ?? state.currentUserId,
      answersByPlayer: snapshot?.answersByPlayer ?? state.answersByPlayer,
      scoresByPlayer: normalizeScores(snapshot?.scoresByPlayer ?? snapshot?.scores ?? state.scoresByPlayer),
      roundResults: snapshot?.roundResults ?? state.roundResults,
      voting: snapshot?.voting
        ? {
            ...state.voting,
            ...snapshot.voting
          }
        : state.voting,
      nextRoundReadyPlayerIds:
        snapshot?.readiness?.readyPlayerIds ??
        state.nextRoundReadyPlayerIds
    })),
  resetGameStore: () => set(initialState)
}));
