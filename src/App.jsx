import { AppRouter } from "./app/AppRouter";
import { WordsBootstrapGate } from "./components/WordsBootstrapGate";
import { useGameSocket } from "./hooks/useGameSocket";

function App() {
  useGameSocket();
  return (
    <WordsBootstrapGate>
      <AppRouter />
    </WordsBootstrapGate>
  );
}

export default App;
