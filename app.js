import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, set, onValue, push, onChildAdded, onDisconnect, get } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

// 🛑 ඔයාගේ FIREBASE CONFIG 🛑
const firebaseConfig = {
    apiKey: "AIzaSyDpK3gJkai7LtAT35h5XjX1CysTIkDh1X4",
    authDomain: "minigames-4d677.firebaseapp.com",
    databaseURL: "https://minigames-4d677-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "minigames-4d677",
    storageBucket: "minigames-4d677.firebasestorage.app",
    messagingSenderId: "632455789288",
    appId: "1:632455789288:web:6f223e611ef575c65ca75d",
    measurementId: "G-6RFBRJ09B3"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let gameId = Math.floor(10000 + Math.random() * 90000).toString();
let isHost = true;

const screens = ['screen-connect', 'screen-lobby', 'screen-pictionary', 'screen-battleship-setup', 'screen-battleship-play', 'screen-quiz', 'screen-memory', 'screen-guess', 'screen-tictactoe'];

function showScreen(id) { 
    screens.forEach(s => document.getElementById(s).classList.add('hidden')); 
    document.getElementById(id).classList.remove('hidden'); 
}

window.showToast = function(msg) { 
    const t = document.getElementById('toast'); 
    t.innerText = msg; 
    t.classList.add('show'); 
    setTimeout(() => t.classList.remove('show'), 3500); 
}

// Host initialization
document.getElementById('my-id').innerText = gameId;
document.getElementById('conn-status').innerText = '✔️ Server Ready (Firebase)';
document.getElementById('conn-status').style.color = 'green';

const statusRef = ref(db, `games/${gameId}/status`);
const gameRef = ref(db, `games/${gameId}`);

set(statusRef, 'waiting');
onDisconnect(gameRef).remove(); 

onValue(statusRef, snap => {
    if(isHost && snap.val() === 'connected') {
        showScreen('screen-lobby');
        window.showToast('🥰 පාට්නර් එකතු වුණා!');
        setupDataHandler();
    }
});

window.joinGame = function() {
    const enteredId = document.getElementById('join-id').value.trim();
    if(!enteredId || enteredId.length !== 5) return window.showToast('කරුණාකර ඉලක්කම් 5ක කෝඩ් එකක් දෙන්න!');
    if(enteredId === gameId) return window.showToast('ඔයාගේ කෝඩ් එකටම සම්බන්ධ වෙන්න බැහැ!');

    window.showToast('සම්බන්ධ වෙමින් පවතී... (Please wait)');
    const btn = document.getElementById('join-btn');
    btn.innerText = 'Connecting...'; 
    btn.disabled = true;

    const guestStatusRef = ref(db, `games/${enteredId}/status`);
    get(guestStatusRef).then(snap => {
        if (snap.exists() && snap.val() === 'waiting') {
            isHost = false;
            gameId = enteredId;
            
            set(guestStatusRef, 'connected');
            onDisconnect(guestStatusRef).set('disconnected');
            
            showScreen('screen-lobby');
            document.getElementById('lobby-content').innerHTML = '<h3>🥰 පාට්නර් ගේම් එකක් තෝරනකන් ඉන්න...</h3>';
            window.showToast('සාර්ථකව එකතු වුණා!');
            setupDataHandler();
        } else {
            window.showToast('කෝඩ් එක වැරදියි හෝ පාට්නර් ගේම් එකේ නැහැ!');
            btn.innerText = 'Join Game'; 
            btn.disabled = false;
        }
    }).catch(error => {
        window.showToast('Network error එකක්! අන්තර්ජාලය පරීක්ෂා කරන්න.');
        btn.innerText = 'Join Game'; 
        btn.disabled = false;
    });
}

function sendData(data) {
    const messagesRef = ref(db, `games/${gameId}/messages`);
    push(messagesRef, {
        data: data,
        sender: isHost ? 'host' : 'guest'
    });
}

function setupDataHandler() {
    const messagesRef = ref(db, `games/${gameId}/messages`);
    onChildAdded(messagesRef, snap => {
        const msg = snap.val();
        if (!msg) return;
        if (msg.sender === (isHost ? 'host' : 'guest')) return; 

        const data = msg.data;
        if(data.type === 'go-lobby') showScreen('screen-lobby');
        else if(data.type === 'start-pic') initPictionary();
        else if(data.type === 'draw') drawLine(data.x0, data.y0, data.x1, data.y1, data.color, false);
        else if(data.type === 'clear-pic') ctx.clearRect(0, 0, canvas.width, canvas.height);
        else if(data.type === 'start-battle') { if(!isHost) initBattleshipGuest(); }
        else if(data.type === 'battle-ready') { battleData = data.data; initBattleshipPlayGrid(); }
        else if(data.type === 'battle-click') processBattleClick(data.index);
        else if(data.type === 'start-quiz') initQuiz(data.qIndex);
        else if(data.type === 'quiz-ans') { partnerQuizAns = data.ans; checkQuizResults(); }
        else if(data.type === 'start-memory') { if(!isHost) initMemoryMatch(data.board); }
        else if(data.type === 'memory-flip') processMemoryFlip(data.index);
        
        // Guess the Number
        else if(data.type === 'start-guess-setup') { if(!isHost) window.openGuessGuestWaiting(); }
        else if(data.type === 'guess-range') { initPickSecret(data.max); }
        else if(data.type === 'guess-secret') { partnerSecret = data.secret; checkBothSecrets(); }
        else if(data.type === 'guess-try') { processPartnerGuess(data.guess); }
        else if(data.type === 'guess-win') { handleWin(isHost ? 'guest' : 'host'); }

        // Tic Tac Toe
        else if(data.type === 'start-ttt') { if(!isHost) initTicTacToe(); }
        else if(data.type === 'ttt-move') { processTttMove(data.index); }
        else if(data.type === 'ttt-ready') {
            if(isHost) tttGuestReady = true; else tttHostReady = true;
            checkTttRestart();
        }
    });

    const activeStatusRef = ref(db, `games/${gameId}/status`);
    onValue(activeStatusRef, snap => {
        if(!snap.exists() || snap.val() === 'disconnected') {
            alert("පාට්නර් ගේම් එකෙන් අයින් වුණා! කරුණාකර page එක Refresh කරන්න.");
            location.reload();
        }
    });
}

window.goLobby = function() { showScreen('screen-lobby'); sendData({type: 'go-lobby'}); }

// --- 6. Tic Tac Toe (❤️ & ❌) ---
let tttBoard = Array(9).fill(null);
let tttTurn = 'host';
let tttGameOver = false;
let tttHostReady = false;
let tttGuestReady = false;

const winPatterns = [
    [0,1,2], [3,4,5], [6,7,8], // rows
    [0,3,6], [1,4,7], [2,5,8], // cols
    [0,4,8], [2,4,6]           // diagonals
];

window.startTicTacToe = function() {
    sendData({type: 'start-ttt'});
    initTicTacToe();
}

function initTicTacToe() {
    tttBoard = Array(9).fill(null);
    tttTurn = 'host'; 
    tttGameOver = false;
    tttHostReady = false;
    tttGuestReady = false;
    
    showScreen('screen-tictactoe');
    document.getElementById('ttt-result-box').classList.add('hidden');
    document.getElementById('ttt-wait-text').classList.add('hidden');
    document.getElementById('btn-ttt-yes').disabled = false;
    document.getElementById('btn-ttt-home').classList.add('hidden');
    
    const grid = document.getElementById('ttt-grid');
    grid.innerHTML = '';
    for(let i=0; i<9; i++) {
        let cell = document.createElement('div');
        cell.className = 'ttt-cell';
        cell.id = `ttt-cell-${i}`;
        cell.onclick = () => handleTttClick(i);
        grid.appendChild(cell);
    }
    updateTttUI();
}

function handleTttClick(i) {
    if(tttGameOver || tttBoard[i] !== null) return;
    let amI = isHost ? 'host' : 'guest';
    if(tttTurn !== amI) return window.showToast("දැන් එයාගේ වාරේ!");
    
    sendData({type: 'ttt-move', index: i});
    processTttMove(i);
}

function processTttMove(i) {
    tttBoard[i] = tttTurn; 
    let cell = document.getElementById(`ttt-cell-${i}`);
    cell.innerText = tttTurn === 'host' ? '❌' : '❤️';
    cell.classList.add('taken');
    
    if (checkTttWin(tttTurn)) {
        tttGameOver = true;
        handleTttEnd(tttTurn === (isHost ? 'host' : 'guest') ? 'win' : 'lose', tttTurn);
    } else if (!tttBoard.includes(null)) {
        tttGameOver = true;
        handleTttEnd('draw', null);
    } else {
        tttTurn = tttTurn === 'host' ? 'guest' : 'host';
        updateTttUI();
    }
}

function checkTttWin(player) {
    for(let pattern of winPatterns) {
        const [a,b,c] = pattern;
        if(tttBoard[a] === player && tttBoard[b] === player && tttBoard[c] === player) {
            document.getElementById(`ttt-cell-${a}`).classList.add('win-cell');
            document.getElementById(`ttt-cell-${b}`).classList.add('win-cell');
            document.getElementById(`ttt-cell-${c}`).classList.add('win-cell');
            return true;
        }
    }
    return false;
}

function handleTttEnd(result, winner) {
    let text = "";
    if(result === 'win') text = "🎉 සුපිරි! ඔයා දිනුම්!";
    else if(result === 'lose') text = "😢 අඩේ! එයා දිනුම්!";
    else text = "🤝 තරඟය සමයි! (Draw)";
    
    document.getElementById('ttt-result-text').innerText = text;
    document.getElementById('ttt-result-text').style.color = result === 'win' ? '#2b9348' : (result === 'lose' ? '#c1121f' : '#0077b6');
    document.getElementById('ttt-result-box').classList.remove('hidden');
    document.getElementById('ttt-turn-indicator').innerText = "🏆 ගේම් ඉවරයි!";
    document.getElementById('ttt-turn-indicator').className = "turn-indicator my-turn";
}

window.tttPlayAgain = function() {
    document.getElementById('btn-ttt-yes').disabled = true;
    document.getElementById('ttt-wait-text').classList.remove('hidden');
    
    if(isHost) tttHostReady = true; else tttGuestReady = true;
    sendData({type: 'ttt-ready'});
    
    checkTttRestart();
}

function checkTttRestart() {
    if(tttHostReady && tttGuestReady) {
        initTicTacToe(); 
    }
}

function updateTttUI() {
    if(tttGameOver) return;
    let amI = isHost ? 'host' : 'guest';
    let ind = document.getElementById('ttt-turn-indicator');
    
    if(tttTurn === amI) {
        ind.innerText = `👉 දැන් ඔයාගේ වාරේ (${isHost ? '❌' : '❤️'})`;
        ind.className = "turn-indicator my-turn";
    } else {
        ind.innerText = `⏳ දැන් එයාගේ වාරේ (${!isHost ? '❌' : '❤️'})...`;
        ind.className = "turn-indicator their-turn";
    }
}

// --- 1. Memory Match Game ---
const memoryEmojis = ['🐶', '🍕', '🚀', '🌻', '🎈', '🧸', '💎', '🍓'];
let memoryBoard = [], flippedCards = [], matchedCards = [];
let memoryTurn = 'host', scoreHost = 0, scoreGuest = 0, lockBoard = false;

window.startMemoryMatch = function() {
    if(!isHost) return window.showToast("ගේම් එක හැදුව කෙනාට (Host) කියන්න පටන්ගන්න කියලා!");
    memoryBoard = [...memoryEmojis, ...memoryEmojis].sort(() => Math.random() - 0.5);
    sendData({type: 'start-memory', board: memoryBoard});
    initMemoryMatch(memoryBoard);
}

function initMemoryMatch(board) {
    memoryBoard = board;
    flippedCards = []; matchedCards = [];
    scoreHost = 0; scoreGuest = 0;
    memoryTurn = 'host'; lockBoard = false;
    showScreen('screen-memory');
    
    const grid = document.getElementById('memory-grid');
    grid.innerHTML = '';
    for(let i=0; i<16; i++) {
        let card = document.createElement('div');
        card.className = 'm-card';
        card.id = `mem-card-${i}`;
        card.onclick = () => handleMemoryClick(i);
        grid.appendChild(card);
    }
    updateMemoryUI();
}

function handleMemoryClick(i) {
    if(lockBoard || flippedCards.includes(i) || matchedCards.includes(i)) return;
    let amI = isHost ? 'host' : 'guest';
    if(memoryTurn !== amI) return window.showToast("දැන් එයාගේ වාරේ! පොඩ්ඩක් ඉන්න.");
    
    sendData({type: 'memory-flip', index: i});
    processMemoryFlip(i);
}

function processMemoryFlip(i) {
    flippedCards.push(i);
    let card = document.getElementById(`mem-card-${i}`);
    card.classList.add('flipped');
    card.innerText = memoryBoard[i];
    
    if(flippedCards.length === 2) {
        lockBoard = true;
        let [idx1, idx2] = flippedCards;
        let isMatch = memoryBoard[idx1] === memoryBoard[idx2];
        
        setTimeout(() => {
            if(isMatch) {
                matchedCards.push(idx1, idx2);
                document.getElementById(`mem-card-${idx1}`).classList.add('matched');
                document.getElementById(`mem-card-${idx2}`).classList.add('matched');
                if(memoryTurn === 'host') scoreHost++; else scoreGuest++;
                window.showToast("නියමයි! ගැලපෙනවා! 🎯");
            } else {
                let c1 = document.getElementById(`mem-card-${idx1}`);
                let c2 = document.getElementById(`mem-card-${idx2}`);
                c1.classList.remove('flipped'); c1.innerText = '';
                c2.classList.remove('flipped'); c2.innerText = '';
                memoryTurn = memoryTurn === 'host' ? 'guest' : 'host';
            }
            flippedCards = [];
            updateMemoryUI();
            lockBoard = false;
            
            if(matchedCards.length === 16) {
                let winner = scoreHost === scoreGuest ? 'දෙන්නම දිනුම් (Draw)!' : (scoreHost > scoreGuest ? 'Host දිනුම්!' : 'Guest දිනුම්!');
                document.getElementById('mem-turn-indicator').innerText = "🎉 ගේම් ඉවරයි! " + winner;
                document.getElementById('mem-turn-indicator').className = "turn-indicator my-turn";
                document.getElementById('btn-mem-home').classList.remove('hidden');
            }
        }, 1200);
    }
}

function updateMemoryUI() {
    document.getElementById('mem-score-host').innerText = scoreHost;
    document.getElementById('mem-score-guest').innerText = scoreGuest;
    let amI = isHost ? 'host' : 'guest';
    let ind = document.getElementById('mem-turn-indicator');
    document.getElementById('btn-mem-home').classList.add('hidden');
    
    if(matchedCards.length < 16) {
        if(memoryTurn === amI) {
            ind.innerText = "👉 දැන් ඔයාගේ වාරේ (ඔබන්න)";
            ind.className = "turn-indicator my-turn";
        } else {
            ind.innerText = "⏳ දැන් එයාගේ වාරේ...";
            ind.className = "turn-indicator their-turn";
        }
    }
}

// --- 2. Pictionary ---
const canvas = document.getElementById('drawing-board'); 
const ctx = canvas.getContext('2d');
let isDrawing = false, currentX = 0, currentY = 0, myColor = '#ff4d6d';
function resizeCanvas() { const rect = canvas.parentElement.getBoundingClientRect(); canvas.width = rect.width; canvas.height = rect.height || 350; }
window.startPictionary = function() { sendData({type: 'start-pic'}); initPictionary(); }
function initPictionary() { showScreen('screen-pictionary'); setTimeout(resizeCanvas, 100); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; }
window.setColor = function(color, btn) { myColor = color; document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); }
function drawLine(x0, y0, x1, y1, color, emit) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.strokeStyle = color; ctx.lineWidth = color === 'white' ? 15 : 4; ctx.stroke(); ctx.closePath(); if (emit) sendData({ type: 'draw', x0, y0, x1, y1, color }); }
function getMousePos(e) { const rect = canvas.getBoundingClientRect(); return { x: (e.touches ? e.touches[0].clientX : e.clientX) - rect.left, y: (e.touches ? e.touches[0].clientY : e.clientY) - rect.top }; }
const onDown = (e) => { e.preventDefault(); isDrawing = true; const pos = getMousePos(e); currentX = pos.x; currentY = pos.y; };
const onMove = (e) => { e.preventDefault(); if (!isDrawing) return; const pos = getMousePos(e); drawLine(currentX, currentY, pos.x, pos.y, myColor, true); currentX = pos.x; currentY = pos.y; };
const onUp = (e) => { e.preventDefault(); isDrawing = false; };
canvas.addEventListener('mousedown', onDown); canvas.addEventListener('mousemove', onMove); canvas.addEventListener('mouseup', onUp); canvas.addEventListener('mouseout', onUp);
canvas.addEventListener('touchstart', onDown, {passive: false}); canvas.addEventListener('touchmove', onMove, {passive: false}); canvas.addEventListener('touchend', onUp);
window.clearCanvasSync = function() { ctx.clearRect(0, 0, canvas.width, canvas.height); sendData({type: 'clear-pic'}); }

