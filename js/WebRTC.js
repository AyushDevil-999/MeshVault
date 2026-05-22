/* ============================================================
   WEBRTC P2P ORCHESTRATION (MeshVault Signaling & Mesh)
   ============================================================ */

function initPeerJS() {
    try {
        peer = new Peer();
    } catch (e) {
        updateP2PStatus('error', 'PeerJS Init Engine Halted');
        return;
    }

    peer.on('open', (id) => {
        myLocalPeerId = id;
        p2pReady = true;
        updateP2PStatus('connected', 'Secure P2P Signaling Node Live');
        document.getElementById('peer-id-row').style.display = 'flex';
        document.getElementById('my-peer-id').textContent = id;
        log(`Swarm Local Node Activated. P2P Signaller Allocated: ${id}`, 'p2p');

        const joinId = new URLSearchParams(window.location.search).get('join');
        if (joinId && joinId !== id) {
            log(`Intercepted invite handshake protocol for remote node: ${joinId}`, 'p2p');
            connectToRemotePeer(joinId);
        }
    });

    peer.on('connection', (conn) => {
        setupPeerEvents(conn);
    });

    peer.on('error', (err) => {
        log(`Signaling Server Exception: ${err.type}`, 'error');
        if (err.type === 'peer-not-found') showToast('Handshake rejected: Node hash not found', 'error');
    });
}

function connectToRemotePeer(remoteId) {
    if (!p2pReady || !remoteId) return;
    const cleanId = remoteId.trim();
    if (cleanId === myLocalPeerId) return;

    if (activeConnections.some(c => c.peerId === cleanId)) {
        showToast('Duplicate mesh link detected', 'warn');
        return;
    }

    log(`Spawning WebRTC RTCDataChannel tunnel to segment: ${cleanId}...`, 'p2p');
    const conn = peer.connect(cleanId, { reliable: true });
    setupPeerEvents(conn);
}

function setupPeerEvents(conn) {
    conn.on('open', () => {
        const rNode = createNode(Math.random() * canvasW, Math.random() * canvasH, { remotePeerId: conn.peer, isLocal: false });
        activeConnections.push({ peerId: conn.peer, conn: conn, nodeId: rNode.id, shardsSent: 0 });
        
        addConnection(localNodeId, rNode.id, true);
        
        log(`P2P Edge Tunnel successfully encrypted. Remote Peer: ${conn.peer}`, 'success');
        showToast('Mesh Matrix Expanded: Node Linked', 'p2p');
        
        updateP2PStatus('connected', 'Distributed Swarm Mesh Node');
        updateConnectionList();
        updateStats();
    });

    conn.on('data', async (data) => {
        if (data.type === 'SHARD_TRANSFER') {
            await handleReceivedShard(data);
        } else if (data.type === 'NEW_FILE_METADATA') {
            log(`Discovered foreign meta payload catalogued for: ${data.fileName}`, 'info');
        }
    });

    conn.on('close', () => {
        log(`P2P link closed by remote node: ${conn.peer}`, 'warn');
        const index = activeConnections.findIndex(c => c.peerId === conn.peer);
        if (index !== -1) {
            const cid = activeConnections[index].nodeId;
            activeConnections.splice(index, 1);
            removeNode(cid);
        }
        updateConnectionList();
    });
}
