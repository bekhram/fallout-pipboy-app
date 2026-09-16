import React, { useState } from "react";
import { buildSessionShareUrl } from "../../utils/sessionShare.js";

export default function GmSessionShareBar({ session }) {
  const [copied, setCopied] = useState(false);

  if (session?.mode !== "host" || !session?.sessionCode) return null;

  const shareUrl = buildSessionShareUrl(session.sessionCode);

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const shareLink = async () => {
    if (!shareUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Pip-2D20",
          text: `Join Pip-2D20 session ${session.sessionCode}`,
          url: shareUrl,
        });
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }
    await copyLink();
  };

  return (
    <section className="pip-panel pip-block" style={{ marginBottom: 8 }}>
      <div className="pip-head">
        <h2>[ SESSION LINK ]</h2>
        <strong>{session.sessionCode}</strong>
      </div>
      <div className="pip-actions-inline">
        <button type="button" className="pip-btn is-primary" onClick={shareLink}>
          SHARE LINK
        </button>
        <button type="button" className="pip-btn" onClick={copyLink}>
          {copied ? "LINK COPIED" : "COPY LINK"}
        </button>
      </div>
    </section>
  );
}