// --- 3. Battleship ---
let battleState = { h: [], t: [] }, battleData = { h: [], t: [] }, playStats = { hearts: 0, tries: 7, done: false };
window.startBattleship = function() { sendData({type: 'start-battle'}); initBattleshipHost(); }
function initBattleshipHost() { showScreen('screen-battleship-setup'); battleState = { h: [], t: [] }; updateSetupUI(); const grid = document.getElementById('setup-grid'); grid.innerHTML = ''; for(let i=0; i<25; i++) { let cell = document.createElement('div'); cell.className = 'cell'; cell.onclick = () => setupCellClick(cell, i); grid.appendChild(cell); } }
function setupCellClick(cell, i) { if(battleState.h.includes(i)) { battleState.h = battleState.h.filter(x => x !== i); cell.classList.remove('heart-selected'); cell.innerHTML = ''; } else if(battleState.t.includes(i)) { battleState.t = battleState.t.filter(x => x !== i); cell.classList.remove('trap-selected'); cell.innerHTML = ''; } else { if(battleState.h.length < 3) { battleState.h.push(i); cell.classList.add('heart-selected'); cell.innerHTML = '❤️'; } else if(battleState.t.length < 3) { battleState.t.push(i); cell.classList.add('trap-selected'); cell.innerHTML = '💣'; } } updateSetupUI(); }
function updateSetupUI() { document.getElementById('setup-h').innerText = 3 - battleState.h.length; document.getElementById('setup-t').innerText = 3 - battleState.t.length; document.getElementById('btn-start-battle').style.display = (battleState.h.length === 3 && battleState.t.length === 3) ? 'block' : 'none'; }
window.sendBattleshipReady = function() { sendData({type: 'battle-ready', data: battleState}); battleData = battleState; showScreen('screen-battleship-play'); document.getElementById('battle-instructions').innerText = 'එයා හොයනකන් බලාගෙන ඉන්න...'; initBattleshipPlayGrid(true); }
function initBattleshipGuest() { showScreen('screen-lobby'); document.getElementById('lobby-content').innerHTML = '<h3>හංගනකන් ඉන්න... 🤫</h3>'; }
function initBattleshipPlayGrid(isViewer = false) { if(!isViewer) { showScreen('screen-battleship-play'); document.getElementById('battle-instructions').innerText = 'හදවත් 3ක් හොයාගන්න! බෝම්බත් තියෙනවා!'; } document.getElementById('btn-battle-home').classList.add('hidden'); playStats = { hearts: 0, tries: 7, done: false }; updatePlayUI(); const grid = document.getElementById('play-grid'); grid.innerHTML = ''; for(let i=0; i<25; i++) { let cell = document.createElement('div'); cell.className = 'cell'; cell.id = `bcell-${i}`; if(!isViewer) { cell.onclick = () => { if(playStats.done) return; sendData({type: 'battle-click', index: i}); processBattleClick(i); }; } grid.appendChild(cell); } }
function processBattleClick(i) { if(playStats.done) return; const cell = document.getElementById(`bcell-${i}`); if(cell.innerHTML !== '') return; playStats.tries--; if(battleData.h.includes(i)) { cell.classList.add('revealed-heart'); cell.innerHTML = '❤️'; playStats.hearts++; window.showToast('නියමයි! ❤️ එකක් හම්බුනා!'); } else if(battleData.t.includes(i)) { cell.classList.add('revealed-trap'); cell.innerHTML = '💣'; window.showToast('අයියෝ! බෝම්බෙකට අහු වුණා!'); } else { cell.classList.add('revealed-empty'); cell.innerHTML = '☁️'; } updatePlayUI(); checkWinLoss(); }
function updatePlayUI() { document.getElementById('play-h').innerText = `${playStats.hearts}/3`; document.getElementById('play-c').innerText = playStats.tries; }
function checkWinLoss() { if(playStats.hearts === 3) { playStats.done = true; document.getElementById('battle-instructions').innerText = '🎉 සුපිරි! ඔයා දිනුම්!'; window.showToast('දෙන්නා දිනුම්! ❤️'); document.getElementById('btn-battle-home').classList.remove('hidden'); } else if(playStats.tries === 0) { playStats.done = true; document.getElementById('battle-instructions').innerText = '😢 චාන්ස් ඉවරයි! ඔයා පැරදුනා.'; window.showToast('ගේම් ඕවර්! 💔'); battleData.h.forEach(i => { const c = document.getElementById(`bcell-${i}`); if(c.innerHTML === '') c.innerHTML = '❤️'; }); document.getElementById('btn-battle-home').classList.remove('hidden'); } }

