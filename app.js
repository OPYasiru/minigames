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

const screens = ['screen-connect', 'screen-lobby', 'screen-pictionary', 'screen-battleship-role', 'screen-battleship-setup', 'screen-battleship-wait', 'screen-battleship-play', 'screen-quiz', 'screen-memory', 'screen-guess', 'screen-tictactoe', 'screen-hunt'];

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
        window.showToast('🥰 Partner එකතු වුණා!');
        setupDataHandler();
    }
});

window.joinGame = function() {
    const enteredId = document.getElementById('join-id').value.trim();
    if(!enteredId || enteredId.length !== 5) return window.showToast('කරුණාකර ඉලක්කම් 5ක Code එකක් දෙන්න!');
    if(enteredId === gameId) return window.showToast('ඔයාගේ Code එකටම සම්බන්ධ වෙන්න බැහැ!');

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
            document.getElementById('lobby-content').innerHTML = '<h3>🥰 Partner game එකක් තෝරනකන් ඉන්න...</h3>';
            window.showToast('සාර්ථකව එකතු වුණා!');
            setupDataHandler();
        } else {
            window.showToast('Code එක වැරදියි හෝ Partner game එකේ නැහැ!');
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
        
        else if(data.type === 'start-quiz') initQuiz(data.qIndex);
        else if(data.type === 'quiz-ans') { partnerQuizAns = data.ans; checkQuizResults(); }
        else if(data.type === 'start-memory') { if(!isHost) initMemoryMatch(data.board, data.turn); }
        else if(data.type === 'memory-flip') processMemoryFlip(data.index);
        
        else if(data.type === 'battle-role') { setBattleRoleFromPartner(data.hider); }
        else if(data.type === 'battle-ready') { battleData = data.data; initBattleshipPlayGrid(); }
        else if(data.type === 'battle-click') processBattleClick(data.index);
        
        else if(data.type === 'start-guess-setup') { if(!isHost) window.openGuessGuestWaiting(); }
        else if(data.type === 'guess-range') { initPickSecret(data.max, data.turn); }
        else if(data.type === 'guess-secret') { partnerSecret = data.secret; checkBothSecrets(); }
        else if(data.type === 'guess-try') { processPartnerGuess(data.guess); }
        else if(data.type === 'guess-win') { handleWin(isHost ? 'guest' : 'host'); }

        else if(data.type === 'start-ttt') { if(!isHost) initTicTacToe(data.turn); }
        else if(data.type === 'ttt-move') { processTttMove(data.index); }

        else if(data.type === 'start-hunt') { initHuntBoard(data.board, data.target, data.scoreH, data.scoreG); }
        else if(data.type === 'hunt-click') { handlePartnerHuntClick(data.num); }
        else if(data.type === 'hunt-next') { initHuntBoard(data.board, data.target, data.scoreH, data.scoreG); }

        else if(data.type === 'play-again') { setReadyState(data.game, data.senderTurn); }
    });

    const activeStatusRef = ref(db, `games/${gameId}/status`);
    onValue(activeStatusRef, snap => {
        if(!snap.exists() || snap.val() === 'disconnected') {
            alert("Partner game එකෙන් අයින් වුණා! කරුණාකර page එක Refresh කරන්න.");
            location.reload();
        }
    });
}

window.goLobby = function() { showScreen('screen-lobby'); sendData({type: 'go-lobby'}); }

// --- 0. Generic Play Again System ---
let playAgainStatus = {
    ttt: {host: false, guest: false},
    mem: {host: false, guest: false},
    battle: {host: false, guest: false},
    guess: {host: false, guest: false},
    hunt: {host: false, guest: false}
};

window.requestPlayAgain = function(game) {
    let amI = isHost ? 'host' : 'guest';
    document.getElementById(`btn-${game}-yes`).disabled = true;
    document.getElementById(`${game}-wait-text`).classList.remove('hidden');
    sendData({type: 'play-again', game: game, senderTurn: amI});
    setReadyState(game, amI);
}

