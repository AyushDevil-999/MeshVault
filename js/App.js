/* ============================================================
   MAIN CONTROLLER, CORE INDEXED-DB & CANVAS ENGINE (MeshVault)
   ============================================================ */

let nodeIdCounter = 0;
let nodes = [];
let connections = [];
let dhtEntries = [];
let uploadedFiles = {};
let selectedNodeId = null;
let db = null;
let canvasW = 0, canvasH = 0;

/* P2P Globally Accessed Registries */
let peer = null;
let myLocalPeerId = null;
let localNodeId = null;
let activeConnections = [];
let meshReassembler = {};
let p2pReady = false;

// Initialize System Storage Core
async function initDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open('MeshVaultDB', 1);
        req.onupgradeneeded = e => {
            const d = e.target.result;
            if (!d.objectStoreNames.contains('shards')) d.createObjectStore('shards', { keyPath: 'shardId' });
        };
        req.onsuccess = e => { db = e.target.result; resolve(db); };
        req.onerror = e => reject(e.target.error);
    });
}

async function dbPut(r) {
    return new Promise((res, rej) => {
        const tx = db.transaction('shards', 'readwrite');
        tx.objectStore('shards').put(r);
        tx.oncomplete = () => res(); tx.onerror = e => rej(e.target.error);
    });
}

async function dbGet(sid) {
    return new Promise((res, rej) => {
        const tx = db.transaction('shards', 'readonly');
        const req = tx.objectStore('shards').get(sid);
        req.onsuccess = () => res(req.result); req.onerror = e => rej(e.target.error);
    });
}

function log(msg, type = 'default') {
    const container = document.getElementById('log-entries');
    if (!container) return;
    const time = new Date().toTimeString().split(' ')[0];
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    entry.innerHTML = `<span class="ts">[${time}]</span><span class="msg">${msg}</span>`;
    container.appendChild(entry);
    container.scrollTop = container.scrollHeight;
}

function showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    let icon = type === 'success' ? 'fa-check-circle' : type === 'warn' ? 'fa-exclamation-triangle' : type === 'error' ? 'fa-times-circle' : type === 'p2p' ? 'fa-network-wired' : 'fa-info-circle';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i><span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.animation = 'slideOut 0.3s ease forwards'; setTimeout(() => toast.remove(), 300); }, 4000);
}

function updateP2PStatus(state, text) {
    const statusDiv = document.getElementById('p2p-status');
    if (!statusDiv) return;
    const dot = statusDiv.querySelector('.dot');
    const span = statusDiv.querySelector('span');
    span.textContent = text;
    dot.style.background = state === 'connected' ? 'var(--accent)' : state === 'error' ? 'var(--danger)' : 'var(--secondary)';
}