// --- 4. Quiz (No Duplicates) ---
const quizQuestions = [
    "කවුද වැඩියෙන්ම කේන්ති ගන්නේ? 😡", "කවුද වැඩියෙන්ම කන්න පෙරේත? 🍕", "කවුද මුලින්ම 'ආදරෙයි' කිව්වේ? ❤️",
    "කවුද මුලින්ම යාළු වෙන්න ඇහුවේ? 😍", "කවුද වැඩියෙන්ම නිදාගන්නේ? 😴", "කවුද වැඩියෙන්ම සල්ලි වියදම් කරන්නේ? 💸",
    "කවුද වැඩියෙන්ම ෆෝන් එකේ ඉන්නේ? 📱", "කවුද වැඩියෙන්ම සෙල්ෆි ගහන්නේ? 📸", "ඩේට් එකකට යද්දි හැමතිස්සෙම පරක්කු වෙන්නේ කවුද? ⏰",
    "වලියක් ගියාම කවුද මුලින්ම sorry කියන්නේ? 🥺", "කවුද බොරුවට තරහ අරන් බලන් ඉන්නේ? 😤", "කවුද වැඩියෙන්ම රොමෑන්ටික්? 🥰",
    "කවුද ලස්සනටම අඳින්නේ පලඳින්නේ? 👗", "ෆිල්ම් එකක් බලද්දි වැඩියෙන්ම අඬන්නේ කවුද? 😭", "කෑම තෝරන්නේ කවුද? 😒",
    "කවුද වැඩියෙන්ම සර්ප්‍රයිස් දෙන්න දක්ෂ? 🎁", "අනාගතේ ගැන වැඩියෙන්ම ප්ලෑන් කරන්නේ කවුද? 🏡", "කවුද දේවල් ඉක්මනටම අමතක කරන්නේ? 🧠",
    "කවුද රහස් රකින්න වැඩියෙන්ම දක්ෂ? 🤫", "නානකාමරේ වැඩියෙන්ම සිංදු කියන්නේ කවුද? 🚿", "කවුද වැඩියෙන්ම ට්‍රිප් යන්න ආස? 🚗",
    "කවුද වැඩියෙන්ම කම්මැලි? 🥱", "කවුද ඉක්මනටම ලෙඩ වෙන්නේ? 🤒", "කවුද ගොඩක් වෙලා කණ්ණාඩිය ඉස්සරහ ඉන්නේ? 🪞",
    "කවුද වැඩියෙන්ම ෂොපින් යන්න ආස? 🛍️", "කවුද වැඩියෙන්ම කතා කරන්නේ (වෙහෙසක් නැතුව)? 🗣️", "කවුද වැඩියෙන්ම කෝපි/තේ බොන්නේ? ☕",
    "කවුද ගෙදර වැඩ වලට වැඩියෙන්ම උදව් කරන්නේ? 🧹", "කවුද වැඩියෙන්ම ළමයින්ට ආදරේ? 👶", "කවුද සත්තුන්ට වැඩියෙන්ම ආදරේ? 🐶",
    "කවුද වැඩියෙන්ම ජෝක්ස් කරන්නේ? 😂", "කවුද ඉක්මනටම බය වෙන්නේ? 👻", "කවුද ගොඩක්ම පිරිසිදුවට ඉන්න ආස? 🧼",
    "කවුද රෑට ගෙරවන්නේ? 💤", "කවුද මුලින්ම මැසේජ් කරන්නේ/රිප්ලයි කරන්නේ? 💬", "කවුද වැඩියෙන්ම චොකලට්/පැණිරස කන්න ආස? 🍫",
    "කවුද වැඩියෙන්ම ගේම්ස් ගහන්නේ? 🎮", "කවුද වැඩියෙන්ම ටික්ටොක්/යූටියුබ් බලන්නේ? 🎬", "කවුද පොඩි දේටත් ඉක්මනටම අඬන්නේ? 😢",
    "කවුද වැඩියෙන්ම ඊර්ෂ්‍යා කරන්නේ? 😒", "කවුද වැඩියෙන්ම සිංදු අහන්න ආස? 🎧", "කවුද වැඩියෙන්ම කෑම උයන්න දක්ෂ? 👨‍🍳",
    "කවුද වැඩියෙන්ම පාටි වලට යන්න ආස? 🥳", "කවුද වැඩියෙන්ම පරණ දේවල් මතක තියාගෙන ඉන්නේ? 🕰️", "කවුද වැඩියෙන්ම දවල් හීන දකින්නේ? 💭",
    "කවුද නිතරම මොනවා හරි අමතක කරලා හොයන්නේ? 🔎", "කවුද අමාරු වෙලාවක වැඩියෙන්ම හයියක් වෙන්නේ? 💪", "කවුද වැඩියෙන්ම වාහන පදවන්න ආස/දක්ෂ? 🏎️",
    "කවුද වැඩියෙන්ම ෆොටෝස් වලට පෝස් දෙන්න දක්ෂ? 🕺", "කවුද නිතරම අනිත් කෙනාව හිනස්සන්නේ? 😁"
];
let availableQuestions = [];
let currentQIndex = 0, myQuizAns = null, partnerQuizAns = null;