function setReadyState(game, player) {
    playAgainStatus[game][player] = true;
    if(playAgainStatus[game].host && playAgainStatus[game].guest) {
        playAgainStatus[game] = {host: false, guest: false}; 
        
        if(game === 'ttt' && isHost) { 
            let starter = Math.random() < 0.5 ? 'host' : 'guest'; 
            sendData({type: 'start-ttt', turn: starter}); 
            initTicTacToe(starter); 
        }
        else if(game === 'mem' && isHost) { window.startMemoryMatch(); }
        else if(game === 'battle') { 
            if(isHost) {
                showScreen('screen-battleship-role');
            } else {
                showScreen('screen-battleship-wait');
                document.getElementById('battle-wait-h3').innerText = "⏳ පොඩ්ඩක් ඉන්න...";
                document.getElementById('battle-wait-p').innerText = "Host ඊළඟ වටය හදනකන් ඉන්න.";
            }
        }
        else if(game === 'guess') { 
            if(isHost) {
                showScreen('screen-guess');
                document.getElementById('guess-setup').classList.remove('hidden');
                document.getElementById('guess-pick-secret').classList.add('hidden');
                document.getElementById('guess-play').classList.add('hidden');
                document.getElementById('guess-result-box').classList.add('hidden');
            } else {
                window.openGuessGuestWaiting();
            }
        }
        else if(game === 'hunt' && isHost) { generateHuntRound(0, 0); }
    }
}

// --- 1. Memory Match Game ---
// ලොකු ඉමෝජි ලිස්ට් එකක් මෙතන තියෙනවා
const allEmojis = ['🐶', '🍕', '🚀', '🌻', '🎈', '🧸', '💎', '🍓', '🚗', '🎮', '🎧', '⚽', '🎸', '🍔', '🍟', '🍦', '🍩', '🍎', '🐱', '🐼', '🦊', '🦁', '🐸', '🦄', '🌞', '🌙', '⭐', '🔥', '💧', '⚡', '👻', '👽'];

let memoryBoard = [], flippedCards = [], matchedCards = [];
let memoryTurn = 'host', scoreHost = 0, scoreGuest = 0, lockBoard = false;

window.startMemoryMatch = function() {
    if(!isHost) return window.showToast("ගේම් එක හැදුව කෙනාට (Host) කියන්න පටන්ගන්න කියලා!");
    
    // ලොකු ලිස්ට් එකෙන් අහඹු ලෙස ඉමෝජි 8ක් තෝරාගැනීම
    let shuffledEmojis = [...allEmojis].sort(() => 0.5 - Math.random());
    let selectedEmojis = shuffledEmojis.slice(0, 8);
    
    // ඒ 8 දෙගුණ කරලා (16ක් කරලා) බෝඩ් එකට දැමීම
    memoryBoard = [...selectedEmojis, ...selectedEmojis].sort(() => Math.random() - 0.5);
    
    memoryTurn = Math.random() < 0.5 ? 'host' : 'guest';
    sendData({type: 'start-memory', board: memoryBoard, turn: memoryTurn});
    initMemoryMatch(memoryBoard, memoryTurn);
}

function initMemoryMatch(board, turn) {
    memoryBoard = board;
    memoryTurn = turn;
    flippedCards = []; matchedCards = [];
    scoreHost = 0; scoreGuest = 0;
    lockBoard = false;
    showScreen('screen-memory');
    
    document.getElementById('mem-result-box').classList.add('hidden');
    document.getElementById('btn-mem-yes').disabled = false;
    document.getElementById('mem-wait-text').classList.add('hidden');
    
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
                let winner = scoreHost === scoreGuest ? '🤝 දෙන්නම සමයි (Draw)!' : 
                    ((scoreHost > scoreGuest && isHost) || (scoreGuest > scoreHost && !isHost) ? '🎉 ඔයා දිනුම්!' : '😢 එයා දිනුම්!');
                let color = scoreHost === scoreGuest ? '#0077b6' : 
                    ((scoreHost > scoreGuest && isHost) || (scoreGuest > scoreHost && !isHost) ? '#2b9348' : '#c1121f');
                
                document.getElementById('mem-turn-indicator').innerText = "🏆 Game Over!";
                document.getElementById('mem-turn-indicator').className = "turn-indicator my-turn";
                document.getElementById('mem-result-text').innerText = winner;
                document.getElementById('mem-result-text').style.color = color;
                document.getElementById('mem-result-box').classList.remove('hidden');
            }
        }, 1200);
    }
}

