from pathlib import Path

path = Path('src/hooks/useSharedSession.js')
text = path.read_text()

needle = 'const MAX_QUEUED_EVENTS = 40;\n'
insert = '''const MAX_QUEUED_EVENTS = 40;\nconst DATA_CHANNEL_OPEN_TIMEOUT_MS = 15000;\n\n// PeerJS Cloud handles signalling. TURN gives WebRTC a relay path when two\n// devices cannot connect directly through mobile CGNAT / restrictive NAT.\nconst PEER_OPTIONS = {\n  debug: 1,\n  pingInterval: 5000,\n  config: {\n    iceCandidatePoolSize: 4,\n    iceServers: [\n      { urls: [\n        "stun:stun.l.google.com:19302",\n        "stun:stun1.l.google.com:19302",\n        "stun:stun.relay.metered.ca:80",\n      ] },\n      {\n        urls: "turn:openrelay.metered.ca:80",\n        username: "openrelayproject",\n        credential: "openrelayproject",\n      },\n      {\n        urls: "turn:openrelay.metered.ca:443",\n        username: "openrelayproject",\n        credential: "openrelayproject",\n      },\n      {\n        urls: "turn:openrelay.metered.ca:443?transport=tcp",\n        username: "openrelayproject",\n        credential: "openrelayproject",\n      },\n    ],\n    sdpSemantics: "unified-plan",\n  },\n};\n'''
if needle not in text:
    raise SystemExit('constants anchor not found')
text = text.replace(needle, insert, 1)

text = text.replace(
    'new Peer(getHostPeerId(codeRef.current), { debug: 1, pingInterval: 5000 })',
    'new Peer(getHostPeerId(codeRef.current), PEER_OPTIONS)',
)
text = text.replace(
    'new Peer(getPlayerPeerId(playerClientIdRef.current), { debug: 1, pingInterval: 5000 })',
    'new Peer(getPlayerPeerId(playerClientIdRef.current), PEER_OPTIONS)',
)

anchor = '''      const connection = peer.connect(getHostPeerId(codeRef.current), { reliable: true, serialization: "json" });\n      hostConnectionRef.current = connection;\n\n      connection.on("open", () => {\n'''
replacement = '''      const connection = peer.connect(getHostPeerId(codeRef.current), { reliable: true, serialization: "json" });\n      hostConnectionRef.current = connection;\n\n      const openTimeout = window.setTimeout(() => {\n        if (connection.open || generation !== networkGenerationRef.current || desiredModeRef.current !== "player") return;\n        setError({ key: "networkError", message: "WebRTC connection timed out. Retrying through relay..." });\n        safeClose(connection);\n        scheduleReconnect();\n      }, DATA_CHANNEL_OPEN_TIMEOUT_MS);\n\n      connection.on("open", () => {\n        window.clearTimeout(openTimeout);\n'''
if anchor not in text:
    raise SystemExit('player connection anchor not found')
text = text.replace(anchor, replacement, 1)

anchor2 = '''      const handleClosed = () => {\n        if (generation !== networkGenerationRef.current || desiredModeRef.current !== "player") return;\n        stopHeartbeat();\n'''
replacement2 = '''      const handleClosed = () => {\n        window.clearTimeout(openTimeout);\n        if (generation !== networkGenerationRef.current || desiredModeRef.current !== "player") return;\n        stopHeartbeat();\n'''
if anchor2 not in text:
    raise SystemExit('close handler anchor not found')
text = text.replace(anchor2, replacement2, 1)

path.write_text(text)
