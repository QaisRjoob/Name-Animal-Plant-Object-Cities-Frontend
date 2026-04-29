# Name Animal Plant Object Cities 🎮

A real-time multiplayer word game where players fill in categories (Name, Animal, Plant, Object, City) starting with a chosen letter — all before the timer runs out.

**Live demo: https://name-animal-plant-object-cities.onrender.com
**Backend repo:https://name-animal-plant-object-cities-game.onrender.com
---

## Features

- 🌐 Real-time multiplayer via WebSockets
- 🤖 AI bots with easy / medium / hard difficulty
- 🔤 English and Arabic alphabet modes
- ✋ Stop button — any player can end the round early
- ⚖️ Voting system to challenge suspicious answers
- 🏆 Live leaderboard and round-by-round results
- 🌙 Dark / light theme toggle
- 🌍 English / Arabic UI language toggle
- 📱 Responsive design

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 |
| State management | Zustand |
| Routing | React Router v6 |
| Real-time | Socket.IO client |
| Styling | Tailwind CSS |
| Build tool | Vite |

---

## Getting Started

### Prerequisites
- Node.js 18+
- The backend server running (see backend repo)

### Installation

```bash
git clone https://github.com/your-username/name-animal-plant-frontend.git
cd name-animal-plant-frontend
npm install
```

### Environment variables

Copy `.env.example` to `.env` and fill in your backend URL:

```bash
cp .env.example .env
```

```env
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

### Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Project Structure

```
src/
├── app/          # Router and protected routes
├── components/   # Reusable UI components
├── config/       # Environment config (API/socket URLs)
├── constants/    # Game states, categories, letter sets
├── data/         # Fallback word bank
├── hooks/        # useGameSocket, useGameActions
├── i18n/         # English / Arabic translations
├── pages/        # LobbyPage, GameRoomPage, WaitingRoomPage, ResultsPage
├── services/     # API client, socket client, words service
├── store/        # Zustand stores (auth, game, words, ui)
└── utils/        # Letter utils, backend adapters, sound effects
```

---

## Deployment (Render — Static Site)

| Setting | Value |
|---|---|
| Build command | `npm install && npm run build` |
| Publish directory | `dist` |

**Environment variables to set in Render:**

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://your-backend.onrender.com` |
| `VITE_SOCKET_URL` | `https://your-backend.onrender.com` |

SPA routing is handled automatically via `public/_redirects`.

---

## How to Play

1. **Register / log in**
2. **Create a room** — choose rounds, time limit, letter mode, and alphabet
3. **Share the Room ID** with friends, or fill seats with bots
4. **Start the game** — the selector picks (or the game auto-picks) a letter each round
5. **Fill in all 5 categories** before the timer runs out
6. **Press STOP** when you're done — other players get a grace period to finish
7. **Vote** to challenge any answer you think is wrong or a duplicate
8. **See the scores** and continue to the next round

---

## License

MIT