function updateMemoryUI() {
    document.getElementById('mem-score-host').innerText = scoreHost;
    document.getElementById('mem-score-guest').innerText = scoreGuest;
    let amI = isHost ? 'host' : 'guest';
    let ind = document.getElementById('mem-turn-indicator');
    
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
let battleState = { h: [], t: [] }, battleData = { h: [], t: [] }, playStats = { hearts: 0, bombs: 0, done: false };
let battleHider = null, battleSeeker = null;

window.startBattleshipRole = function() {
    showScreen('screen-battleship-role');
}

window.selectBattleRole = function(who) {
    let amI = isHost ? 'host' : 'guest';
    battleHider = (who === 'me') ? amI : (isHost ? 'guest' : 'host');
    battleSeeker = (battleHider === 'host') ? 'guest' : 'host';
    
    sendData({type: 'battle-role', hider: battleHider});
    
    if(battleHider === amI) {
        initBattleshipSetup();
    } else {
        showScreen('screen-battleship-wait');
        document.getElementById('battle-wait-h3').innerText = "⏳ පොඩ්ඩක් ඉන්න...";
        document.getElementById('battle-wait-p').innerText = "එයා බෝම්බ ටික හංගනකන් ඉන්න.";
    }
}

function setBattleRoleFromPartner(hider) {
    battleHider = hider;
    battleSeeker = (battleHider === 'host') ? 'guest' : 'host';
    let amI = isHost ? 'host' : 'guest';
    
    if(battleHider === amI) {
        initBattleshipSetup();
    } else {
        showScreen('screen-battleship-wait');
        document.getElementById('battle-wait-h3').innerText = "⏳ පොඩ්ඩක් ඉන්න...";
        document.getElementById('battle-wait-p').innerText = "එයා බෝම්බ ටික හංගනකන් ඉන්න.";
    }
}

function initBattleshipSetup() { 
    showScreen('screen-battleship-setup'); 
    battleState = { h: [], t: [] }; 
    updateSetupUI(); 
    const grid = document.getElementById('setup-grid'); 
    grid.innerHTML = ''; 
    for(let i=0; i<25; i++) { 
        let cell = document.createElement('div'); 
        cell.className = 'cell'; 
        cell.onclick = () => setupCellClick(cell, i); 
        grid.appendChild(cell); 
    } 
}

function setupCellClick(cell, i) { 
    if(battleState.h.includes(i)) { 
        battleState.h = battleState.h.filter(x => x !== i); 
        cell.classList.remove('heart-selected'); 
        cell.innerHTML = ''; 
    } else if(battleState.t.includes(i)) { 
        battleState.t = battleState.t.filter(x => x !== i); 
        cell.classList.remove('trap-selected'); 
        cell.innerHTML = ''; 
    } else { 
        if(battleState.h.length < 5) { 
            battleState.h.push(i); 
            cell.classList.add('heart-selected'); 
            cell.innerHTML = '❤️'; 
        } else if(battleState.t.length < 5) { 
            battleState.t.push(i); 
            cell.classList.add('trap-selected'); 
            cell.innerHTML = '💣'; 
        } 
    } 
    updateSetupUI(); 
}

function updateSetupUI() { 
    document.getElementById('setup-h').innerText = 5 - battleState.h.length; 
    document.getElementById('setup-t').innerText = 5 - battleState.t.length; 
    document.getElementById('btn-start-battle').style.display = (battleState.h.length === 5 && battleState.t.length === 5) ? 'block' : 'none'; 
}

window.sendBattleshipReady = function() { 
    sendData({type: 'battle-ready', data: battleState}); 
    battleData = battleState; 
    initBattleshipPlayGrid(); 
    document.getElementById('battle-instructions').innerText = 'එයා හොයනකන් බලාගෙන ඉන්න...'; 
}

function initBattleshipPlayGrid() { 
    let amI = isHost ? 'host' : 'guest';
    showScreen('screen-battleship-play'); 
    
    document.getElementById('battle-result-box').classList.add('hidden');
    document.getElementById('btn-battle-yes').disabled = false;
    document.getElementById('battle-wait-text').classList.add('hidden');
    if(battleSeeker === amI) {
        document.getElementById('battle-instructions').innerText = 'බෝම්බ 3කට කලින් හදවත් 3ක් හොයන්න!';
    }
    
    playStats = { hearts: 0, bombs: 0, done: false }; 
    updatePlayUI(); 
    
    const grid = document.getElementById('play-grid'); 
    grid.innerHTML = ''; 
    for(let i=0; i<25; i++) { 
        let cell = document.createElement('div'); 
        cell.className = 'cell'; 
        cell.id = `bcell-${i}`; 
        if(battleSeeker === amI) { 
            cell.onclick = () => { 
                if(playStats.done) return; 
                sendData({type: 'battle-click', index: i}); 
                processBattleClick(i); 
            }; 
        } 
        grid.appendChild(cell); 
    } 
}

function processBattleClick(i) { 
    if(playStats.done) return; 
    const cell = document.getElementById(`bcell-${i}`); 
    if(cell.innerHTML !== '') return; 
    
    if(battleData.h.includes(i)) { 
        cell.classList.add('revealed-heart'); 
        cell.innerHTML = '❤️'; 
        playStats.hearts++; 
    } else if(battleData.t.includes(i)) { 
        cell.classList.add('revealed-trap'); 
        cell.innerHTML = '💣'; 
        playStats.bombs++;
    } else { 
        cell.classList.add('revealed-empty'); 
        cell.innerHTML = '☁️'; 
    } 
    updatePlayUI(); 
    checkWinLoss(); 
}

function updatePlayUI() { 
    document.getElementById('play-h').innerText = `${playStats.hearts}/3`; 
    document.getElementById('play-b').innerText = `${playStats.bombs}/3`; 
}

function checkWinLoss() { 
    let amI = isHost ? 'host' : 'guest';
    let inst = document.getElementById('battle-instructions');
    let resultTxt = document.getElementById('battle-result-text');
    
    if(playStats.hearts === 3) { 
        playStats.done = true; 
        if(battleSeeker === amI) {
            inst.innerText = '🎉 සුපිරි! ඔයා දිනුම්!'; 
            resultTxt.innerText = '🎉 සුපිරි! ඔයා දිනුම්!'; 
            resultTxt.style.color = '#2b9348';
            window.showToast('ඔයා දිනුම්! ❤️'); 
        } else {
            inst.innerText = 'අයියෝ! එයා දිනුම්.'; 
            resultTxt.innerText = 'අයියෝ! එයා දිනුම්.'; 
            resultTxt.style.color = '#c1121f';
        }
        showRemaining();
    } else if(playStats.bombs === 3) { 
        playStats.done = true; 
        if(battleSeeker === amI) {
            inst.innerText = '😢 බෝම්බ පෑගුනා! ඔයා පැරදුනා.'; 
            resultTxt.innerText = '😢 බෝම්බ පෑගුනා! ඔයා පැරදුනා.'; 
            resultTxt.style.color = '#c1121f';
            window.showToast('Game Over! 💔'); 
        } else {
            inst.innerText = '🎉 නියමයි! එයා බෝම්බ වලට අහු වුණා.'; 
            resultTxt.innerText = '🎉 නියමයි! එයා බෝම්බ වලට අහු වුණා.'; 
            resultTxt.style.color = '#2b9348';
        }
        showRemaining();
    } 
}

function showRemaining() {
    battleData.h.forEach(i => { const c = document.getElementById(`bcell-${i}`); if(c && c.innerHTML === '') c.innerHTML = '❤️'; }); 
    battleData.t.forEach(i => { const c = document.getElementById(`bcell-${i}`); if(c && c.innerHTML === '') c.innerHTML = '💣'; });
    
    setTimeout(() => { document.getElementById('battle-result-box').classList.remove('hidden'); }, 1000);
}

// --- 4. Quiz ---
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
    "කවුද ගෙදර වැඩ වලට වැඩියෙන්ම උදව් කරන්නේ? 🧹", "කවුද වැඩියෙන්ම ළමයින්ට ආදරේ? 👶", "කවුද සත්තුන්ට වැඩියෙන්ම ආදරේ? 🐶"
];
let availableQuestions = [];
let currentQIndex = 0, myQuizAns = null, partnerQuizAns = null;

