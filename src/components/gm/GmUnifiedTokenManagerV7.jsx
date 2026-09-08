import React, { useMemo } from "react";
import GmUnifiedTokenManagerV5 from "./GmUnifiedTokenManagerV5.jsx";
import GmNpcCardEditorV7 from "./GmNpcCardEditorV7.jsx";

export default function GmUnifiedTokenManagerV7({ session }) {
  const tokenSession = useMemo(() => {
    if (!session) return session;
    return {
      ...session,
      liveSceneId: session.liveSceneId || session.tacticalScene?.sceneId || "",
    };
  }, [session]);

  return (
    <div className="gm-unified-token-manager-v7">
      <GmUnifiedTokenManagerV5 session={tokenSession} />
      <GmNpcCardEditorV7 session={session} />
    </div>
  );
}
