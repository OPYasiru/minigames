import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, set, onValue, push, onChildAdded, onDisconnect, get } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

// 🛑 පරාද වුණාම එන Effect එක මෙතනින් මාරු කරන්න (1, 2, හෝ 3 දාන්න)
// 1 = කැඩුණු වීදුරුව (Shattered Screen)
// 2 = හැකර් / ග්ලිච් (TV Glitch)
// 3 = අකුණු ගැසීම සහ වැස්ස (Thunder & Lightning)
const LOSE_EFFECT_TYPE = 2;


// --- 🌟 Magic Link Custom Names Logic ---
const urlParams = new URLSearchParams(window.location.search);
const userParam = urlParams.get('user');

let myName = "මම";
let partnerName = "එයා";

if (userParam === 'rash') {
    myName = "රශ්";
    partnerName = "ප්‍රබෝධි";
} else if (userParam === 'prabodi') {
    myName = "ප්‍රබෝධි";
    partnerName = "රශ්";
}

document.querySelectorAll('.my-name-label').forEach(el => el.innerText = myName);
document.querySelectorAll('.partner-name-label').forEach(el => el.innerText = partnerName);

// --- 🌟 PREMIUM WIN/LOSE EFFECTS ---
window.triggerWin = function() {
    const overlay = document.getElementById('flash-overlay');
    overlay.style.backgroundColor = 'rgba(43, 147, 72, 0.4)'; // Light green pulse
    overlay.style.opacity = '1';
    setTimeout(() => overlay.style.opacity = '0', 600);
    
    // Realistic Confetti Blast from both sides
    var duration = 3 * 1000;
    var end = Date.now() + duration;
    (function frame() {
        confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#ff4d6d', '#2b9348', '#0077b6', '#fca311', '#9d4edd'] });
        confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#ff4d6d', '#2b9348', '#0077b6', '#fca311', '#9d4edd'] });
        if (Date.now() < end) { requestAnimationFrame(frame); }
    }());
}

window.triggerLose = function() {
    const container = document.getElementById('effect-container');
    container.innerHTML = '';
    
    if(LOSE_EFFECT_TYPE === 1) {
        // Effect 1: Shattered Glass
        let crack = document.createElement('div');
        crack.className = 'shatter-overlay';
        document.body.appendChild(crack);
        setTimeout(() => crack.remove(), 2500);

    } else if(LOSE_EFFECT_TYPE === 2) {
        // Effect 2: Glitch / Hacker
        document.body.classList.add('glitch-effect');
        let overlay = document.createElement('div');
        overlay.className = 'glitch-overlay';
        document.body.appendChild(overlay);
        
        setTimeout(() => {
            document.body.classList.remove('glitch-effect');
            overlay.remove();
        }, 1000);

    } else if(LOSE_EFFECT_TYPE === 3) {
        // Effect 3: Thunder & Rain
        document.body.classList.add('thunder-effect');
        for(let i=0; i<60; i++) {
            let rain = document.createElement('div');
            rain.className = 'heavy-rain';
            rain.style.left = Math.random() * 100 + 'vw';
            rain.style.animationDuration = (Math.random() * 0.3 + 0.2) + 's';
            rain.style.animationDelay = Math.random() + 's';
            container.appendChild(rain);
        }
        setTimeout(() => {
            document.body.classList.remove('thunder-effect');
            container.innerHTML = '';
        }, 3000);
    }
}


// 🛑 FIREBASE CONFIG 🛑
const firebaseConfig = {
    apiKey: "AIzaSyDpK3gJkai7LtAT35h5XjX1CysTIkDh1X4",
    authDomain: "minigames-4d677.firebaseapp.com",
    databaseURL: "https://minigames-4d677-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "minigames-4d677",
    storageBucket: "minigames-4d677.firebasestorage.app",
    messagingSenderId: "632455789288",
    appId: "1:632455789288:web:6f223e611ef575c65ca75d"
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
        window.showToast(`🥰 ${partnerName} එකතු වුණා!`);
        setupDataHandler();
    }
});

window.joinGame = function() {
    const enteredId = document.getElementById('join-id').value.trim();
    if(!enteredId || enteredId.length !== 5) return window.showToast('කරුණාකර ඉලක්කම් 5ක Code එකක් දෙන්න!');
    if(enteredId === gameId) return window.showToast('ඔයාගේ Code එකටම සම්බන්ධ වෙන්න බැහැ!');

    window.showToast('සම්බන්ධ වෙමින් පවතී...');
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
            document.getElementById('lobby-content').innerHTML = `<h3>🥰 ${partnerName} game එකක් තෝරනකන් ඉන්න...</h3>`;
            window.showToast('සාර්ථකව එකතු වුණා!');
            setupDataHandler();
        } else {
            window.showToast('Code එක වැරදියි හෝ Partner නැහැ!');
            btn.innerText = 'Join Game'; 
            btn.disabled = false;
        }
    }).catch(error => {
        window.showToast('Network error එකක්!');
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
            alert(`${partnerName} game එකෙන් අයින් වුණා! කරුණාකර page එක Refresh කරන්න.`);
            location.reload();
        }
    });
}

window.goLobby = function() { showScreen('screen-lobby'); sendData({type: 'go-lobby'}); }

// --- 0. Generic Play Again System ---
let playAgainStatus = { ttt: {host: false, guest: false}, mem: {host: false, guest: false}, battle: {host: false, guest: false}, guess: {host: false, guest: false}, hunt: {host: false, guest: false} };

window.requestPlayAgain = function(game) {
    let amI = isHost ? 'host' : 'guest';
    document.getElementById(`btn-${game}-yes`).disabled = true;
    document.getElementById(`${game}-wait-text`).innerText = `⏳ ${partnerName} කැමති වෙනකන් ඉන්න...`;
    document.getElementById(`${game}-wait-text`).classList.remove('hidden');
    sendData({type: 'play-again', game: game, senderTurn: amI});
    setReadyState(game, amI);
}

