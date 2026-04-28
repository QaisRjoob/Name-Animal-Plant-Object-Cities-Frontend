import { CATEGORIES } from "../constants/game";

export function normalizeUser(user) {
  if (!user) {
    return null;
  }
  return {
    ...user,
    name: user.name ?? user.username ?? "Player",
    username: user.username ?? user.name ?? "Player"
  };
}

export function normalizePlayer(player) {
  if (!player) {
    return null;
  }
  return {
    ...player,
    id: player.id ?? player.userId ?? player.playerId,
    name: player.name ?? player.username ?? "Player",
    username: player.username ?? player.name ?? "Player"
  };
}

export function fromApiAnswers(answers = {}) {
  const source = answers ?? {};
  return {
    name: source.name ?? source.names ?? source.personName ?? "",
    plant: source.plant ?? source.plants ?? "",
    animal: source.animal ?? source.animals ?? "",
    object: source.object ?? source.objects ?? "",
    city: source.city ?? source.cities ?? ""
  };
}

export function toApiAnswers(answers = {}) {
  return {
    name: answers.name ?? "",
    plant: answers.plant ?? "",
    animal: answers.animal ?? "",
    object: answers.object ?? "",
    cities: answers.city ?? answers.cities ?? ""
  };
}

export function toVoteTargetPayload(target) {
  if (!target) {
    return null;
  }
  return {
    targetPlayerId: target.playerId ?? target.targetPlayerId,
    category: target.category === "city" ? "cities" : target.category,
    answer: target.answer ?? ""
  };
}

export function normalizeRoundResults(payload) {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  const answersTable = Array.isArray(payload.answersTable) ? payload.answersTable : [];
  if (!answersTable.length) {
    return [];
  }

  const scoreMap = new Map(
    (payload.scores ?? []).map((item) => [item.playerId, Number(item.score ?? 0)])
  );

  const rows = answersTable.map((item) => {
    const answers = fromApiAnswers(item.answers ?? item);
    const rawCatScores = item.catScores ?? {};
    const catScores = Object.fromEntries(
      Object.entries(rawCatScores).map(([key, value]) => [
        key === "cities" ? "city" : key,
        value
      ])
    );
    return {
      playerId: item.playerId ?? item.userId,
      playerName: item.username ?? item.playerName ?? "Player",
      answers: CATEGORIES.reduce((accumulator, category) => {
        accumulator[category] = answers[category] ?? "";
        return accumulator;
      }, {}),
      catScores,
      points: Number(item.points ?? item.scoreDelta ?? scoreMap.get(item.playerId) ?? 0)
    };
  });

  return [
    {
      roundNumber: payload.round ?? payload.roundNumber,
      letter: payload.letter ?? "",
      rows
    }
  ];
}

export function roomDetailsToSnapshot(room) {
  if (!room) {
    return {};
  }

  return {
    roomId: room.roomId,
    ownerId: room.ownerId,
    gameState: room.gameState,
    round: room.round,
    totalRounds: room.totalRounds,
    timeLimit: room.timeLimit,
    letterMode: room.letterMode,
    alphabet: room.alphabet ?? room.settings?.alphabet,
    currentLetter: room.currentLetter,
    usedLetters: room.usedLetters ?? [],
    currentSelectorId:
      room.currentSelectorId ??
      room.selectorId ??
      room.selectorPlayerId ??
      room.currentSelector?.id ??
      room.currentSelector?.playerId ??
      room.currentSelector?.userId,
    players: (room.players ?? []).map((player) => normalizePlayer(player)),
    voting: room.voting
      ? {
          active: Boolean(room.voting.active),
          target: {
            playerId: room.voting.targetPlayerId,
            category: room.voting.category === "cities" ? "city" : room.voting.category,
            answer: room.voting.answer
          },
          progress: {
            voted: room.voting.voted ?? 0,
            total: room.voting.total ?? 0
          }
        }
      : undefined,
    readiness: room.readiness
  };
}