function updateConnectionList() {
    const list = document.getElementById('connections-list');
    const empty = document.getElementById('connections-empty');
    list.innerHTML = '';
    if (activeConnections.length === 0) { empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    activeConnections.forEach(c => {
        const item = document.createElement('div');
        item.className = 'conn-item';
        item.innerHTML = `<div><span class="name">Node-${c.peerId.slice(0, 6)}</span><span class="meta"> (P2P Channel)</span></div><span style="color:var(--text-muted);font-size:9px">${c.shardsSent || 0} chunks</span>`;
        list.appendChild(item);
    });
}

function updateStats() {
    document.getElementById('stat-nodes').textContent = nodes.filter(n => n.status === 'online').length;
    document.getElementById('stat-shards').textContent = dhtEntries.length;
    let totalBytes = dhtEntries.reduce((acc, curr) => acc + curr.size, 0);
    document.getElementById('stat-size').textContent = formatBytes(totalBytes);
    document.getElementById('stat-health').textContent = nodes.length > 1 ? '100%' : 'Autonomous';
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024; const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showProgress(show) { document.getElementById('upload-progress').style.display = show ? 'block' : 'none'; }
function setProgress(pct, label) {
    document.getElementById('progress-pct').textContent = `${Math.round(pct)}%`;
    document.getElementById('progress-fill').style.width = `${pct}%`;
    document.getElementById('progress-label').textContent = label;
}

function addFileToList(fileId, name, size, shards, isP2P) {
    const list = document.getElementById('file-list');
    const fileRow = document.createElement('div');
    fileRow.className = 'p-2 bg-[#131b27] border border-[#1a2535] rounded mb-2 flex items-center justify-between text-xs';
    fileRow.innerHTML = `<div><p class="font-medium truncate max-w-[200px]">${name}</p><p class="text-[10px] text-[#4e6278]">${isP2P ? 'Swarm Sync' : formatBytes(size)} • ${shards} shards</p></div><button class="btn btn-accent btn-xs" onclick="${isP2P ? `showToast('Syncing swarm shards...', 'info')` : `reconstructLocalFile('${fileId}')`}"><i class="fa-solid fa-download"></i> Get</button>`;
    list.appendChild(fileRow);
}

function updateDHTTable() {
    const wrap = document.getElementById('dht-table-wrap');
    const empty = document.getElementById('dht-empty');
    const tbody = document.getElementById('dht-tbody');
    tbody.innerHTML = '';
    if (dhtEntries.length === 0) { wrap.style.display = 'none'; empty.style.display = 'block'; return; }
    empty.style.display = 'none'; wrap.style.display = 'block';
    dhtEntries.forEach(e => {
        const tr = document.createElement('tr');
        const badgeHTML = e.hostingNodes.map(nid => { const n = getNode(nid); return `<span class="node-badge" style="background:${hexToRgba(n ? n.color : '#fff', 0.15)};color:${n ? n.color : '#fff'}">${n ? n.name : 'Unknown'}</span>`; }).join('');
        tr.innerHTML = `<td><span style="color:${e.color}">■</span> ${e.shardId.split('-s')[1]}</td><td class="truncate max-w-[100px]">${e.fileName}</td><td>${badgeHTML}</td><td class="status-healthy">Encrypted</td>`;
        tbody.appendChild(tr);
    });
}

function createNode(x, y, opts = {}) {
    const id = nodeIdCounter++;
    const isLocal = opts.isLocal || false;
    const isRemote = opts.remotePeerId != null;
    let name = isLocal ? 'You' : isRemote ? 'Peer-' + opts.remotePeerId.slice(0, 5) : NODE_NAMES[id % NODE_NAMES.length];
    const node = { id, name, x, y, status: 'online', shards: [], capacity: isLocal ? 5000 : (500 + Math.floor(Math.random() * 1500)), color: isLocal ? '#ffffff' : isRemote ? '#00d4ff' : NODE_COLORS[id % NODE_COLORS.length], radius: isLocal ? 26 : 22, pulseTime: 0, isLocal, isRemote, remotePeerId: opts.remotePeerId || null };
    nodes.push(node);
    if (isLocal) localNodeId = id;
    if (!isLocal && nodes.length > 1) {
        const others = nodes.filter(n => n.id !== id && n.status !== 'offline');
        const count = Math.min(others.length, isRemote ? 3 : 2);
        for (let i = 0; i < count; i++) addConnection(id, others[i].id);
    }
    if (!isLocal) log(`Peer "${name}" connected to cluster topology.`, 'success');
    updateStats();
    return node;
}

function addConnection(a, b, isP2P = false) {
    if (a === b) return;
    if (!connections.some(c => (c[0] === a && c[1] === b) || (c[0] === b && c[1] === a))) connections.push([a, b, isP2P]);
}

function getNode(id) { return nodes.find(n => n.id === id); }
function getOnlineNodes() { return nodes.filter(n => n.status !== 'offline'); }

function removeNode(id) {
    const node = getNode(id); if (!node || node.isLocal) return;
    connections = connections.filter(c => c[0] !== id && c[1] !== id);
    dhtEntries.forEach(e => { e.hostingNodes = e.hostingNodes.filter(nid => nid !== id); });
    nodes = nodes.filter(n => n.id !== id);
    log(`Peer "${node.name}" split from network matrix`, 'warn');
    updateStats(); updateDHTTable();
}

async function processAndSendFile(file) {
    const fileId = 'fv_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const key = await generateKey();
    let keyJwk = await exportKeyJwk(key);
    uploadedFiles[fileId] = { name: file.name, size: file.size, shardCount: 0, key };
    showProgress(true); setProgress(10, 'Processing...');
    const buffer = await file.arrayBuffer();
    const shardCount = Math.ceil(buffer.byteLength / SHARD_SIZE);
    uploadedFiles[fileId].shardCount = shardCount;
    const onlineNodes = getOnlineNodes();
    for (let i = 0; i < shardCount; i++) {
        const start = i * SHARD_SIZE; const end = Math.min(start + SHARD_SIZE, buffer.byteLength);
        const shardId = `${fileId}-s${String(i).padStart(3, '0')}`; const color = hslToHex((i / shardCount) * 330 + 15, 80, 60);
        setProgress(20 + (i / shardCount) * 60, `Sharding Layer ${i+1}...`);
        const { iv, data: encryptedData } = await encryptData(key, buffer.slice(start, end));
        await dbPut({ shardId, fileId, fileName: file.name, index: i, encryptedData, iv, size: encryptedData.byteLength });
        const hostingNodes = []; const shuffled = [...onlineNodes].sort(() => Math.random() - 0.5);
        for (let r = 0; r < REDUNDANCY && r < shuffled.length; r++) {
            const target = shuffled[r]; hostingNodes.push(target.id);
            if (!target.shards.includes(shardId)) { target.shards.push(shardId); target.pulseTime = 25; }
        }
        dhtEntries.push({ shardId, fileId, fileName: file.name, index: i, size: encryptedData.byteLength, hostingNodes, color });
        if (activeConnections.length > 0) {
            const dataB64 = bufToBase64(encryptedData);
            activeConnections.forEach(ac => { if (ac.conn.open) ac.conn.send({ type: 'SHARD_TRANSFER', fileId, fileName: file.name, index: i, total: shardCount, dataB64, iv, color, senderPeerId: myLocalPeerId, keyJwk }); });
        }
    }
    setProgress(100, 'Complete'); log(`Distributed matrix upload complete for: ${file.name}`, 'success');
    updateStats(); updateDHTTable(); addFileToList(fileId, file.name, file.size, shardCount, false);
    setTimeout(() => showProgress(false), 1200);
}

async function reconstructLocalFile(fileId) {
    const info = uploadedFiles[fileId]; if (!info) return;
    const shards = dhtEntries.filter(e => e.fileId === fileId).sort((a, b) => a.index - b.index);
    const parts = [];
    for (let i = 0; i < shards.length; i++) {
        const rec = await dbGet(shards[i].shardId);
        parts.push(await decryptData(info.key, rec.encryptedData, rec.iv));
    }
    triggerDownload(new Blob(parts), info.name);
}

async function handleReceivedShard(payload) {
    if (payload.senderPeerId === myLocalPeerId) return;
    const { fileId, index, total, dataB64, fileName, iv, keyJwk, color } = payload;
    if (!meshReassembler[fileId]) {
        meshReassembler[fileId] = { chunks: new Array(total), receivedCount: 0, metadata: { fileName, keyJwk, total, color } };
        addFileToList(fileId, fileName, 0, total, true);
    }
    if (meshReassembler[fileId].chunks[index]) return;
    meshReassembler[fileId].chunks[index] = { dataB64, iv };
    meshReassembler[fileId].receivedCount++;
    if (meshReassembler[fileId].receivedCount === total) {
        const fd = meshReassembler[fileId]; const key = await importKeyFromJwk(fd.metadata.keyJwk); const buffers = [];
        for (let i = 0; i < fd.chunks.length; i++) buffers.push(await decryptData(key, base64ToBuf(fd.chunks[i].dataB64), fd.chunks[i].iv));
        triggerDownload(new Blob(buffers), 'MeshVault_' + fd.metadata.fileName);
        delete meshReassembler[fileId];
    }
}

function initCanvasSystem() {
    const canvas = document.getElementById('net-canvas'); const ctx = canvas.getContext('2d');
    function resize() { const box = canvas.parentElement.getBoundingClientRect(); canvasW = canvas.width = box.width; canvasH = canvas.height = box.height; }
    window.addEventListener('resize', resize); resize();
    createNode(canvasW / 2, canvasH / 2, { isLocal: true });
    for (let i = 0; i < 5; i++) createNode(Math.random() * canvasW, Math.random() * canvasH);
    function draw() {
        ctx.clearRect(0, 0, canvasW, canvasH);
        connections.forEach(c => {
            const n1 = getNode(c[0]); const n2 = getNode(c[1]);
            if (n1 && n2 && n1.status !== 'offline' && n2.status !== 'offline') {
                ctx.beginPath(); ctx.moveTo(n1.x, n1.y); ctx.lineTo(n2.x, n2.y);
                ctx.strokeStyle = c[2] ? 'rgba(0,214,255,0.25)' : '#1a2535'; ctx.stroke();
            }
        });
        nodes.forEach(n => {
            if (n.status === 'offline') return;
            if (n.pulseTime > 0) { ctx.beginPath(); ctx.arc(n.x, n.y, n.radius + (25 - n.pulseTime), 0, Math.PI * 2); ctx.fillStyle = hexToRgba(n.color, n.pulseTime / 50); ctx.fill(); n.pulseTime--; }
            ctx.beginPath(); ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2); ctx.fillStyle = n.isLocal ? '#ffffff' : n.color; ctx.fill();
            ctx.fillStyle = '#080c12'; ctx.font = '10px Space Grotesk'; ctx.textAlign = 'center'; ctx.fillText(n.name.slice(0, 5), n.x, n.y + 3);
        });
        requestAnimationFrame(draw);
    }
    draw();
}

function hslToHex(h, s, l) { s /= 100; l /= 100; const a = s * Math.min(l, 1 - l); const f = n => { const k = (n + h / 30) % 12; return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1); }; return '#' + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join(''); }
function hexToRgba(hex, alpha) { const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16); return `rgba(${r},${g},${b},${alpha})`; }

document.addEventListener('DOMContentLoaded', async () => {
    await initDB(); log('Encrypted sandbox storage engine allocated.', 'info');
    initCanvasSystem(); initPeerJS();
    document.querySelectorAll('.panel-header').forEach(h => h.addEventListener('click', () => { const b = document.getElementById(h.getAttribute('data-toggle')); b.classList.toggle('hidden'); h.classList.toggle('collapsed'); }));
    const dz = document.getElementById('drop-zone'); const fi = document.getElementById('file-input');
    dz.addEventListener('click', () => fi.click()); fi.addEventListener('change', e => { if (e.target.files.length > 0) processAndSendFile(e.target.files[0]); });
    document.getElementById('btn-add-node').addEventListener('click', () => createNode(Math.random() * canvasW, Math.random() * canvasH));
    document.getElementById('btn-connect-manual').addEventListener('click', () => { const i = document.getElementById('connect-input'); connectToRemotePeer(i.value); i.value = ''; });
    document.getElementById('btn-copy-link').addEventListener('click', () => { if (!myLocalPeerId) return; const u = `${window.location.origin}${window.location.pathname}?join=${myLocalPeerId}`; navigator.clipboard.writeText(u); showToast('Swarm token sync string copied!', 'success'); });
});