function setReadyState(game, player) {
    playAgainStatus[game][player] = true;
    if(playAgainStatus[game].host && playAgainStatus[game].guest) {
        playAgainStatus[game] = {host: false, guest: false}; 
        if(game === 'ttt' && isHost) { let starter = Math.random() < 0.5 ? 'host' : 'guest'; sendData({type: 'start-ttt', turn: starter}); initTicTacToe(starter); }
        else if(game === 'mem' && isHost) { window.startMemoryMatch(); }
        else if(game === 'battle') { if(isHost) { showScreen('screen-battleship-role'); } else { showScreen('screen-battleship-wait'); document.getElementById('battle-wait-h3').innerText = "⏳ පොඩ්ඩක් ඉන්න..."; document.getElementById('battle-wait-p').innerText = `${partnerName} ඊළඟ වටය හදනකන් ඉන්න.`; } }
        else if(game === 'guess') { if(isHost) { showScreen('screen-guess'); document.getElementById('guess-setup').classList.remove('hidden'); document.getElementById('guess-pick-secret').classList.add('hidden'); document.getElementById('guess-play').classList.add('hidden'); document.getElementById('guess-result-box').classList.add('hidden'); } else { window.openGuessGuestWaiting(); } }
        else if(game === 'hunt' && isHost) { generateHuntRound(0, 0); }
    }
}

// --- 1. Memory Match ---
const allEmojis = ['🐶', '🍕', '🚀', '🌻', '🎈', '🧸', '💎', '🍓', '🚗', '🎮', '🎧', '⚽', '🎸', '🍔', '🍟', '🍦', '🍩', '🍎', '🐱', '🐼', '🦊', '🦁', '🐸', '🦄', '🌞', '🌙', '⭐', '🔥', '💧', '⚡', '👻', '👽'];
let memoryBoard = [], flippedCards = [], matchedCards = [];
let memoryTurn = 'host', scoreHost = 0, scoreGuest = 0, lockBoard = false;

window.startMemoryMatch = function() {
    if(!isHost) return window.showToast(`Game එක හැදුව කෙනාට කියන්න පටන්ගන්න කියලා!`);
    let shuffledEmojis = [...allEmojis].sort(() => 0.5 - Math.random());
    let selectedEmojis = shuffledEmojis.slice(0, 8);
    memoryBoard = [...selectedEmojis, ...selectedEmojis].sort(() => Math.random() - 0.5);
    memoryTurn = Math.random() < 0.5 ? 'host' : 'guest';
    sendData({type: 'start-memory', board: memoryBoard, turn: memoryTurn});
    initMemoryMatch(memoryBoard, memoryTurn);
}

function initMemoryMatch(board, turn) {
    memoryBoard = board; memoryTurn = turn; flippedCards = []; matchedCards = []; scoreHost = 0; scoreGuest = 0; lockBoard = false;
    showScreen('screen-memory');
    document.getElementById('mem-result-box').classList.add('hidden');
    document.getElementById('btn-mem-yes').disabled = false;
    document.getElementById('mem-wait-text').classList.add('hidden');
    const grid = document.getElementById('memory-grid');
    grid.innerHTML = '';
    for(let i=0; i<16; i++) {
        let card = document.createElement('div');
        card.className = 'm-card'; card.id = `mem-card-${i}`; card.onclick = () => handleMemoryClick(i);
        grid.appendChild(card);
    }
    updateMemoryUI();
}

function handleMemoryClick(i) {
    if(lockBoard || flippedCards.includes(i) || matchedCards.includes(i)) return;
    let amI = isHost ? 'host' : 'guest';
    if(memoryTurn !== amI) return window.showToast(`දැන් ${partnerName}ගේ වාරේ! පොඩ්ඩක් ඉන්න.`);
    sendData({type: 'memory-flip', index: i});
    processMemoryFlip(i);
}

function processMemoryFlip(i) {
    flippedCards.push(i);
    let card = document.getElementById(`mem-card-${i}`);
    card.classList.add('flipped'); card.innerText = memoryBoard[i];
    
    if(flippedCards.length === 2) {
        lockBoard = true;
        let [idx1, idx2] = flippedCards;
        let isMatch = memoryBoard[idx1] === memoryBoard[idx2];
        
        if(isMatch) {
            setTimeout(() => {
                matchedCards.push(idx1, idx2);
                document.getElementById(`mem-card-${idx1}`).classList.add('matched');
                document.getElementById(`mem-card-${idx2}`).classList.add('matched');
                if(memoryTurn === 'host') scoreHost++; else scoreGuest++;
                window.showToast("නියමයි! ගැලපෙනවා! 🎯");
                flippedCards = []; updateMemoryUI(); lockBoard = false; checkMemoryWin();
            }, 600);
        } else {
            let c1 = document.getElementById(`mem-card-${idx1}`);
            let c2 = document.getElementById(`mem-card-${idx2}`);
            c1.classList.add('shake-error'); c2.classList.add('shake-error');
            setTimeout(() => {
                c1.classList.remove('shake-error', 'flipped'); c1.innerText = '';
                c2.classList.remove('shake-error', 'flipped'); c2.innerText = '';
                memoryTurn = memoryTurn === 'host' ? 'guest' : 'host';
                flippedCards = []; updateMemoryUI(); lockBoard = false;
            }, 800);
        }
    }
}

function checkMemoryWin() {
    if(matchedCards.length === 16) {
        let amI = isHost ? 'host' : 'guest';
        let iWon = (scoreHost > scoreGuest && amI === 'host') || (scoreGuest > scoreHost && amI === 'guest');
        let draw = scoreHost === scoreGuest;
        
        let winner = draw ? '🤝 දෙන්නම සමයි (Draw)!' : (iWon ? `🎉 සුපිරි! ${myName} දිනුම්!` : `😢 අඩේ! ${partnerName} දිනුම්!`);
        let color = draw ? '#0077b6' : (iWon ? '#2b9348' : '#c1121f');
        
        if(!draw) { iWon ? window.triggerWin() : window.triggerLose(); }
        
        document.getElementById('mem-turn-indicator').innerText = "🏆 Game Over!";
        document.getElementById('mem-turn-indicator').className = "turn-indicator my-turn";
        document.getElementById('mem-result-text').innerText = winner;
        document.getElementById('mem-result-text').style.color = color;
        document.getElementById('mem-result-box').classList.remove('hidden');
    }
}

function updateMemoryUI() {
    document.getElementById('score-me-mem').innerText = isHost ? scoreHost : scoreGuest;
    document.getElementById('score-them-mem').innerText = isHost ? scoreGuest : scoreHost;
    let amI = isHost ? 'host' : 'guest';
    let ind = document.getElementById('mem-turn-indicator');
    if(matchedCards.length < 16) {
        if(memoryTurn === amI) { ind.innerText = `👉 දැන් ${myName}ගේ වාරේ`; ind.className = "turn-indicator my-turn"; } 
        else { ind.innerText = `⏳ දැන් ${partnerName}ගේ වාරේ...`; ind.className = "turn-indicator their-turn"; }
    }
}