window.startQuiz = function() { 
    if(!isHost) return window.showToast("Game එක හැදුව කෙනාට (Host) කියන්න Quiz එක ඔබන්න කියලා!"); 
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
        document.getElementById('guess-result-box').classList.add('hidden');
    } else {
        window.openGuessGuestWaiting();
    }
}

window.openGuessGuestWaiting = function() {
    showScreen('screen-guess');
    document.getElementById('guess-setup').classList.add('hidden');
    document.getElementById('guess-play').classList.add('hidden');
    document.getElementById('guess-result-box').classList.add('hidden');
    let pickDiv = document.getElementById('guess-pick-secret');
    pickDiv.innerHTML = '<div class="result-box"><h3>⏳ පොඩ්ඩක් ඉන්න...</h3><p>Host උපරිම ඉලක්කම තෝරනකන් ඉන්න.</p></div>';
    pickDiv.classList.remove('hidden');
}

window.startGameGuess = function() {
    guessMax = parseInt(document.getElementById('guess-max-limit').value);
    guessTurn = Math.random() < 0.5 ? 'host' : 'guest';
    sendData({type: 'guess-range', max: guessMax, turn: guessTurn});
    initPickSecret(guessMax, guessTurn);
}

function initPickSecret(max, turn) {
    guessMax = max;
    mySecret = null;
    partnerSecret = null;
    isGuessGameOver = false;
    guessTurn = turn;
    
    showScreen('screen-guess');
    document.getElementById('guess-setup').classList.add('hidden');
    document.getElementById('guess-play').classList.add('hidden');
    document.getElementById('guess-result-box').classList.add('hidden');
    document.getElementById('btn-guess-yes').disabled = false;
    document.getElementById('guess-wait-text').classList.add('hidden');
    
    let pickDiv = document.getElementById('guess-pick-secret');
    pickDiv.classList.remove('hidden');
    pickDiv.innerHTML = `
        <p>1 ත් ${max} ත් අතර ඔයාගේ රහස් ඉලක්කම හිතාගෙන මෙතන ගහන්න! 🤫</p>
        <input type="number" id="secret-input" placeholder="රහස් ඉලක්කම..." style="padding: 12px; border-radius: 15px; border: 2px solid #ffb3c6; text-align: center; font-size: 16px; width: 85%; margin-bottom: 15px; outline: none; background: #fff0f3;">
        <button onclick="submitSecret()">ලෑස්තියි</button>
        <p id="secret-wait-text" class="hidden" style="color: #2b9348; margin-top: 15px; font-weight: bold;">⏳ Partner ඉලක්කම හිතනකන් ඉන්න...</p>
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
    
    let resultTxt = document.getElementById('guess-result-text');
    document.getElementById('guess-hint-text').innerHTML = "";
    document.getElementById('partner-hint-text').innerHTML = "";
    
    if(amIWinner) {
        resultTxt.innerText = `🎉 සුපිරි! ඔයා දිනුම්! එයා හිතපු ඉලක්කම: ${partnerSecret}`;
        resultTxt.style.color = "#2b9348";
        sendData({type: 'guess-win'}); 
    } else {
        resultTxt.innerText = `😢 අඩේ! එයා දිනුම්! එයා හිතලා තිබ්බේ: ${partnerSecret}`;
        resultTxt.style.color = "#c1121f";
    }
    
    document.getElementById('guess-result-box').classList.remove('hidden');
    document.getElementById('guess-turn-indicator').innerText = amIWinner ? `🏆 ඔයා දිනුම්!` : `🏆 එයා දිනුම්!`;
    document.getElementById('guess-turn-indicator').className = "turn-indicator my-turn";
    document.getElementById('btn-submit-guess').disabled = true;
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

// --- 6. Tic Tac Toe (❤️ & ❌) ---
let tttBoard = Array(9).fill(null);
let tttTurn = 'host';
let tttGameOver = false;

const winPatterns = [
    [0,1,2], [3,4,5], [6,7,8], 
    [0,3,6], [1,4,7], [2,5,8], 
    [0,4,8], [2,4,6]           
];

window.startTicTacToe = function() {
    if(!isHost) return;
    let starter = Math.random() < 0.5 ? 'host' : 'guest';
    sendData({type: 'start-ttt', turn: starter});
    initTicTacToe(starter);
}

function initTicTacToe(turn) {
    tttBoard = Array(9).fill(null);
    tttTurn = turn; 
    tttGameOver = false;
    
    showScreen('screen-tictactoe');
    document.getElementById('ttt-result-box').classList.add('hidden');
    document.getElementById('btn-ttt-yes').disabled = false;
    document.getElementById('ttt-wait-text').classList.add('hidden');
    
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
    document.getElementById('ttt-turn-indicator').innerText = "🏆 Game Over!";
    document.getElementById('ttt-turn-indicator').className = "turn-indicator my-turn";
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

// --- 8. Number Hunt (ඉලක්කම් දඩයම) ---
let huntBoard = [], huntTarget = null, huntScoreH = 0, huntScoreG = 0;

window.startNumberHunt = function() {
    if(!isHost) return window.showToast("Game එක හැදුව කෙනාට (Host) කියන්න පටන්ගන්න කියලා!");
    generateHuntRound(0, 0);
}

function generateHuntRound(scoreH, scoreG) {
    let nums = [];
    while(nums.length < 25) {
        let r = Math.floor(Math.random() * 99) + 1;
        if(!nums.includes(r)) nums.push(r);
    }
    let target = nums[Math.floor(Math.random() * 25)];
    sendData({type: 'start-hunt', board: nums, target: target, scoreH: scoreH, scoreG: scoreG});
    initHuntBoard(nums, target, scoreH, scoreG);
}

function initHuntBoard(board, target, scoreH, scoreG) {
    huntBoard = board; huntTarget = target; huntScoreH = scoreH; huntScoreG = scoreG;
    showScreen('screen-hunt');
    
    document.getElementById('hunt-result-box').classList.add('hidden');
    document.getElementById('btn-hunt-yes').disabled = false;
    document.getElementById('hunt-wait-text').classList.add('hidden');
    
    document.getElementById('hunt-score-host').innerText = scoreH;
    document.getElementById('hunt-score-guest').innerText = scoreG;
    document.getElementById('hunt-target-box').innerText = target;
    
    if (scoreH >= 5 || scoreG >= 5) {
        endHuntGame(); return;
    }
    
    const grid = document.getElementById('hunt-grid');
    grid.innerHTML = '';
    for(let i=0; i<25; i++) {
        let cell = document.createElement('div');
        cell.className = 'h-cell';
        cell.innerText = board[i];
        cell.onclick = () => handleHuntClick(board[i]);
        grid.appendChild(cell);
    }
}

function handleHuntClick(num) {
    if(num === huntTarget) {
        if(isHost) {
            generateHuntRound(huntScoreH + 1, huntScoreG);
        } else {
            sendData({type: 'hunt-click', num: num});
        }
    } else {
        window.showToast("❌ වැරදියි! ආයේ බලන්න.");
    }
}

function handlePartnerHuntClick(num) {
    if(isHost && num === huntTarget) {
        generateHuntRound(huntScoreH, huntScoreG + 1);
    }
}

function endHuntGame() {
    document.getElementById('hunt-grid').innerHTML = '';
    document.getElementById('hunt-target-box').innerText = '--';
    let winner = document.getElementById('hunt-result-text');
    let amI = isHost ? 'host' : 'guest';
    
    if ((huntScoreH >= 5 && amI === 'host') || (huntScoreG >= 5 && amI === 'guest')) {
        winner.innerText = "🎉 සුපිරි! ඔයා දිනුම්!";
        winner.style.color = "#2b9348";
    } else {
        winner.innerText = "😢 අඩේ! එයා දිනුම්!";
        winner.style.color = "#c1121f";
    }
    document.getElementById('hunt-result-box').classList.remove('hidden');
}
