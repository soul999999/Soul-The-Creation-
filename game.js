// ===== 基本 =====
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ===== モードと自動切替 =====
let mode = "action";                   // "action" or "rhythm"
let autoSwitch = true;
let phaseIndex = 0;
const phases = [
  { mode: "action", duration: 36 },
  { mode: "rhythm", duration: 36 },
];
let phaseStartTime = 0;
function exitRhythmMode() {
  mode = "action";   // ← アクションに戻す
  notes = [];        // 画面に残ってるノーツを消す
  judgeTexts = []; 
    // 判定文字も消す（任意）
}

function setMode(newMode) {
  if (mode === newMode) return; // 同じなら何もしない
  if (newMode === "rhythm") {
    enterRhythmMode();
  } else {
    exitRhythmMode();
  }
  console.log("[setMode] ->", mode); // デバッグ表示（任意）
}

// Rhythmモードを抜けて元のゲームに戻る関数
function exitRhythmMode() {
  mode = "action";     // アクションへ戻す
  notes = [];          // ノーツ消す
  judgeTexts = [];     // 判定文字消す
  combo = 0;           // コンボリセット（好み）
}



// ===== 音ゲー用 変数 =====
const lanes = [200, 320, 440, 560];     // 4レーン
const laneKeys = ["d", "f", "j", "k"];
const noteSpeed = 300;
const hitLineY = 330;
let chart = [];
let notes = [];
let rhythmStartedAt = 0;
let score = 0;
let combo = 0;
// 判定文字の一時表示用（フェードして消える）
let judgeTexts = []; 
// 形: { text:"PERFECT", x:数値, y:数値, life:秒, color:"#fff" }


// ===== 画像とBGM =====
const soulImage = new Image();
soulImage.src = "soul.png";
const errorImage = new Image();
errorImage.src = "error.png";

const bgm = new Audio("bgm1mini.m4a");
bgm.loop = true;
bgm.volume = 0.5;
let bgmStarted = false;

// ===== アクション用 変数 =====
let keys = {};
let isJumping = false;
let jumpTime = 0;
const maxJumpTime = 19;

let life = 10;
let isGameOver = false;
let wasHit = false;
function takeDamage(amount = 1) {
  if (isGameOver) return;
  life -= amount;
  if (life <= 0) {
    life = 0;
    isGameOver = true;
  }
}

const gravity = 0.5;
const floorY = 340;
let isHit = false;

let soul = {
  x: 100, y: 300, width: 80, height: 80,
  vx: 0, vy: 0, speed: 5, onGround: false
};

// error をこう定義する（既存を置き換え）
let error = {
  x: 500,
  y: 200,               // 初期の高さ
  width: 80,
  height: 80,
  vx: 2.0,              // 横移動速度
  baseY: 200,           // 上下動の基準高さ
  amplitude: 80,        // 揺れの大きさ（大きいほど上下に動く）
  angle: 0              // サイン波の角度
};


  // いつでも同じ高さから出てくるリフト
let lifts = [
  { x: 700,  y: floorY - 90,  width: 120, height: 20, vx: -3,  spawnY: floorY - 90  },
  { x: 700, y: floorY - 170, width: 120, height: 20, vx: -3,  spawnY: floorY - 170 },
  { x: 700, y: floorY - 250, width: 120, height: 20, vx: -3, spawnY: floorY - 250 },
  { x: 1000,  y: floorY - 90,  width: 120, height: 20, vx: -3,  spawnY: floorY -90  },
  { x: 1000, y: floorY - 170, width: 120, height: 20, vx: -3,  spawnY: floorY - 170 },
  { x: 1000, y: floorY - 250, width: 120, height: 20, vx: -3, spawnY: floorY - 250 },
  { x: 1300,  y: floorY - 90,  width: 120, height: 20, vx: -3,  spawnY: floorY - 90  }, 
  { x: 1300, y: floorY - 170, width: 120, height: 20, vx: -3,  spawnY: floorY - 170 },
  { x: 1300, y: floorY - 250, width: 120, height: 20, vx: -3, spawnY: floorY - 250 },
  { x: 1600,  y: floorY - 90,  width: 120, height: 20, vx: -3,  spawnY: floorY - 90  }, 
  { x: 1600, y: floorY - 170, width: 120, height: 20, vx: -3,  spawnY: floorY - 170 },
  { x: 1600, y: floorY - 250, width: 120, height: 20, vx: -3, spawnY: floorY - 250 },
];


