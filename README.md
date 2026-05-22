# MeshVault: The Ghost Web
Decentralized |Peer-to-Peer | Zero-Knowledge Browser Storage
MeshVault is a true Serverless P2P File Sharing platform 
that utilizes browser-to-browser communication (WebRTC). There is no 
central server—your browser is the server, and your hard drive is the 
cloud.

# ✨ Full Features
Zero-Server Architecture: Files are never uploaded to any cloud server (like Google Drive or Dropbox). Data moves directly between peers.
AES-256-GCM Encryption: Every file is 
encrypted browser-side before being uploaded. Without the unique key, no
 one can access it (not even the uploader, if the key is lost).
Intelligent Sharding: Large files are broken down into small 100KB chunks (shards) so as not to overload the network.
WebRTC Flow Control: Advanced "Backpressure" handling prevents the browser from crashing and supports large files (in GBs).
Real-time Network Visualization: A Canvas-based live dashboard that visualizes how your data is "gossiping" across the network.
IndexedDB Persistence: Shards are saved in the browser's permanent database, ensuring the data remains in the network even if the tab is closed.

# 🛠️ How It Works (The Tech Stack)
Signaling: PeerJS is used to handle the initial handshake.
Transport: Binary data is transferred via WebRTC DataChannels.
Storage: The browser's IndexedDB acts as a local data node.
Security: Military-grade encryption is applied using the Web Crypto API.

# 📖 How To Use (Full Guide)
1. Networking (Connect)
Open the website. You will receive a Unique Peer ID.
Click on the "Invite Link" and send the link to your friend.
As soon as your friend opens the link, a P2P Tunnel will be established between you two.
2. Upload & Distribute
Drag & Drop the file onto the dashboard.
MeshVault will automatically shard the file, encrypt it, and send it to all connected peers.
You can watch the particles fly across the screen (Real-time Transfer).
3. Synchronization & Download
Once the shards are distributed, the uploader can close their browser.
The other peer can click on the file from the dashboard to reassemble and download it.
The app will automatically fetch shards from all available peers and merge them to download the original file.

# ⚠️ Critical Warnings
[!WARNING]
Key Responsibility: Encryption keys are 
generated at the browser level. If you do not share the key or if you 
lose it, recovering the data is impossible.
Browser Limitations: This app works best 
on Brave, Chrome, and Firefox. Connection speeds might slow down on 
certain browsers (like Safari) due to their WebRTC policies.
HTTPS Requirement: WebRTC technology does
 not work without SSL (HTTPS). Always use HTTPS to host this app (GitHub
 Pages provides HTTPS automatically).

# 🏗️ Future Roadmap
[ ] Multi-hop Routing: Delivering data to peers who are not directly connected.
[ ] Magnet Links: Hash-based links for file recovery.
[ ] Mobile Optimization: P2P file sharing on the go.

# 📜 License
MIT License - Feel free to fork and build the future of the decentralized web.
Developed with 💻 by Ayush Azad(👑 DIGITAL KING)
