import React from "react";

// Legacy compatibility shim. Tactical GM sessions no longer read or transmit
// the character's global travel-map position.
export default function SessionMapPositionSync() {
  return null;
}
