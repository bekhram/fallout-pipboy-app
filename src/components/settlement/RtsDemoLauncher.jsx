import React from 'react';
import RtsDemoGame from './RtsDemoGame.jsx';

export default function RtsDemoLauncher({ onExit }) {
  return <RtsDemoGame onExit={onExit} />;
}
