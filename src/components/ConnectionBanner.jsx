import { useEffect, useState } from "react";
import { useAuthStore } from "../store/authStore";
import { useGameStore } from "../store/gameStore";
import { useTranslation } from "../i18n";

export function ConnectionBanner() {
  const token = useAuthStore((state) => state.token);
  const connection = useGameStore((state) => state.connection);
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  const isOk = !token || (connection.connected && !connection.error);

  useEffect(() => {
    if (isOk) {
      setVisible(false);
      return;
    }
    // Wait 2s before showing \u2014 hides the normal startup flash and brief blips
    const id = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(id);
  }, [isOk]);

  if (!visible) return null;

  const message = connection.reconnecting
    ? t("connection.reconnecting")
    : connection.error ?? t("connection.disconnected");

  return (
    <div className="sticky top-0 z-50 border-b border-warn/40 bg-warn/15 px-4 py-2 text-xs text-warn">
      <span aria-hidden="true">{"\u26A0\uFE0F "}</span>
      {message}
    </div>
  );
}