// リフトが再出現する高さの候補（好みで増減OK）
const liftHeights = [floorY - 90, floorY - 160, floorY - 230];


// 決め打ちの攻撃高さ
const attackHeights = [floorY - 80, floorY - 160, floorY - 240, floorY - 320];

let attacks = [];
const attackCount = 7;
for (let i = 0; i < attackCount; i++) {
  const h = attackHeights[Math.floor(Math.random() * attackHeights.length)];
  attacks.push({
    x: canvas.width + i * 150,
    y: h,
    width: 20,
    height: 80,
    speed: 3 + Math.random() * 3
  });
}



// ===== 入力 =====
document.addEventListener("keydown", (e) => {
  keys[e.key] = true;

  if (!bgmStarted) {
    bgm.play().catch(()=>{});
    bgmStarted = true;
  }

  // アクションのジャンプ
  if (mode === "action" && (e.key === " " || e.key === "ArrowUp") && soul.onGround) {
    isJumping = true;
    jumpTime = 0;
    soul.vy = -2;
    soul.onGround = false;
  }

  
  

  // 音ゲー判定（キー押下で判定）
  if (mode === "rhythm") {
    const idx = laneKeys.indexOf(e.key.toLowerCase());
    if (idx !== -1) judgeHit(idx);
  }
});

document.addEventListener("keyup", (e) => {
  keys[e.key] = false;
  if (e.key === " " || e.key === "ArrowUp") isJumping = false;
});

// ===== アクション更新・描画 =====
function update() {
  if (isGameOver) return;

  soul.onGround = false;

  // 横移動
  if (keys["ArrowLeft"]) soul.vx = -soul.speed;
  else if (keys["ArrowRight"]) soul.vx = soul.speed;
  else soul.vx = 0;

  // 長押しジャンプ
  if (isJumping && jumpTime < maxJumpTime) {
    soul.vy -= 1;
    jumpTime++;
  }

   // リフトを右→左へ流し、画面外に出たら右から再出現
for (let lift of lifts) {
  // 移動
  lift.x += lift.vx;

 // 左端へ抜けたら右側へ再出現（高さは固定）
if (lift.x + lift.width < 0) {
  lift.x = canvas.width + 250;   // 右の外から
  lift.y = lift.spawnY;          // いつも同じ高さ
}


  // 乗っているか？（上から着地＆めり込み防止）
  const onLift =
    soul.x + soul.width > lift.x +50&&
    soul.x < lift.x + lift.width -50&&
    soul.y + soul.height >= lift.y -5 &&
    soul.y + soul.height <= lift.y + lift.height &&
    soul.vy >= 0;

  if (onLift) {
    soul.y = lift.y - soul.height; // 上に乗せる
    soul.vy = 0;
    soul.onGround = true;
    isJumping = false;

    // リフトに“運ばれる”
    soul.x += lift.vx;
  }
}
// --- error（敵）の飛行 ---
error.x += error.vx;                     // 横移動
error.angle += 0.05;                     // 角速度（小さくするとゆっくり）
error.y = error.baseY + Math.sin(error.angle) * error.amplitude; // フワフワ

// 画面外に出たら反対側から再登場（横方向にループ）
// 左に抜けた → 右から
if (error.x + error.width < 0) {
  error.x = canvas.width + 150;
  // 高さは候補から選んで baseY を更新（次のサイン波の中心）
  const heights = [floorY - 80, floorY - 160, floorY - 240];
  error.baseY = heights[Math.floor(Math.random() * heights.length)];
  error.angle = 0; // 見た目が綺麗になるように角度もリセット（任意）
}
// 右に抜けた → 左から
else if (error.x > canvas.width + 50) {
  error.x = -error.width - 150;
  const heights = [floorY - 80, floorY - 160, floorY - 240];
  error.baseY = heights[Math.floor(Math.random() * heights.length)];
  error.angle = 0;
}
// 画面端で反転
if (error.x < 0 || error.x + error.width > canvas.width) {
  error.vx *= -1;
}


  // 重力＆位置更新
  soul.vy += gravity;
  soul.x += soul.vx;
  soul.y += soul.vy;

  // 地面
  if (soul.y + soul.height >= floorY) {
    soul.y = floorY - soul.height;
    soul.vy = 0;
    soul.onGround = true;
    isJumping = false;
  }

  // 画面端
  if (soul.x < 0) soul.x = 0;
  if (soul.x + soul.width > canvas.width) soul.x = canvas.width - soul.width;

  // 攻撃の移動＆当たり
  isHit = false;
  for (let atk of attacks) {
    atk.x -= atk.speed;
    if (atk.x + atk.width < 0) {
      atk.x = canvas.width + Math.random() * 300;
      atk.y = attackHeights[Math.floor(Math.random() * attackHeights.length)];
    }

    // 当たり判定
    if (
      soul.x < atk.x + atk.width &&
      soul.x + soul.width - 33 > atk.x &&
      soul.y < atk.y + atk.height - 60 &&
      soul.y + soul.height > atk.y
    ) {
      isHit = true;
      if (!wasHit) {
        life--;
        wasHit = true;
        if (life <= 0) isGameOver = true;
      }
    }
  }
  if (!isHit) wasHit = false;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = "white";          // 白を選択
ctx.fillRect(0, 0, canvas.width, canvas.height); // 全画面を白で塗りつぶす

  // 地面
  ctx.fillStyle = "#999";
  ctx.fillRect(0, floorY, canvas.width, 60);

  // キャラ・敵
  ctx.drawImage(soulImage, soul.x, soul.y, soul.width, soul.height);
  ctx.drawImage(errorImage, error.x, error.y, error.width, error.height);

  // 攻撃
  for (let atk of attacks) {
    ctx.fillStyle = isHit ? "red" : "black";
    ctx.fillRect(atk.x, atk.y, atk.width, atk.height);
  }

  // リフト
  ctx.fillStyle = "#00ffe1ff";
  for (let lift of lifts) {
    ctx.fillRect(lift.x, lift.y, lift.width, lift.height);
  }

  // HUD
  ctx.fillStyle = "#000";
  ctx.font = "20px sans-serif";
  ctx.fillText("ライフ: " + life, 20, 30);

  if (isHit) {
    ctx.fillStyle = "red";
    ctx.font = "30px sans-serif";
    ctx.fillText("当たった！", 350, 100);
  }

  if (isGameOver) {
    ctx.fillStyle = "red";
    ctx.font = "40px sans-serif";
    ctx.fillText("ゲームオーバー", 280, 200);
  }
}
function showJudge(text, x, y, color = "#ffffff") {
  judgeTexts.push({ text, x, y, life: 0.8, color }); // lifeは表示秒数
  
}