window.startQuiz = function() { 
    if(!isHost) return window.showToast("ගේම් එක හැදුව කෙනාට (Host) කියන්න Quiz එක ඔබන්න කියලා!"); 
    if (availableQuestions.length === 0) {
        availableQuestions = quizQuestions.map((_, index) => index);
        window.showToast("අලුත් වටයක් පටන් ගත්තා! 🔄");
    }
    const randomIndex = Math.floor(Math.random() * availableQuestions.length);
    currentQIndex = availableQuestions[randomIndex];
    availableQuestions.splice(randomIndex, 1);
    
    sendData({type: 'start-quiz', qIndex: currentQIndex}); 
    initQuiz(currentQIndex); 
}

function initQuiz(qIndex) { 
    currentQIndex = qIndex; myQuizAns = null; partnerQuizAns = null; 
    showScreen('screen-quiz'); 
    document.getElementById('quiz-q-text').innerText = quizQuestions[qIndex]; 
    document.getElementById('quiz-question-container').classList.remove('hidden'); 
    document.getElementById('quiz-waiting').classList.add('hidden'); 
    document.getElementById('quiz-result').classList.add('hidden'); 
    document.getElementById('btn-next-quiz').classList.add('hidden'); 
}

window.submitQuizAns = function(ans) { 
    let absoluteAns = isHost ? (ans === 'me' ? 'host' : 'guest') : (ans === 'me' ? 'guest' : 'host'); 
    myQuizAns = absoluteAns; 
    sendData({type: 'quiz-ans', ans: absoluteAns}); 
    document.getElementById('quiz-question-container').classList.add('hidden'); 
    checkQuizResults(); 
}

