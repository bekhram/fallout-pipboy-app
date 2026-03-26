import React from "react";
import TopNav from "./TopNav.jsx";

export default function PipboyShell({ activeTab, onTabChange, onToggleMenu, children }) {
  return (
    <div className="pip-app">
      <div className="pip-vignette" />
      <div className="pip-container">
        <TopNav activeTab={activeTab} onTabChange={onTabChange} onToggleMenu={onToggleMenu} />
        <main className="pip-main">{children}</main>
      </div>
    </div>
  );
}