// ===== 音ゲー：入出 =====
function enterRhythmMode() {
  mode = "rhythm";
  score = 0; combo = 0; notes = [];

  chart = [];

  const totalSec = 34;      // 36秒間ノーツを出す
  const startOffset = 0.4;  // 曲頭の余白（見やすさ用）
  const step = 0.4;        // 0.25秒ごとにノーツ（密度を上げるなら 0.2 や 0.125）

  for (let t = startOffset; t <= totalSec; t += step) {
    // 必ず1つは出す
    const a = Math.floor(Math.random() * lanes.length);
    chart.push({ t, lane: a });

    // ときどき同時押しを追加（重たければ確率を下げる）
    if (Math.random() < 0.05) {
      let b = Math.floor(Math.random() * lanes.length);
      while (b === a) b = Math.floor(Math.random() * lanes.length);
      chart.push({ t, lane: b });
    }
  }

  try { bgm.currentTime = 0; } catch {}
  bgm.play().catch(()=>{});
  rhythmStartedAt = bgm.currentTime; // 秒
}


// ===== 音ゲー：更新・判定・描画 =====
function updateRhythm(timestamp) {
  if (isGameOver) return;

  const now = bgm.currentTime;

  // 2秒先まで先行生成
  while (chart.length && chart[0].t <= now + 2.0) {
    const n = chart.shift();
    notes.push({ time: n.t, lane: n.lane, y: -50, hit: false, passed: false });
  }

  // 落下
  const dt = 1 / 60;
  for (const n of notes) {
    if (n.hit || n.passed) continue;
    n.y += noteSpeed * dt;

    // 判定線を過ぎたら MISS
    if (n.y > hitLineY + 50) {
      n.passed = true;
      combo = 0;
      takeDamage(1);
      // ★ MISS文字（レーン位置に出す）
      showJudge("MISS", lanes[n.lane], hitLineY - 40, "#ff5555");
    }
  }

  // ★ 判定文字の寿命を減らす
  for (const j of judgeTexts) j.life -= dt;
  // 0以下を削除
  judgeTexts = judgeTexts.filter(j => j.life > 0);

  // フェーズ終了（任意）
  
}


  // 簡易終了
 