// --- 2. Pictionary ---
const canvas = document.getElementById('drawing-board'); const ctx = canvas.getContext('2d');
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

window.startBattleshipRole = function() { showScreen('screen-battleship-role'); }
window.selectBattleRole = function(who) {
    let amI = isHost ? 'host' : 'guest';
    battleHider = (who === 'me') ? amI : (isHost ? 'guest' : 'host');
    battleSeeker = (battleHider === 'host') ? 'guest' : 'host';
    sendData({type: 'battle-role', hider: battleHider});
    if(battleHider === amI) { initBattleshipSetup(); } else { showScreen('screen-battleship-wait'); document.getElementById('battle-wait-p').innerText = `${partnerName} බෝම්බ ටික හංගනකන් ඉන්න.`; }
}

function setBattleRoleFromPartner(hider) {
    battleHider = hider; battleSeeker = (battleHider === 'host') ? 'guest' : 'host';
    let amI = isHost ? 'host' : 'guest';
    if(battleHider === amI) { initBattleshipSetup(); } else { showScreen('screen-battleship-wait'); document.getElementById('battle-wait-p').innerText = `${partnerName} බෝම්බ ටික හංගනකන් ඉන්න.`; }
}

function initBattleshipSetup() { 
    showScreen('screen-battleship-setup'); battleState = { h: [], t: [] }; updateSetupUI(); 
    const grid = document.getElementById('setup-grid'); grid.innerHTML = ''; 
    for(let i=0; i<25; i++) { let cell = document.createElement('div'); cell.className = 'cell'; cell.onclick = () => setupCellClick(cell, i); grid.appendChild(cell); } 
}

function setupCellClick(cell, i) { 
    if(battleState.h.includes(i)) { battleState.h = battleState.h.filter(x => x !== i); cell.classList.remove('heart-selected'); cell.innerHTML = ''; } 
    else if(battleState.t.includes(i)) { battleState.t = battleState.t.filter(x => x !== i); cell.classList.remove('trap-selected'); cell.innerHTML = ''; } 
    else { 
        if(battleState.h.length < 5) { battleState.h.push(i); cell.classList.add('heart-selected'); cell.innerHTML = '❤️'; } 
        else if(battleState.t.length < 5) { battleState.t.push(i); cell.classList.add('trap-selected'); cell.innerHTML = '💣'; } 
    } 
    updateSetupUI(); 
}

function updateSetupUI() { 
    document.getElementById('setup-h').innerText = 5 - battleState.h.length; document.getElementById('setup-t').innerText = 5 - battleState.t.length; 
    document.getElementById('btn-start-battle').style.display = (battleState.h.length === 5 && battleState.t.length === 5) ? 'block' : 'none'; 
}

window.sendBattleshipReady = function() { 
    sendData({type: 'battle-ready', data: battleState}); battleData = battleState; initBattleshipPlayGrid(); 
    document.getElementById('battle-instructions').innerText = `${partnerName} හොයනකන් බලාගෙන ඉන්න...`; 
}

function initBattleshipPlayGrid() { 
    let amI = isHost ? 'host' : 'guest';
    showScreen('screen-battleship-play'); 
    document.getElementById('battle-result-box').classList.add('hidden'); document.getElementById('btn-battle-yes').disabled = false; document.getElementById('battle-wait-text').classList.add('hidden');
    if(battleSeeker === amI) { document.getElementById('battle-instructions').innerText = 'බෝම්බ 3කට කලින් හදවත් 3ක් හොයන්න!'; }
    playStats = { hearts: 0, bombs: 0, done: false }; updatePlayUI(); 
    const grid = document.getElementById('play-grid'); grid.innerHTML = ''; 
    for(let i=0; i<25; i++) { 
        let cell = document.createElement('div'); cell.className = 'cell'; cell.id = `bcell-${i}`; 
        if(battleSeeker === amI) { cell.onclick = () => { if(playStats.done) return; sendData({type: 'battle-click', index: i}); processBattleClick(i); }; } 
        grid.appendChild(cell); 
    } 
}

function processBattleClick(i) { 
    if(playStats.done) return; 
    const cell = document.getElementById(`bcell-${i}`); if(cell.innerHTML !== '') return; 
    if(battleData.h.includes(i)) { cell.classList.add('revealed-heart'); cell.innerHTML = '❤️'; playStats.hearts++; } 
    else if(battleData.t.includes(i)) { cell.classList.add('revealed-trap', 'shake-error'); cell.innerHTML = '💣'; playStats.bombs++; setTimeout(() => cell.classList.remove('shake-error'), 300); } 
    else { cell.classList.add('revealed-empty', 'shake-error'); cell.innerHTML = '☁️'; setTimeout(() => cell.classList.remove('shake-error'), 300); } 
    updatePlayUI(); checkWinLoss(); 
}

function updatePlayUI() { document.getElementById('play-h').innerText = `${playStats.hearts}/3`; document.getElementById('play-b').innerText = `${playStats.bombs}/3`; }

