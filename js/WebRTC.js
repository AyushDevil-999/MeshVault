function initPeerJS() {
    try { peer = new Peer(); } catch (e) { updateP2PStatus('error', 'PeerJS Init Engine Halted'); return; }
    peer.on('open', (id) => {
        myLocalPeerId = id; p2pReady = true;
        updateP2PStatus('connected', 'Secure P2P Signaling Node Live');
        document.getElementById('peer-id-row').style.display = 'flex';
        document.getElementById('my-peer-id').textContent = id;
        log(`Swarm Local Node Activated. P2P Signaller: ${id}`, 'p2p');
        const joinId = new URLSearchParams(window.location.search).get('join');
        if (joinId && joinId !== id) connectToRemotePeer(joinId);
    });
    peer.on('connection', (conn) => setupPeerEvents(conn));
    peer.on('error', (err) => {
        log(`Signaling Server Exception: ${err.type}`, 'error');
        if (err.type === 'peer-not-found') showToast('Handshake rejected: Hash not found', 'error');
    });
}
function connectToRemotePeer(remoteId) {
    if (!p2pReady || !remoteId) return; const cleanId = remoteId.trim();
    if (cleanId === myLocalPeerId || activeConnections.some(c => c.peerId === cleanId)) return;
    log(`Spawning WebRTC DataChannel to: ${cleanId}...`, 'p2p');
    const conn = peer.connect(cleanId, { reliable: true }); setupPeerEvents(conn);
}
function setupPeerEvents(conn) {
    conn.on('open', () => {
        const rNode = createNode(Math.random() * canvasW, Math.random() * canvasH, { remotePeerId: conn.peer, isLocal: false });
        activeConnections.push({ peerId: conn.peer, conn: conn, nodeId: rNode.id, shardsSent: 0 });
        addConnection(localNodeId, rNode.id, true);
        log(`P2P Edge Tunnel encrypted with: ${conn.peer}`, 'success');
        showToast('Mesh Matrix Expanded: Node Linked', 'p2p');
        updateP2PStatus('connected', 'Distributed Swarm Mesh Node');
        updateConnectionList(); updateStats();
    });
    conn.on('data', async (data) => {
        if (data.type === 'SHARD_TRANSFER') await handleReceivedShard(data);
    });
    conn.on('close', () => {
        log(`P2P link closed by remote node: ${conn.peer}`, 'warn');
        const idx = activeConnections.findIndex(c => c.peerId === conn.peer);
        if (idx !== -1) { removeNode(activeConnections[idx].nodeId); activeConnections.splice(idx, 1); }
        updateConnectionList();
    });
}