function judgeHit(laneIndex) {
  const perfectWin = 20;
  const goodWin    = 50;

  let best = null, bestAbs = 1e9;
  for (const n of notes) {
    if (n.lane !== laneIndex || n.hit || n.passed) continue;
    const ad = Math.abs(n.y - hitLineY);
    if (ad < bestAbs) { bestAbs = ad; best = n; }
  }
  if (!best) return;

  if (bestAbs <= perfectWin) {
    best.hit = true; score += 1000; combo++;
    // ★ PERFECT 表示
    showJudge("PERFECT", lanes[laneIndex], hitLineY - 40, "#66ffcc");
  } else if (bestAbs <= goodWin) {
    best.hit = true; score += 500; combo++;
    // ★ GOOD 表示
    showJudge("GOOD", lanes[laneIndex], hitLineY - 40, "#aaddff");
  } else {
    combo = 0;
    takeDamage(1);
    // ★ 大外しの MISS 表示
    showJudge("MISS", lanes[laneIndex], hitLineY - 40, "#ff5555");
  }
}


function drawRhythm() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = "#224"; ctx.fillRect(0,0,canvas.width,canvas.height);

  // レーン
  for (let i = 0; i < lanes.length; i++) {
    ctx.fillStyle = "hsla(240, 64%, 52%, 1.00)";
    ctx.fillRect(lanes[i]-40, 0, 80, canvas.height);
  }

  // 判定線
  ctx.fillStyle = "#ffffffff";
  ctx.fillRect(0, hitLineY, canvas.width, 4);

  // ノーツ
  for (const n of notes) {
    if (n.hit || n.passed) continue;
    ctx.fillStyle = "#1eeb3dff";
    ctx.fillRect(lanes[n.lane]-35, n.y-15, 70, 30);
  }

  // HUD
  ctx.fillStyle = "#fff";
  ctx.font = "20px sans-serif";
  ctx.fillText("MODE: Rhythm", 20, 30);
  ctx.fillText("SCORE: " + score, 20, 60);
  ctx.fillText("COMBO: " + combo, 20, 90);
  ctx.fillText("LIFE:  "  + life,  20, 120); // ★ライフ表示
  ctx.fillText("Keys: D F J K", 20, 150);

  // --- 判定文字を描画（PERFECT / GOOD / MISS）---
  for (const j of judgeTexts) {
    // life(0.8秒)に応じて少し上に浮かせながらフェード
    const t = j.life / 0.8;            // 残り割合 1→0
    const alpha = Math.max(0, t);      // 透明度
    const y = j.y - (1 - t) * 20;      // 上に20pxぶん持ち上げ

    ctx.globalAlpha = alpha;
    ctx.fillStyle = j.color;
    ctx.font = "28px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(j.text, j.x, y);
    ctx.globalAlpha = 1.0;
  }
  ctx.textAlign = "left"; // ほかの描画用に戻す
}

// ===== ループと開始 =====
function gameLoop(timestamp) {
  // 自動切替
  if (autoSwitch) {
  const nowSec = performance.now() / 1000;
  if (nowSec - phaseStartTime >= phases[phaseIndex].duration) {
    phaseIndex = (phaseIndex + 1) % phases.length;
    setMode(phases[phaseIndex].mode);
    phaseStartTime = nowSec;
    console.log("[phase] ->", phases[phaseIndex].mode, "start at", nowSec.toFixed(1));
  }
}


  if (mode === "action") {
    update();
    draw();
    const remain = Math.max(0, phases[phaseIndex].duration - (performance.now()/1000 - phaseStartTime));
    ctx.fillStyle = "#000"; ctx.font = "16px sans-serif";
    ctx.fillText("MODE: Action  次の切替まで: " + remain.toFixed(1) + "s", 20, 20);
  } else {
    updateRhythm(timestamp);
    drawRhythm();
    const remain = Math.max(0, phases[phaseIndex].duration - (performance.now()/1000 - phaseStartTime));
    ctx.fillStyle = "#fff"; ctx.font = "16px sans-serif";
    ctx.fillText("MODE: Rhythm  次の切替まで: " + remain.toFixed(1) + "s", 20, 24);
  }

  requestAnimationFrame(gameLoop);
}

let loaded = 0;
function tryStart() {
  loaded++;
  if (loaded === 2) {
    phaseStartTime = performance.now() / 1000;
    setMode(phases[phaseIndex].mode); // 最初のモード適用
    gameLoop();
  }
}

soulImage.onload = tryStart;
errorImage.onload = tryStart;