function checkWinLoss() { 
    let amI = isHost ? 'host' : 'guest';
    let inst = document.getElementById('battle-instructions');
    let resultTxt = document.getElementById('battle-result-text');
    
    if(playStats.hearts === 3) { 
        playStats.done = true; 
        if(battleSeeker === amI) {
            inst.innerText = `🎉 සුපිරි! ${myName} දිනුම්!`; resultTxt.innerText = `🎉 සුපිරි! ${myName} දිනුම්!`; resultTxt.style.color = '#2b9348';
            window.triggerWin();
        } else {
            inst.innerText = `අයියෝ! ${partnerName} දිනුම්.`; resultTxt.innerText = `අයියෝ! ${partnerName} දිනුම්.`; resultTxt.style.color = '#c1121f';
            window.triggerLose();
        }
        showRemaining();
    } else if(playStats.bombs === 3) { 
        playStats.done = true; 
        if(battleSeeker === amI) {
            inst.innerText = `😢 බෝම්බ පෑගුනා! ${myName} පැරදුනා.`; resultTxt.innerText = `😢 බෝම්බ පෑගුනා! ${myName} පැරදුනා.`; resultTxt.style.color = '#c1121f';
            window.triggerLose();
        } else {
            inst.innerText = `🎉 නියමයි! ${partnerName} බෝම්බ වලට අහු වුණා.`; resultTxt.innerText = `🎉 නියමයි! ${partnerName} බෝම්බ වලට අහු වුණා.`; resultTxt.style.color = '#2b9348';
            window.triggerWin();
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
    "කවුද වැඩියෙන්ම අනිත් කෙනාව විහිළුවට බයිට් කරන්නේ? 😜", "කවුද වැඩියෙන්ම යූටියුබ් එකේ / ෆේස්බුක් එකේ කාලෙ කන්නේ? 📱", "කවුද වැඩියෙන්ම රෑ වෙනකන් ඇහැරන් ඉන්නේ? 🦉",
    "කවුද උදේට නැගිටින්න අමාරුම කෙනා? 🛌", "කවුද වැඩියෙන්ම ගොසිප් / අනුන්ගේ ඕපදූප හොයන්නේ? 🤫", "කවුද වැඩියෙන්ම සින්දු අහන්න ආස? 🎧",
    "කවුද වැඩියෙන්ම ෆොටෝස් වලට ලස්සනට පෝස් දෙන්නේ? 📸", "කවුද වැඩියෙන්ම කඩෙන් කෑම ඕඩර් කරන්නේ? 🛵", "කවුද වැඩියෙන්ම ඇඳුම් තෝරන්න වෙලා ගන්නේ? 👗👕",
    "කවුද වැඩියෙන්ම සල්ලි ඉතුරු කරන්නේ (ලෝබ)? 💰", "කවුද වැඩියෙන්ම ඉක්මනට තීරණ ගන්නේ? ⚡", "කවුද වැඩියෙන්ම බයගුළු? (හොල්මන් වලට/කෘමීන්ට) 👻",
    "කවුද වැඩියෙන්ම ගේම් ගහන්න ආස? 🎮", "කවුද වැඩියෙන්ම දවල් හීන දකින්නේ? 💭", "කවුද වැඩියෙන්ම ටික්ටොක් / රීල්ස් බලන්නේ? 🎬",
    "කවුද වැඩියෙන්ම කෑම උයන්න දක්ෂ / ආස? 👨‍🍳", "කවුද වැඩියෙන්ම පිරිසිදුවට පිළිවෙලට ඉන්න කැමති? 🧹", "පාර පැනගන්න බැරුව වැඩියෙන්ම බයවෙන්නේ කවුද? 🚶‍♂️",
    "කවුද වැඩියෙන්ම ඩයට් කරනවා කියලා බොරු කරන්නේ? 🥗", "කවුද වැඩියෙන්ම අනිත් කෙනාගේ ෆෝන් එක චෙක් කරන්න ආස? 👀", "කවුද වැඩියෙන්ම අඬන වෙලාවට හුරතල් වෙන්නේ? 🥺",
    "කවුද වැඩියෙන්ම මැසේජ් වලට රිප්ලයි කරන්න පරක්කු? ⏳", "කවුද වැඩියෙන්ම ඉමෝජි පාවිච්චි කරන්නේ මැසේජ් කරද්දි? 😂❤️", "කවුද වැඩියෙන්ම Voice note යවන්න ආස? 🎤",
    "කවුද වැඩියෙන්ම අනිත් කෙනාගෙ ඇඳුම් අඳින්න ආස? 👕", "කවුද වැඩියෙන්ම අනිත් කෙනාව හිනස්සන්න දක්ෂ? 🤣", "කවුද වැඩියෙන්ම ට්‍රැෆික් එකේදි බණින්නේ / කේන්ති ගන්නේ? 🚗",
    "කවුද වැඩියෙන්ම පාරවල් / ලොකේෂන් මතක තියාගන්න දක්ෂ? 🗺️", "කවුද වැඩියෙන්ම අනිත් කෙනාගේ කෑම එකෙන් උදුරන් කන්නේ? 🍛", "කවුද වැඩියෙන්ම ස්වීට් දේවල් (චොකලට්/අයිස්ක්‍රීම්) කන්න පෙරේත? 🍦",
    "කවුද වැඩියෙන්ම ස්පයිසි (සැර) කෑම කන්න ආස? 🌶️", "කවුද වැඩියෙන්ම ඉක්මනටම බොරුවට පැනික් වෙන්නේ (බය වෙන්නේ)? 😱", "කවුද වැඩියෙන්ම ෂොපින් කරද්දි බඩු තෝරන්න පැය ගණන් ගන්නේ? 🛍️",
    "කවුද වැඩියෙන්ම පාටි වලට / වෙඩින් වලට යන්න ආස? 🥳", "කවුද වැඩියෙන්ම ෆිල්ම් එකක් බලද්දි නිදාගන්නේ? 💤", "කවුද වැඩියෙන්ම ළමයින්ගේ නම් ගැන කලින්ම හිතලා තියෙන්නේ? 👶",
    "කවුද වැඩියෙන්ම ව්‍යායාම (Exercise) කරන්න කම්මැලි? 🏋️‍♂️", "කවුද වැඩියෙන්ම පරණ මැසේජ් කියව කියව ඉන්නේ? 📜", "කවුද වැඩියෙන්ම ආදරේ ප්‍රකාශ කරන්න ලැජ්ජා වෙන්නේ? 🙈",
    "කවුද වැඩියෙන්ම තෑගි දෙන්න ආස? 🎁", "කවුද වැඩියෙන්ම කතා කර කර ඉද්දි මාතෘකාවෙන් පිට පනින්නේ? 🗣️", "කවුද වැඩියෙන්ම සින්දු අහන ගමන් නටන්නේ? 🕺💃",
    "කවුද වැඩියෙන්ම වැස්සේ තෙමෙන්න කැමති? 🌧️", "කවුද වැඩියෙන්ම අනිත් කෙනාට ඇඩ්වයිස් (උපදෙස්) දෙන්නේ? 🧑‍🏫", "කවුද වැඩියෙන්ම අසනීප වුණාම ලොකුවට පෙන්නන්නේ? (Baby වෙන්නේ) 🤒",
    "කවුද වැඩියෙන්ම රහස් තියාගෙන ඉන්න බැරුව කියවන්නේ? 🤭", "කවුද වැඩියෙන්ම පරණ දේවල් / මතකයන් එකතු කරලා තියාගන්නේ? 🗃️", "කවුද වැඩියෙන්ම අනිත් කෙනාව ඊර්ෂ්‍යා කරවන්න හදන්නේ? 😒",
    "කවුද වැඩියෙන්ම අලුත් දේවල් ට්‍රයි කරන්න බය? 🛑", "කවුද වැඩියෙන්ම ටීවී සීරීස් එකක් එක දිගට බලලා ඉවර කරන්නේ? 📺", "කවුද වැඩියෙන්ම පබ්ලික් ප්ලේස් වලදි (පිටදි) රොමෑන්ටික් වෙන්න ලැජ්ජා? 😳",
    "කවුද වැඩියෙන්ම කෑම කද්දි සද්දෙට කන්නේ? 🍽️", "කවුද වැඩියෙන්ම අනිත් කෙනාට හොරෙන් කෑම කන්නේ? 🍩", "කවුද වැඩියෙන්ම අනිත් කෙනාගේ උපන්දිනේට සප්‍රයිස් ප්ලෑන් කරන්නේ? 🎉",
    "කවුද වැඩියෙන්ම හීනෙන් කතා කරන්නේ / ඇවිදින්නේ? 🌙", "කවුද වැඩියෙන්ම වාහනේ යද්දි සින්දු කියන්නේ? 🚘", "කවුද වැඩියෙන්ම ඉක්මනටම යාලුවෝ හදාගන්නේ? 🤝",
    "කවුද වැඩියෙන්ම අනිත් කෙනාට පටබැඳි නම් (Nicknames) දාන්නේ? 🐼", "කවුද වැඩියෙන්ම තමන්ගේ කොණ්ඩෙ ගැන වද වෙන්නේ? 💇‍♂️", "කවුද වැඩියෙන්ම හෙඩ්සෙට් එක ගහගෙන ලෝකෙම අමතක කරලා ඉන්නේ? 🎧",
    "කවුද වැඩියෙන්ම ෆෝන් එක චාජ් කරන්න අමතක කරන්නේ? 🔋", "කවුද වැඩියෙන්ම අනිත් කෙනාගේ පෝස්ට් වලට මුලින්ම කමෙන්ට් / ලයික් කරන්නේ? 👍", "කවුද වැඩියෙන්ම අනතුරුවලට ලක් වෙන්නේ? (පය පැටලීම, වැටීම) 🤕",
    "කවුද වැඩියෙන්ම කතා කරද්දි අතපය වනලා කතා කරන්නේ? 🤷‍♂️", "කවුද වැඩියෙන්ම සත්තු දැක්කම ආදරේට වඩා බය වෙන්නේ? 🐕", "කවුද වැඩියෙන්ම අලුත් ට්‍රෙන්ඩ්ස් (Trends) ෆලෝ කරන්නේ? 🔥",
    "කවුද වැඩියෙන්ම ගෙදර අයට බය? 🏠", "කවුද වැඩියෙන්ම අනිත් කෙනාව කේන්ති ගස්සලා ආතල් ගන්නේ? 😈", "කවුද වැඩියෙන්ම වීඩියෝ කෝල් වලදි ලස්සනට පේන්න ට්‍රයි කරන්නේ? 📞",
    "කවුද වැඩියෙන්ම පරණ ෆොටෝස් බල බල හිනා වෙන්නේ? 🖼️", "කවුද වැඩියෙන්ම අනිත් කෙනාගේ අඩුපාඩු හොයන්නේ? 🔎", "කවුද වැඩියෙන්ම අනේ මන්දා කිය කිය සුසුම් හෙලන්නේ? 😮‍💨",
    "කවුද වැඩියෙන්ම පාන්දර ජාමේ ඇහැරිලා මැසේජ් කරන්නේ? 🌄", "කවුද වැඩියෙන්ම ගමනක් යන්න ලෑස්ති වෙන්න පැය ගාණක් ගන්නේ? ⌚", "කවුද වැඩියෙන්ම බෑග් එකේ අනවශ්‍ය බඩු පුරවන් යන්නේ? 🎒",
    "කවුද වැඩියෙන්ම මූණ එල්ලගෙන ඉඳලා ඉක්මනට හිනා වෙන්නේ? 😆", "කවුද වැඩියෙන්ම රණ්ඩු වෙලා පැයක් යන්න කලින් කතා කරන්නේ? 🕊️", "කවුද වැඩියෙන්ම අනිත් කෙනාට ලව් සෝන්ග්ස් (Love songs) යවන්නේ? 🎵",
    "කවුද වැඩියෙන්ම අනිත් කෙනාගේ යාලුවෝ එක්ක ඉක්මනට ෆිට් වෙන්නේ? 🍻", "කවුද වැඩියෙන්ම කඩේකට ගියාම මොනවා ගන්නද කියලා හිතාගන්න බැරුව ලතවෙන්නේ? 🤔", "කවුද වැඩියෙන්ම ගෑස් / ලයිට් ඕෆ් කරාද කියලා ආයේ ආයේ බලන්නේ? 🔦",
    "කවුද වැඩියෙන්ම ඩිස්කවුන්ට් / සේල් තියෙන තැන් හොයන්නේ? 🏷️", "කවුද වැඩියෙන්ම ලස්සන ෆියුචර් හවුස් (අනාගත ගෙදර) එක ගැන හිතන්නේ? 🏡", "කවුද වැඩියෙන්ම පොඩි ළමයෙක් වගේ හුරතල් වෙන්නේ? 🍼",
    "කවුද වැඩියෙන්ම අනිත් කෙනාව ආරක්ෂා කරන්න (Protect කරන්න) හදන්නේ? 🛡️", "කවුද වැඩියෙන්ම ලස්සනට කතා කරලා අනිත් කෙනාව රවට්ටගන්නේ? 🎭", "කවුද වැඩියෙන්ම රෑට නිදාගන්න කලින් අනාගතේ ගැන කතා කරන්නේ? 🌌",
    "කවුද වැඩියෙන්ම ෆෝන් එකේ ස්ක්‍රීන් ටයිම් (Screen Time) එක වැඩි? 📈", "කවුද වැඩියෙන්ම අනිත් කෙනාව බලන්න ඕනෙ කියලා මුලින්ම කියන්නේ? 🏃‍♂️", "කවුද වැඩියෙන්ම ඩේට් එකට ගියාම කෑම එකේ ෆොටෝස් ගන්නේ? 🍜",
    "කවුද වැඩියෙන්ම අඬනකොට කැත? 😭", "කවුද වැඩියෙන්ම ආදරෙන් බදාගන්න (Hugs) කැමති? 🤗", "කවුද වැඩියෙන්ම හිතුවක්කාර විදිහට වැඩ කරන්නේ? 😤",
    "කවුද වැඩියෙන්ම කොහේ හරි ගියාම අතරමං වෙන්නේ? 🧭", "කවුද වැඩියෙන්ම අනිත් කෙනාගේ ඇස් දිහා බලන් ඉන්න ලැජ්ජා? 👁️", "කවුද වැඩියෙන්ම තමන්ගේ පාඩුවේ පැත්තකට වෙලා ඉන්න කැමති? 🧘‍♂️",
    "කවුද වැඩියෙන්ම තමන්ට වඩා අනිත් කෙනා ගැන හිතන්නේ? 💞", "කවුද වැඩියෙන්ම එකම සින්දුව ආයේ ආයේ අහන්නේ? 🔁", "කවුද වැඩියෙන්ම පවුලේ අය ගැන කතා කරන්න ආස? 👨‍👩‍👧‍👦",
    "කවුද වැඩියෙන්ම මේ සම්බන්ධය ගැන ලොකුම විශ්වාසෙකින් ඉන්නේ? 💍"
];
let availableQuestions = []; let currentQIndex = 0, myQuizAns = null, partnerQuizAns = null;

window.startQuiz = function() { 
    if(!isHost) return window.showToast("Game එක හැදුව කෙනාට කියන්න Quiz එක ඔබන්න කියලා!"); 
    if (availableQuestions.length === 0) { availableQuestions = quizQuestions.map((_, index) => index); window.showToast("අලුත් වටයක් පටන් ගත්තා! 🔄"); }
    const randomIndex = Math.floor(Math.random() * availableQuestions.length); currentQIndex = availableQuestions[randomIndex]; availableQuestions.splice(randomIndex, 1);
    sendData({type: 'start-quiz', qIndex: currentQIndex}); initQuiz(currentQIndex); 
}

function initQuiz(qIndex) { 
    currentQIndex = qIndex; myQuizAns = null; partnerQuizAns = null; showScreen('screen-quiz'); 
    document.getElementById('quiz-q-text').innerText = quizQuestions[qIndex]; 
    document.getElementById('quiz-question-container').classList.remove('hidden'); document.getElementById('quiz-waiting').classList.add('hidden'); document.getElementById('quiz-result').classList.add('hidden'); document.getElementById('btn-next-quiz').classList.add('hidden'); 
}

window.submitQuizAns = function(ans) { 
    let absoluteAns = isHost ? (ans === 'me' ? 'host' : 'guest') : (ans === 'me' ? 'guest' : 'host'); 
    myQuizAns = absoluteAns; sendData({type: 'quiz-ans', ans: absoluteAns}); 
    document.getElementById('quiz-question-container').classList.add('hidden'); checkQuizResults(); 
}

function checkQuizResults() { 
    if(myQuizAns && partnerQuizAns) { 
        document.getElementById('quiz-waiting').classList.add('hidden'); document.getElementById('quiz-result').classList.remove('hidden'); 
        let resTitle = document.getElementById('quiz-result-title'); let resDetail = document.getElementById('quiz-result-detail'); 
        if(myQuizAns === partnerQuizAns) { 
            resTitle.innerText = "🎉 දෙන්නම එකඟයි!"; resTitle.style.color = "#2b9348"; 
            let who = (isHost && myQuizAns === 'guest') || (!isHost && myQuizAns === 'host') ? partnerName : myName; 
            resDetail.innerText = `දෙන්නම පිළිගත්තා වැඩියෙන්ම ඒ දේ කරන්නේ '${who}' කියලා! 😂❤️`; 
        } else { 
            resTitle.innerText = "⚔️ දෙන්නට දෙකක්!"; resTitle.style.color = "#c1121f"; resDetail.innerText = "මෙතන නම් ලොකු වලියක් යයි වගේ! 😅 දෙන්නම කියන්නේ අනිත් කෙනා කියලා."; 
        } 
        if(isHost) { document.getElementById('btn-next-quiz').classList.remove('hidden'); } 
    } else if (myQuizAns) { document.getElementById('quiz-waiting').classList.remove('hidden'); } 
}

window.nextQuizQ = function() { window.startQuiz(); }

// --- 5. Guess the Number ---
let guessMax = 100, mySecret = null, partnerSecret = null;
let guessTurn = 'host', isGuessGameOver = false;

window.openGuessSetup = function() {
    sendData({type: 'start-guess-setup'});
    if(isHost) { showScreen('screen-guess'); document.getElementById('guess-setup').classList.remove('hidden'); document.getElementById('guess-pick-secret').classList.add('hidden'); document.getElementById('guess-play').classList.add('hidden'); document.getElementById('guess-result-box').classList.add('hidden'); } else { window.openGuessGuestWaiting(); }
}

window.openGuessGuestWaiting = function() { showScreen('screen-guess'); document.getElementById('guess-setup').classList.add('hidden'); document.getElementById('guess-play').classList.add('hidden'); document.getElementById('guess-result-box').classList.add('hidden'); let pickDiv = document.getElementById('guess-pick-secret'); pickDiv.innerHTML = `<div class="result-box"><h3>⏳ පොඩ්ඩක් ඉන්න...</h3><p>${partnerName} උපරිම ඉලක්කම තෝරනකන් ඉන්න.</p></div>`; pickDiv.classList.remove('hidden'); }

window.startGameGuess = function() { guessMax = parseInt(document.getElementById('guess-max-limit').value); guessTurn = Math.random() < 0.5 ? 'host' : 'guest'; sendData({type: 'guess-range', max: guessMax, turn: guessTurn}); initPickSecret(guessMax, guessTurn); }

function initPickSecret(max, turn) {
    guessMax = max; mySecret = null; partnerSecret = null; isGuessGameOver = false; guessTurn = turn;
    showScreen('screen-guess'); document.getElementById('guess-setup').classList.add('hidden'); document.getElementById('guess-play').classList.add('hidden'); document.getElementById('guess-result-box').classList.add('hidden'); document.getElementById('btn-guess-yes').disabled = false; document.getElementById('guess-wait-text').classList.add('hidden');
    let pickDiv = document.getElementById('guess-pick-secret'); pickDiv.classList.remove('hidden');
    pickDiv.innerHTML = `<p>1 ත් ${max} ත් අතර ඔයාගේ රහස් ඉලක්කම හිතාගෙන මෙතන ගහන්න! 🤫</p><input type="number" id="secret-input" placeholder="රහස් ඉලක්කම..." style="padding: 12px; border-radius: 15px; border: 2px solid #ffb3c6; text-align: center; font-size: 16px; width: 85%; margin-bottom: 15px; outline: none; background: #fff0f3;"><button onclick="submitSecret()">ලෑස්තියි</button><p id="secret-wait-text" class="hidden" style="color: #2b9348; margin-top: 15px; font-weight: bold;">⏳ ${partnerName} ඉලක්කම හිතනකන් ඉන්න...</p>`;
}

window.submitSecret = function() {
    let val = parseInt(document.getElementById('secret-input').value);
    if(isNaN(val) || val < 1 || val > guessMax) { document.getElementById('secret-input').classList.add('shake-error'); setTimeout(() => document.getElementById('secret-input').classList.remove('shake-error'), 300); return window.showToast(`කරුණාකර 1ත් ${guessMax}ත් අතර ඉලක්කමක් දෙන්න!`); }
    mySecret = val; document.getElementById('secret-input').disabled = true; document.getElementById('secret-wait-text').classList.remove('hidden'); sendData({type: 'guess-secret', secret: mySecret}); checkBothSecrets();
}

function checkBothSecrets() { if(mySecret !== null && partnerSecret !== null) { startGuessingPhase(); } }

function startGuessingPhase() {
    document.getElementById('guess-pick-secret').classList.add('hidden'); document.getElementById('guess-play').classList.remove('hidden');
    document.getElementById('guess-instruction').innerText = `දැන් ${partnerName} හිතපු ඉලක්කම හොයමු! (උපරිමය ${guessMax})`; document.getElementById('guess-hint-text').innerHTML = "ඔයාගේ Guess එක ගහන්න 👇"; document.getElementById('guess-hint-text').style.color = "#590d22"; document.getElementById('partner-hint-text').innerHTML = ""; document.getElementById('guess-input').value = ''; updateGuessUI();
}

window.submitGuess = function() {
    let amI = isHost ? 'host' : 'guest';
    if(guessTurn !== amI || isGuessGameOver) return window.showToast(`දැන් ${partnerName}ගේ වාරේ! පොඩ්ඩක් ඉන්න.`);
    let myGuess = parseInt(document.getElementById('guess-input').value);
    if(isNaN(myGuess) || myGuess < 1 || myGuess > guessMax) { document.getElementById('guess-input').classList.add('shake-error'); setTimeout(() => document.getElementById('guess-input').classList.remove('shake-error'), 300); return window.showToast(`කරුණාකර 1ත් ${guessMax}ත් අතර ඉලක්කමක් දෙන්න!`); }
    document.getElementById('guess-input').value = '';
    
    if(myGuess === partnerSecret) { handleWin(amI); } 
    else {
        document.getElementById('guess-input').classList.add('shake-error'); setTimeout(() => document.getElementById('guess-input').classList.remove('shake-error'), 300);
        let hintText = document.getElementById('guess-hint-text');
        if(myGuess < partnerSecret) { hintText.innerHTML = `⬆️ මදි! ${partnerName} හිතපු ඉලක්කම <b>${myGuess}</b> ට වඩා වැඩියි!`; hintText.style.color = "#0077b6"; } 
        else { hintText.innerHTML = `⬇️ වැඩියි! ${partnerName} හිතපු ඉලක්කම <b>${myGuess}</b> ට වඩා අඩුයි!`; hintText.style.color = "#c1121f"; }
        guessTurn = guessTurn === 'host' ? 'guest' : 'host'; sendData({type: 'guess-try', guess: myGuess}); updateGuessUI();
    }
}

function processPartnerGuess(guess) {
    let hintText = document.getElementById('partner-hint-text');
    if(guess < mySecret) { hintText.innerHTML = `💡 ${partnerName} <b>${guess}</b> ගැහුවා. ඒක ඔයාගේ ඉලක්කමට වඩා අඩුයි!`; } 
    else { hintText.innerHTML = `💡 ${partnerName} <b>${guess}</b> ගැහුවා. ඒක ඔයාගේ ඉලක්කමට වඩා වැඩියි!`; }
    guessTurn = guessTurn === 'host' ? 'guest' : 'host'; updateGuessUI();
}

function handleWin(winner) {
    isGuessGameOver = true; let amIWinner = (winner === (isHost ? 'host' : 'guest'));
    let resultTxt = document.getElementById('guess-result-text'); document.getElementById('guess-hint-text').innerHTML = ""; document.getElementById('partner-hint-text').innerHTML = "";
    
    if(amIWinner) {
        resultTxt.innerText = `🎉 සුපිරි! ${myName} දිනුම්! ${partnerName} හිතපු ඉලක්කම: ${partnerSecret}`; resultTxt.style.color = "#2b9348"; sendData({type: 'guess-win'}); 
        window.triggerWin();
    } else {
        resultTxt.innerText = `😢 අඩේ! ${partnerName} දිනුම්! ${partnerName} හිතලා තිබ්බේ: ${partnerSecret}`; resultTxt.style.color = "#c1121f";
        window.triggerLose();
    }
    document.getElementById('guess-result-box').classList.remove('hidden'); document.getElementById('guess-turn-indicator').innerText = amIWinner ? `🏆 ${myName} දිනුම්!` : `🏆 ${partnerName} දිනුම්!`; document.getElementById('guess-turn-indicator').className = "turn-indicator my-turn"; document.getElementById('btn-submit-guess').disabled = true;
}

function updateGuessUI() {
    if(isGuessGameOver) return; let amI = isHost ? 'host' : 'guest'; let ind = document.getElementById('guess-turn-indicator');
    if(guessTurn === amI) { ind.innerText = `👉 දැන් ${myName}ගේ වාරේ (ගෙස් කරන්න)`; ind.className = "turn-indicator my-turn"; document.getElementById('btn-submit-guess').disabled = false; } 
    else { ind.innerText = `⏳ දැන් ${partnerName}ගේ වාරේ...`; ind.className = "turn-indicator their-turn"; document.getElementById('btn-submit-guess').disabled = true; }
}

// --- 6. Tic Tac Toe (❤️ & ❌) ---
let tttBoard = Array(9).fill(null); let tttTurn = 'host'; let tttGameOver = false;
const winPatterns = [ [0,1,2], [3,4,5], [6,7,8], [0,3,6], [1,4,7], [2,5,8], [0,4,8], [2,4,6] ];

window.startTicTacToe = function() { if(!isHost) return; let starter = Math.random() < 0.5 ? 'host' : 'guest'; sendData({type: 'start-ttt', turn: starter}); initTicTacToe(starter); }

function initTicTacToe(turn) {
    tttBoard = Array(9).fill(null); tttTurn = turn; tttGameOver = false; showScreen('screen-tictactoe'); document.getElementById('ttt-result-box').classList.add('hidden'); document.getElementById('btn-ttt-yes').disabled = false; document.getElementById('ttt-wait-text').classList.add('hidden');
    const grid = document.getElementById('ttt-grid'); grid.innerHTML = '';
    for(let i=0; i<9; i++) { let cell = document.createElement('div'); cell.className = 'ttt-cell'; cell.id = `ttt-cell-${i}`; cell.onclick = () => handleTttClick(i); grid.appendChild(cell); }
    updateTttUI();
}

function handleTttClick(i) {
    if(tttGameOver || tttBoard[i] !== null) return; let amI = isHost ? 'host' : 'guest';
    if(tttTurn !== amI) return window.showToast(`දැන් ${partnerName}ගේ වාරේ!`);
    sendData({type: 'ttt-move', index: i}); processTttMove(i);
}

function processTttMove(i) {
    tttBoard[i] = tttTurn; let cell = document.getElementById(`ttt-cell-${i}`); cell.innerText = tttTurn === 'host' ? '❌' : '❤️'; cell.classList.add('taken');
    if (checkTttWin(tttTurn)) { tttGameOver = true; handleTttEnd(tttTurn === (isHost ? 'host' : 'guest') ? 'win' : 'lose', tttTurn); } 
    else if (!tttBoard.includes(null)) { tttGameOver = true; handleTttEnd('draw', null); } 
    else { tttTurn = tttTurn === 'host' ? 'guest' : 'host'; updateTttUI(); }
}

function checkTttWin(player) {
    for(let pattern of winPatterns) {
        const [a,b,c] = pattern;
        if(tttBoard[a] === player && tttBoard[b] === player && tttBoard[c] === player) {
            document.getElementById(`ttt-cell-${a}`).classList.add('win-cell'); document.getElementById(`ttt-cell-${b}`).classList.add('win-cell'); document.getElementById(`ttt-cell-${c}`).classList.add('win-cell');
            return true;
        }
    } return false;
}

function handleTttEnd(result, winner) {
    let text = "";
    if(result === 'win') { text = `🎉 සුපිරි! ${myName} දිනුම්!`; window.triggerWin(); }
    else if(result === 'lose') { text = `😢 අඩේ! ${partnerName} දිනුම්!`; window.triggerLose(); }
    else { text = "🤝 තරඟය සමයි! (Draw)"; }
    
    document.getElementById('ttt-result-text').innerText = text; document.getElementById('ttt-result-text').style.color = result === 'win' ? '#2b9348' : (result === 'lose' ? '#c1121f' : '#0077b6'); document.getElementById('ttt-result-box').classList.remove('hidden'); document.getElementById('ttt-turn-indicator').innerText = "🏆 Game Over!"; document.getElementById('ttt-turn-indicator').className = "turn-indicator my-turn";
}

function updateTttUI() {
    if(tttGameOver) return; let amI = isHost ? 'host' : 'guest'; let ind = document.getElementById('ttt-turn-indicator');
    if(tttTurn === amI) { ind.innerText = `👉 දැන් ${myName}ගේ වාරේ (${isHost ? '❌' : '❤️'})`; ind.className = "turn-indicator my-turn"; } 
    else { ind.innerText = `⏳ දැන් ${partnerName}ගේ වාරේ (${!isHost ? '❌' : '❤️'})...`; ind.className = "turn-indicator their-turn"; }
}

// --- 8. Number Hunt ---
let huntBoard = [], huntTarget = null, huntScoreH = 0, huntScoreG = 0;

window.startNumberHunt = function() { if(!isHost) return window.showToast("Game එක හැදුව කෙනාට කියන්න පටන්ගන්න කියලා!"); generateHuntRound(0, 0); }

function generateHuntRound(scoreH, scoreG) {
    let nums = []; while(nums.length < 25) { let r = Math.floor(Math.random() * 99) + 1; if(!nums.includes(r)) nums.push(r); }
    let target = nums[Math.floor(Math.random() * 25)]; sendData({type: 'start-hunt', board: nums, target: target, scoreH: scoreH, scoreG: scoreG}); initHuntBoard(nums, target, scoreH, scoreG);
}

function initHuntBoard(board, target, scoreH, scoreG) {
    huntBoard = board; huntTarget = target; huntScoreH = scoreH; huntScoreG = scoreG; showScreen('screen-hunt');
    document.getElementById('hunt-result-box').classList.add('hidden'); document.getElementById('btn-hunt-yes').disabled = false; document.getElementById('hunt-wait-text').classList.add('hidden');
    document.getElementById('score-me-hunt').innerText = isHost ? scoreH : scoreG; document.getElementById('score-them-hunt').innerText = isHost ? scoreG : scoreH; document.getElementById('hunt-target-box').innerText = target;
    if (scoreH >= 5 || scoreG >= 5) { endHuntGame(); return; }
    const grid = document.getElementById('hunt-grid'); grid.innerHTML = '';
    for(let i=0; i<25; i++) { let cell = document.createElement('div'); cell.className = 'h-cell'; cell.id = 'hcell-' + i; cell.innerText = board[i]; cell.onclick = () => handleHuntClick(board[i], i); grid.appendChild(cell); }
}

function handleHuntClick(num, idx) {
    if(num === huntTarget) { if(isHost) { generateHuntRound(huntScoreH + 1, huntScoreG); } else { sendData({type: 'hunt-click', num: num}); } } 
    else { let cell = document.getElementById('hcell-' + idx); if (cell) { cell.classList.add('shake-error'); setTimeout(() => cell.classList.remove('shake-error'), 300); } window.showToast("❌ වැරදියි! ආයේ බලන්න."); }
}

function handlePartnerHuntClick(num) { if(isHost && num === huntTarget) { generateHuntRound(huntScoreH, huntScoreG + 1); } }

function endHuntGame() {
    document.getElementById('hunt-grid').innerHTML = ''; document.getElementById('hunt-target-box').innerText = '--';
    let winner = document.getElementById('hunt-result-text'); let amI = isHost ? 'host' : 'guest';
    let iWon = (huntScoreH >= 5 && amI === 'host') || (huntScoreG >= 5 && amI === 'guest');
    
    if (iWon) {
        winner.innerText = `🎉 සුපිරි! ${myName} දිනුම්!`; winner.style.color = "#2b9348";
        window.triggerWin();
    } else {
        winner.innerText = `😢 අඩේ! ${partnerName} දිනුම්!`; winner.style.color = "#c1121f";
        window.triggerLose();
    }
    document.getElementById('hunt-result-box').classList.remove('hidden');
}
