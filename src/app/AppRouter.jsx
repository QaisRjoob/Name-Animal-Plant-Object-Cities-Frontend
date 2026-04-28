import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useGameStore } from "../store/gameStore";
import { ConnectionBanner } from "../components/ConnectionBanner";
import { AuthPage } from "../pages/AuthPage";
import { LobbyPage } from "../pages/LobbyPage";
import { WaitingRoomPage } from "../pages/WaitingRoomPage";
import { GameRoomPage } from "../pages/GameRoomPage";
import { ResultsPage } from "../pages/ResultsPage";

function ProtectedRoute({ children }) {
  const token = useAuthStore((state) => state.token);
  if (!token) {
    return <Navigate to="/auth" replace />;
  }
  return children;
}

function PublicOnlyRoute({ children }) {
  const token = useAuthStore((state) => state.token);
  if (token) {
    return <Navigate to="/lobby" replace />;
  }
  return children;
}

export function AppRouter() {
  const authUserId = useAuthStore((state) => state.user?.id ?? "");
  const setCurrentUserId = useGameStore((state) => state.setCurrentUserId);

  useEffect(() => {
    if (authUserId) {
      setCurrentUserId(authUserId);
    }
  }, [authUserId, setCurrentUserId]);

  return (
    <div className="min-h-screen bg-game-bg">
      <ConnectionBanner />
      <Routes>
        <Route
          path="/auth"
          element={
            <PublicOnlyRoute>
              <AuthPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Navigate to="/lobby" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lobby"
          element={
            <ProtectedRoute>
              <LobbyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/waiting/:roomId"
          element={
            <ProtectedRoute>
              <WaitingRoomPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/room/:roomId"
          element={
            <ProtectedRoute>
              <GameRoomPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/results"
          element={
            <ProtectedRoute>
              <ResultsPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
