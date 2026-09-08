import React, { useMemo } from "react";
import GmUnifiedTokenManagerV5 from "./GmUnifiedTokenManagerV5.jsx";
import GmNpcCardEditorV8 from "./GmNpcCardEditorV8.jsx";

export default function GmUnifiedTokenManagerV8({ session }) {
  const tokenSession = useMemo(() => {
    if (!session) return session;
    return {
      ...session,
      liveSceneId: session.liveSceneId || session.tacticalScene?.sceneId || "",
    };
  }, [session]);

  return (
    <div className="gm-unified-token-manager-v8">
      <GmUnifiedTokenManagerV5 session={tokenSession} />
      <GmNpcCardEditorV8 session={session} />
    </div>
  );
}