function checkQuizResults() { 
    if(myQuizAns && partnerQuizAns) { 
        document.getElementById('quiz-waiting').classList.add('hidden'); 
        document.getElementById('quiz-result').classList.remove('hidden'); 
        let resTitle = document.getElementById('quiz-result-title'); 
        let resDetail = document.getElementById('quiz-result-detail'); 
        
        if(myQuizAns === partnerQuizAns) { 
            resTitle.innerText = "🎉 දෙන්නම එකඟයි!"; 
            resTitle.style.color = "#2b9348"; 
            let who = (isHost && myQuizAns === 'guest') || (!isHost && myQuizAns === 'host') ? "එයා" : "ඔයා"; 
            resDetail.innerText = `දෙන්නම පිළිගත්තා වැඩියෙන්ම ඒ දේ කරන්නේ '${who}' කියලා! 😂❤️`; 
        } else { 
            resTitle.innerText = "⚔️ දෙන්නට දෙකක්!"; 
            resTitle.style.color = "#c1121f"; 
            resDetail.innerText = "මෙතන නම් ලොකු වලියක් යයි වගේ! 😅 දෙන්නම කියන්නේ අනිත් කෙනා කියලා."; 
        } 
        if(isHost) { document.getElementById('btn-next-quiz').classList.remove('hidden'); } 
    } else if (myQuizAns) { 
        document.getElementById('quiz-waiting').classList.remove('hidden'); 
    } 
}

