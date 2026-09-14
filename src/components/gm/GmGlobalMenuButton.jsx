import React, { useState } from "react";
import SideMenu from "../shared/SideMenu.jsx";
import "./gmGlobalMenuButton.css";

export default function GmGlobalMenuButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="gm-global-menu-button pip-icon-btn pip-icon-btn-menu"
        aria-label="Open menu"
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
      />
    </>
  );
}
