/* ============================================================
   CRYPTO UTILITIES (MeshVault Web Crypto Sandbox)
   ============================================================ */

async function generateKey() {
    return await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 }, 
        true, 
        ['encrypt', 'decrypt']
    );
}

async function encryptData(key, data) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv }, 
        key, 
        data
    );
    return { iv: Array.from(iv), data: encrypted };
}

async function decryptData(key, encryptedBuf, ivArr) {
    const iv = new Uint8Array(ivArr);
    return await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv }, 
        key, 
        encryptedBuf
    );
}

async function exportKeyJwk(key) {
    return await crypto.subtle.exportKey('jwk', key);
}

async function importKeyFromJwk(jwk) {
    return await crypto.subtle.importKey(
        'jwk', 
        jwk, 
        { name: 'AES-GCM', length: 256 }, 
        true, 
        ['encrypt', 'decrypt']
    );
}

function bufToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) {
        bin += String.fromCharCode(bytes[i]);
    }
    return btoa(bin);
}

function base64ToBuf(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i);
    }
    return bytes.buffer;
}/* ============================================================
   CRYPTO UTILITIES (MeshVault Web Crypto Sandbox)
   ============================================================ */

async function generateKey() {
    return await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 }, 
        true, 
        ['encrypt', 'decrypt']
    );
}

async function encryptData(key, data) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv }, 
        key, 
        data
    );
    return { iv: Array.from(iv), data: encrypted };
}

async function decryptData(key, encryptedBuf, ivArr) {
    const iv = new Uint8Array(ivArr);
    return await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv }, 
        key, 
        encryptedBuf
    );
}

async function exportKeyJwk(key) {
    return await crypto.subtle.exportKey('jwk', key);
}

async function importKeyFromJwk(jwk) {
    return await crypto.subtle.importKey(
        'jwk', 
        jwk, 
        { name: 'AES-GCM', length: 256 }, 
        true, 
        ['encrypt', 'decrypt']
    );
}

function bufToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) {
        bin += String.fromCharCode(bytes[i]);
    }
    return btoa(bin);
}

function base64ToBuf(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i);
    }
    return bytes.buffer;
}