window.nextQuizQ = function() { window.startQuiz(); }

// --- 5. Guess the Number ---
let guessMax = 100, mySecret = null, partnerSecret = null;
let guessTurn = 'host', isGuessGameOver = false;

window.openGuessSetup = function() {
    sendData({type: 'start-guess-setup'});
    if(isHost) {
        showScreen('screen-guess');
        document.getElementById('guess-setup').classList.remove('hidden');
        document.getElementById('guess-pick-secret').classList.add('hidden');
        document.getElementById('guess-play').classList.add('hidden');
    } else {
        window.openGuessGuestWaiting();
    }
}

window.openGuessGuestWaiting = function() {
    showScreen('screen-guess');
    document.getElementById('guess-setup').classList.add('hidden');
    let pickDiv = document.getElementById('guess-pick-secret');
    pickDiv.innerHTML = '<div class="result-box"><h3>⏳ පොඩ්ඩක් ඉන්න...</h3><p>Host උපරිම ඉලක්කම තෝරනකන් ඉන්න.</p></div>';
    pickDiv.classList.remove('hidden');
    document.getElementById('guess-play').classList.add('hidden');
}

window.startGameGuess = function() {
    guessMax = parseInt(document.getElementById('guess-max-limit').value);
    sendData({type: 'guess-range', max: guessMax});
    initPickSecret(guessMax);
}

