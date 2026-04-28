import { useEffect } from "react";
import { useWordsStore } from "../store/wordsStore";

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-game-bg px-4 text-center">
      <div className="game-card w-full max-w-md space-y-4 py-10">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-accent/20 border-t-accent" />
        <div>
          <p className="text-lg font-bold">Loading word bank…</p>
          <p className="mt-1 text-sm subtle-text">Connecting to the backend API before starting the game.</p>
        </div>
      </div>
    </div>
  );
}

function FallbackNotice({ message }) {
  return (
    <div className="fixed left-1/2 top-4 z-[70] w-[min(92vw,48rem)] -translate-x-1/2 rounded-2xl border border-warn/40 bg-card px-4 py-3 text-sm shadow-lg shadow-black/20">
      <strong className="text-warn">Backend word API unavailable.</strong>{" "}
      {message ?? "Loaded fallback word bank so the app can keep running."}
    </div>
  );
}

export function WordsBootstrapGate({ children }) {
  const status = useWordsStore((state) => state.status);
  const source = useWordsStore((state) => state.source);
  const error = useWordsStore((state) => state.error);
  const bootstrapWords = useWordsStore((state) => state.bootstrapWords);

  useEffect(() => {
    if (status === "idle") {
      bootstrapWords();
    }
  }, [bootstrapWords, status]);

  if (status === "idle" || status === "loading") {
    return <LoadingScreen />;
  }

  return (
    <>
      {source === "fallback" && error ? <FallbackNotice message={error} /> : null}
      {children}
    </>
  );
}