import React, { useState } from "react";
import SideMenu from "../shared/SideMenu.jsx";
import "../gm/gmGlobalMenuButton.css";
import "./sessionActionsMenu.css";

export default function SessionActionsMenu({
  mode,
  session,
  onBack,
  onOpenSheet,
  labels = {},
}) {
  const [open, setOpen] = useState(false);
  const actions = [
    {
      key: "open-character",
      label: labels.openSheet || "OPEN CHARACTER",
      onClick: onOpenSheet,
    },
    {
      key: "session-end",
      label: mode === "host" ? (labels.end || "END SESSION") : (labels.leave || "LEAVE SESSION"),
      onClick: () => session?.exitSession?.(),
      danger: true,
    },
    {
      key: "back",
      label: labels.back || "BACK",
      onClick: onBack,
    },
  ].filter((action) => typeof action.onClick === "function");

  return (
    <>
      <button
        type="button"
        className="gm-global-menu-button session-actions-menu-button pip-icon-btn pip-icon-btn-menu"
        aria-label="Open session menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span />
        <span />
        <span />
      </button>
      <SideMenu
        open={open}
        onClose={() => setOpen(false)}
        languageOnly
        extraActions={actions}
      />
    </>
  );
}