function initPickSecret(max) {
    guessMax = max;
    mySecret = null;
    partnerSecret = null;
    isGuessGameOver = false;
    guessTurn = 'host';
    
    showScreen('screen-guess');
    document.getElementById('guess-setup').classList.add('hidden');
    document.getElementById('guess-play').classList.add('hidden');
    
    let pickDiv = document.getElementById('guess-pick-secret');
    pickDiv.classList.remove('hidden');
    pickDiv.innerHTML = `
        <p>1 ත් ${max} ත් අතර ඔයාගේ රහස් ඉලක්කම හිතාගෙන මෙතන ගහන්න! 🤫</p>
        <input type="number" id="secret-input" placeholder="රහස් ඉලක්කම..." style="padding: 12px; border-radius: 15px; border: 2px solid #ffb3c6; text-align: center; font-size: 16px; width: 85%; margin-bottom: 15px; outline: none; background: #fff0f3;">
        <button onclick="submitSecret()">ලෑස්තියි</button>
        <p id="secret-wait-text" class="hidden" style="color: #2b9348; margin-top: 15px; font-weight: bold;">⏳ පාට්නර් ඉලක්කම හිතනකන් ඉන්න...</p>
    `;
}

window.submitSecret = function() {
    let val = parseInt(document.getElementById('secret-input').value);
    if(isNaN(val) || val < 1 || val > guessMax) return window.showToast(`කරුණාකර 1ත් ${guessMax}ත් අතර ඉලක්කමක් දෙන්න!`);
    
    mySecret = val;
    document.getElementById('secret-input').disabled = true;
    document.getElementById('secret-wait-text').classList.remove('hidden');
    
    sendData({type: 'guess-secret', secret: mySecret});
    checkBothSecrets();
}

