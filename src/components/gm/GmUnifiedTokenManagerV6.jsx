import React from "react";
import GmUnifiedTokenManagerV5 from "./GmUnifiedTokenManagerV5.jsx";
import GmNpcCardEditorV6 from "./GmNpcCardEditorV6.jsx";

export default function GmUnifiedTokenManagerV6({ session }) {
  return (
    <div className="gm-unified-token-manager-v6">
      <GmUnifiedTokenManagerV5 session={session} />
      <GmNpcCardEditorV6 session={session} />
    </div>
  );
}