function checkBothSecrets() {
    if(mySecret !== null && partnerSecret !== null) {
        startGuessingPhase();
    }
}

function startGuessingPhase() {
    document.getElementById('guess-pick-secret').classList.add('hidden');
    document.getElementById('guess-play').classList.remove('hidden');
    
    document.getElementById('guess-instruction').innerText = `දැන් එයා හිතපු ඉලක්කම හොයමු! (උපරිමය ${guessMax})`;
    document.getElementById('guess-hint-text').innerHTML = "ඔයාගේ ගෙස් එක ගහන්න 👇";
    document.getElementById('guess-hint-text').style.color = "#590d22";
    document.getElementById('partner-hint-text').innerHTML = ""; 
    document.getElementById('guess-input').value = '';
    document.getElementById('btn-guess-home').classList.add('hidden');
    
    updateGuessUI();
}

window.submitGuess = function() {
    let amI = isHost ? 'host' : 'guest';
    if(guessTurn !== amI || isGuessGameOver) return window.showToast("දැන් එයාගේ වාරේ! පොඩ්ඩක් ඉන්න.");
    
    let myGuess = parseInt(document.getElementById('guess-input').value);
    if(isNaN(myGuess) || myGuess < 1 || myGuess > guessMax) return window.showToast(`කරුණාකර 1ත් ${guessMax}ත් අතර ඉලක්කමක් දෙන්න!`);
    
    document.getElementById('guess-input').value = '';
    
    if(myGuess === partnerSecret) {
        handleWin(amI);
    } else {
        let hintText = document.getElementById('guess-hint-text');
        if(myGuess < partnerSecret) {
            hintText.innerHTML = `⬆️ මදි! එයා හිතපු ඉලක්කම <b>${myGuess}</b> ට වඩා වැඩියි!`;
            hintText.style.color = "#0077b6";
        } else {
            hintText.innerHTML = `⬇️ වැඩියි! එයා හිතපු ඉලක්කම <b>${myGuess}</b> ට වඩා අඩුයි!`;
            hintText.style.color = "#c1121f";
        }
        
        guessTurn = guessTurn === 'host' ? 'guest' : 'host';
        sendData({type: 'guess-try', guess: myGuess});
        updateGuessUI();
    }
}

function processPartnerGuess(guess) {
    let hintText = document.getElementById('partner-hint-text');
    
    if(guess < mySecret) {
        hintText.innerHTML = `💡 එයා <b>${guess}</b> ගැහුවා. ඒක ඔයාගේ ඉලක්කමට වඩා අඩුයි!`;
    } else {
        hintText.innerHTML = `💡 එයා <b>${guess}</b> ගැහුවා. ඒක ඔයාගේ ඉලක්කමට වඩා වැඩියි!`;
    }
    
    guessTurn = guessTurn === 'host' ? 'guest' : 'host';
    updateGuessUI();
}

function handleWin(winner) {
    isGuessGameOver = true;
    let amIWinner = (winner === (isHost ? 'host' : 'guest'));
    
    let hintText = document.getElementById('guess-hint-text');
    document.getElementById('partner-hint-text').innerHTML = '';
    
    if(amIWinner) {
        hintText.innerHTML = `🎉 සුපිරි! ඔයා දිනුම්! එයා හිතපු ඉලක්කම: <b>${partnerSecret}</b>`;
        hintText.style.color = "#2b9348";
        sendData({type: 'guess-win'}); 
    } else {
        hintText.innerHTML = `😢 අඩේ! එයා දිනුම්! එයා ඔයාගේ ඉලක්කම හොයාගත්තා. <br>එයා හිතලා තිබ්බේ: <b>${partnerSecret}</b>`;
        hintText.style.color = "#c1121f";
    }
    
    document.getElementById('btn-guess-home').classList.remove('hidden');
    document.getElementById('guess-turn-indicator').innerText = amIWinner ? `🏆 ඔයා දිනුම්!` : `🏆 එයා දිනුම්!`;
    document.getElementById('guess-turn-indicator').className = "turn-indicator my-turn";
    document.getElementById('btn-submit-guess').disabled = true;
    window.showToast("ගේම් ඉවරයි! 🎯");
}

function updateGuessUI() {
    if(isGuessGameOver) return;
    let amI = isHost ? 'host' : 'guest';
    let ind = document.getElementById('guess-turn-indicator');
    
    if(guessTurn === amI) {
        ind.innerText = "👉 දැන් ඔයාගේ වාරේ (ගෙස් කරන්න)";
        ind.className = "turn-indicator my-turn";
        document.getElementById('btn-submit-guess').disabled = false;
    } else {
        ind.innerText = "⏳ දැන් එයාගේ වාරේ...";
        ind.className = "turn-indicator their-turn";
        document.getElementById('btn-submit-guess').disabled = true;
    }
}
