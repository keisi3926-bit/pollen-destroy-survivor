(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const slowButton = document.getElementById("slowButton");
  const spellButton = document.getElementById("spellButton");
  const updatePanel = document.querySelector(".update-panel");
  const updateToggle = document.getElementById("updateToggle");
  const updateBody = document.getElementById("updateBody");
  const appVersion = document.getElementById("appVersion");
  const updateStatus = document.getElementById("updateStatus");
  const updateList = document.getElementById("updateList");
  const checkUpdateButton = document.getElementById("checkUpdateButton");
  const reloadUpdateButton = document.getElementById("reloadUpdateButton");

  const W = canvas.width;
  const H = canvas.height;
  const TAU = Math.PI * 2;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const dist2 = (a, b) => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  };
  const PORTRAIT_BASE = "assets/characters/";

  class UpdateManager {
    constructor() {
      this.registration = null;
      this.waitingWorker = null;
      this.versionUrl = `version.json?ts=${Date.now()}`;
      this.bindUi();
    }

    bindUi() {
      updateToggle.addEventListener("click", () => {
        const closed = updatePanel.classList.toggle("is-closed");
        updateToggle.setAttribute("aria-expanded", String(!closed));
      });
      checkUpdateButton.addEventListener("click", () => this.checkNow());
      reloadUpdateButton.addEventListener("click", () => this.applyUpdate());
    }

    async init() {
      await this.loadVersion();
      await this.registerServiceWorker();
    }

    async loadVersion() {
      try {
        const res = await fetch(this.versionUrl, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        appVersion.textContent = `v${data.version}`;
        updateStatus.textContent = data.status || "最新情報を取得済み";
        updateList.innerHTML = "";
        (data.updates || []).slice(0, 4).forEach((item) => {
          const li = document.createElement("li");
          li.innerHTML = `<strong>${item.date} v${item.version}</strong><br>${item.summary}`;
          updateList.appendChild(li);
        });
      } catch (error) {
        appVersion.textContent = "local";
        updateStatus.textContent = "ローカル表示中";
        updateList.innerHTML = "<li>version.json はサーバー配信時に更新情報として表示されます。</li>";
      }
    }

    async registerServiceWorker() {
      if (!("serviceWorker" in navigator) || location.protocol === "file:") {
        updateStatus.textContent = "静的プレビュー中";
        return;
      }
      try {
        this.registration = await navigator.serviceWorker.register("sw.js");
        this.registration.addEventListener("updatefound", () => {
          const worker = this.registration.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) this.markUpdateReady(worker);
          });
        });
        if (this.registration.waiting) this.markUpdateReady(this.registration.waiting);
      } catch (error) {
        updateStatus.textContent = "更新管理は未登録";
      }
    }

    async checkNow() {
      updateStatus.textContent = "更新確認中";
      await this.loadVersion();
      if (this.registration) {
        await this.registration.update();
        updateStatus.textContent = this.waitingWorker ? "更新を適用できます" : "最新です";
      }
    }

    markUpdateReady(worker) {
      this.waitingWorker = worker;
      updateStatus.textContent = "更新を適用できます";
      reloadUpdateButton.hidden = false;
    }

    applyUpdate() {
      if (!this.waitingWorker) {
        location.reload();
        return;
      }
      navigator.serviceWorker.addEventListener("controllerchange", () => location.reload(), { once: true });
      this.waitingWorker.postMessage({ type: "SKIP_WAITING" });
    }
  }

  // 会話データは speaker / text / portrait / side だけで管理する。
  // portrait に画像名を指定すると assets/characters/ から読み込み、無ければ自動でプレースホルダー表示になる。
  const DIALOGUE_SCENES = {
    scene_intro: [
      { speaker: "PLAYER", text: "春。参道には、今年も黄色い霧が降りた。", portrait: "player.png", side: "left" },
      { speaker: "PLAYER", text: "鼻を守る者は、もういない。", portrait: "player.png", side: "left" },
      { speaker: "PLAYER", text: "ならば行く。スリッパで。", portrait: "player.png", side: "left" },
    ],
    scene_boss: [
      { speaker: "PLAYER", text: "今年も来たか……", portrait: "player.png", side: "left" },
      { speaker: "PLAYER", text: "春の元凶。", portrait: "player.png", side: "left" },
      { speaker: "PLAYER", text: "全部叩く。", portrait: "player.png", side: "left" },
      { speaker: "スギノミコト", text: "愚かな人間よ。", portrait: "suginomikoto.png", side: "right" },
      { speaker: "スギノミコト", text: "花粉は生命の営み。", portrait: "suginomikoto.png", side: "right" },
      { speaker: "スギノミコト", text: "我らを滅ぼせば春は来ぬ。", portrait: "suginomikoto.png", side: "right" },
      { speaker: "PLAYER", text: "いや。", portrait: "player.png", side: "left" },
      { speaker: "PLAYER", text: "鼻水は止める。", portrait: "player.png", side: "left" },
      { speaker: "スギノミコト", text: "ならば試してみよ。", portrait: "suginomikoto.png", side: "right" },
      { speaker: "スギノミコト", text: "花粉奥義――", portrait: "suginomikoto.png", side: "right" },
      { speaker: "スギノミコト", text: "無限飛散。", portrait: "suginomikoto.png", side: "right" },
      { speaker: "PLAYER", text: "……来るか。", portrait: "player.png", side: "left" },
      { speaker: "スギノミコト", text: "これは神事。", portrait: "suginomikoto.png", side: "right" },
      { speaker: "スギノミコト", text: "花粉は祈り。", portrait: "suginomikoto.png", side: "right" },
      { speaker: "スギノミコト", text: "散ることこそ、春の証。", portrait: "suginomikoto.png", side: "right" },
      { speaker: "PLAYER", text: "知るか。", portrait: "player.png", side: "left" },
      { speaker: "PLAYER", text: "こっちは鼻が限界なんだよ。", portrait: "player.png", side: "left" },
      { speaker: "スギノミコト", text: "ならば受けよ。", portrait: "suginomikoto.png", side: "right" },
      { speaker: "スギノミコト", text: "花粉符「黄塵円舞」", portrait: "suginomikoto.png", side: "right" },
      { speaker: "PLAYER", text: "上等だ。", portrait: "player.png", side: "left" },
      { speaker: "PLAYER", text: "マスタースリッパで叩き落とす。", portrait: "player.png", side: "left" },
    ],
    scene_clear: [
      { speaker: "スギノミコト", text: "見事だ……", portrait: "suginomikoto.png", side: "right" },
      { speaker: "スギノミコト", text: "だが春は終わらぬ。", portrait: "suginomikoto.png", side: "right" },
      { speaker: "PLAYER", text: "来年も。", portrait: "player.png", side: "left" },
      { speaker: "PLAYER", text: "叩く。", portrait: "player.png", side: "left" },
      { speaker: "スギノミコト", text: "また会おう……", portrait: "suginomikoto.png", side: "right" },
    ],
    scene_ending: [
      { speaker: "STAGE1 CLEAR", text: "花粉滅殺完了", portrait: "player.png", side: "left" },
      { speaker: "PLAYER", text: "まだ終わりじゃない。", portrait: "player.png", side: "left" },
      { speaker: "PLAYER", text: "次の敵が待っている。", portrait: "player.png", side: "left" },
      { speaker: "TO BE CONTINUED", text: "King of Slipper 外伝は続く。", portrait: "player.png", side: "left" },
    ],
  };

  class GameState {
    constructor() {
      this.mode = "title";
      this.score = 0;
      this.lives = 3;
      this.stageName = "一面 春の花粉参道";
      this.time = 0;
      this.shake = 0;
      this.message = "";
      this.messageTimer = 0;
      this.bossNameTimer = 0;
    }

    resetRun() {
      this.mode = "stage";
      this.score = 0;
      this.lives = 3;
      this.time = 0;
      this.shake = 0;
      this.message = "一面開始";
      this.messageTimer = 120;
      this.bossNameTimer = 0;
    }

    showMessage(text, frames = 120) {
      this.message = text;
      this.messageTimer = frames;
    }
  }

  class Player {
    constructor() {
      this.x = W / 2;
      this.y = H - 90;
      this.r = 5;
      this.cooldown = 0;
      this.invincible = 0;
    }

    reset() {
      this.x = W / 2;
      this.y = H - 90;
      this.cooldown = 0;
      this.invincible = 100;
    }

    update(input, bullets) {
      const slow = input.slow;
      const speed = slow ? 2.5 : 5;
      let mx = 0;
      let my = 0;

      if (input.left) mx -= 1;
      if (input.right) mx += 1;
      if (input.up) my -= 1;
      if (input.down) my += 1;

      if (input.touchActive) {
        this.x += (input.touchX - this.x) * (slow ? 0.15 : 0.26);
        this.y += (input.touchY - this.y) * (slow ? 0.15 : 0.26);
      } else if (mx || my) {
        const len = Math.hypot(mx, my) || 1;
        this.x += (mx / len) * speed;
        this.y += (my / len) * speed;
      }

      this.x = clamp(this.x, 24, W - 24);
      this.y = clamp(this.y, 50, H - 36);
      this.cooldown = Math.max(0, this.cooldown - 1);
      this.invincible = Math.max(0, this.invincible - 1);

      if ((input.fire || input.touchActive) && this.cooldown <= 0) {
        this.shoot(bullets);
        this.cooldown = slow ? 7 : 6;
      }
    }

    shoot(bullets) {
      bullets.push(new Bullet(this.x - 8, this.y - 18, 0, -9, 4, "player"));
      bullets.push(new Bullet(this.x + 8, this.y - 18, 0, -9, 4, "player"));
      bullets.push(new Bullet(this.x, this.y - 24, 0, -10, 5, "player"));
    }

    hit(game) {
      if (this.invincible > 0 || game.state.mode !== "stage") return;
      game.state.lives -= 1;
      game.state.shake = 18;
      this.invincible = 130;
      game.spawnBurst(this.x, this.y, "#eafcff", 18);
      if (game.state.lives <= 0) game.state.mode = "gameover";
    }

    draw(ctx, t) {
      ctx.save();
      ctx.translate(this.x, this.y);
      if (this.invincible > 0 && Math.floor(t / 5) % 2 === 0) ctx.globalAlpha = 0.45;

      // スリッパ本体。丸い先端と白い鼻緒で、画像なしでも識別しやすくする。
      ctx.fillStyle = "#6ec6ff";
      ctx.strokeStyle = "#dff9ff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 27, 0.08, 0, TAU);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-8, -6);
      ctx.quadraticCurveTo(0, -18, 8, -6);
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(0, 3, this.r, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  class Bullet {
    constructor(x, y, vx, vy, r, owner, color = null, extra = {}) {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.r = r;
      this.owner = owner;
      this.color = color || (owner === "player" ? "#bdf6ff" : "#f3b43f");
      this.age = 0;
      this.wave = extra.wave || 0;
      this.phase = extra.phase || 0;
      this.damage = extra.damage || 1;
      this.shape = extra.shape || "orb";
    }

    update() {
      this.age += 1;
      this.x += this.vx + Math.sin(this.age * 0.08 + this.phase) * this.wave;
      this.y += this.vy;
    }

    offscreen() {
      return this.x < -40 || this.x > W + 40 || this.y < -60 || this.y > H + 60;
    }

    draw(ctx) {
      ctx.save();
      if (this.shape === "needle") {
        ctx.translate(this.x, this.y);
        ctx.rotate(Math.atan2(this.vy, this.vx) + Math.PI / 2);
        ctx.fillStyle = this.color;
        ctx.strokeStyle = "rgba(255,255,255,0.45)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -13);
        ctx.lineTo(-4, 9);
        ctx.lineTo(4, 9);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        return;
      }
      const g = ctx.createRadialGradient(this.x, this.y, 1, this.x, this.y, this.r * 2.2);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(0.45, this.color);
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r * 2.1, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  class Enemy {
    constructor(x, y, type = "drift") {
      this.x = x;
      this.y = y;
      this.type = type;
      this.age = 0;
      this.r = type === "big" ? 18 : 13;
      this.hp = type === "big" ? 18 : 8;
      this.baseX = x;
    }

    update(game) {
      this.age += 1;
      if (this.type === "sine") {
        this.x = this.baseX + Math.sin(this.age * 0.045) * 70;
        this.y += 1.35;
      } else if (this.type === "big") {
        this.x = this.baseX + Math.sin(this.age * 0.03) * 35;
        this.y += 0.85;
      } else {
        this.y += 1.55;
      }

      const rate = this.type === "big" ? 58 : 86;
      if (this.age % rate === 0) {
        const a = Math.atan2(game.player.y - this.y, game.player.x - this.x);
        game.enemyBullets.push(new Bullet(this.x, this.y, Math.cos(a) * 2.1, Math.sin(a) * 2.1, 6, "enemy", "#f4c64e"));
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.fillStyle = "#f3d74f";
      ctx.strokeStyle = "#fff1a2";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, this.r, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.arc(-5, -6, this.r * 0.28, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    offscreen() {
      return this.y > H + 40;
    }
  }

  class SpellCard {
    constructor({ name, duration, hp, pattern, type = "spell", onStart = null, onUpdate = null, onEnd = null }) {
      this.name = name;
      this.duration = duration;
      this.hp = hp;
      this.maxHp = hp;
      this.pattern = pattern;
      this.type = type;
      this.onStart = onStart;
      this.onUpdate = onUpdate;
      this.onEnd = onEnd;
      this.age = 0;
    }

    start(boss, game) {
      this.age = 0;
      this.hp = this.maxHp;
      if (this.onStart) this.onStart(boss, game, this);
    }

    update(boss, game) {
      this.age += 1;
      if (this.pattern && BOSS_PATTERNS[this.pattern]) BOSS_PATTERNS[this.pattern](boss, game, this);
      if (this.onUpdate) this.onUpdate(boss, game, this);
    }

    end(boss, game) {
      if (this.onEnd) this.onEnd(boss, game, this);
    }

    get isSpell() {
      return this.type === "spell";
    }
  }

  const BOSS_PATTERNS = {
    normalSpread(boss, game, card) {
      if (card.age % 72 !== 1) return;
      for (let i = 0; i < 26; i += 1) {
        const a = (i / 26) * TAU + card.age * 0.012;
        game.enemyBullets.push(new Bullet(boss.x, boss.y, Math.cos(a) * 1.42, Math.sin(a) * 1.42, 6, "enemy", "#f1bf45"));
      }
    },

    yellowDance(boss, game, card) {
      if (card.age % 34 !== 1) return;
      const gap = Math.floor(card.age / 34) % 16;
      for (let i = 0; i < 32; i += 1) {
        if (Math.abs(i - gap) <= 1 || Math.abs(i - gap - 32) <= 1) continue;
        const a = (i / 32) * TAU + card.age * 0.025;
        const speed = 1.0 + (i % 2) * 0.2;
        game.enemyBullets.push(new Bullet(boss.x, boss.y, Math.cos(a) * speed, Math.sin(a) * speed, 5, "enemy", "#f4d34a"));
      }
    },

    aimedPollen(boss, game, card) {
      if (card.age % 38 !== 1) return;
      const base = Math.atan2(game.player.y - boss.y, game.player.x - boss.x);
      for (let i = -2; i <= 2; i += 1) {
        const a = base + i * 0.16;
        game.enemyBullets.push(new Bullet(boss.x, boss.y + 8, Math.cos(a) * 2.1, Math.sin(a) * 2.1, 6, "enemy", "#f0bd42"));
      }
    },

    needleRain(boss, game, card) {
      if (card.age % 8 !== 1) return;
      const x = 30 + ((card.age * 47) % (W - 60));
      const drift = card.age % 56 < 12 ? (boss.x < W / 2 ? 0.7 : -0.7) : 0;
      game.enemyBullets.push(new Bullet(x, -16, drift, 2.7, 4, "enemy", "#d7c64a", { shape: "needle" }));
      if (card.age % 40 === 1) {
        game.enemyBullets.push(new Bullet(W - x, -16, drift * -0.8, 2.35, 4, "enemy", "#f1de65", { shape: "needle" }));
      }
    },

    wavePollen(boss, game, card) {
      if (card.age % 17 !== 1) return;
      for (let i = -3; i <= 3; i += 1) {
        game.enemyBullets.push(new Bullet(boss.x, boss.y + 20, i * 0.5, 2.12, 6, "enemy", "#ff9b45", {
          wave: 1.18,
          phase: i * 0.9 + card.age * 0.03,
        }));
      }
    },

    sneezeCombo(boss, game, card) {
      boss.x += Math.sin(card.age * 0.18) * 2.0;
      BOSS_PATTERNS.wavePollen(boss, game, card);
      if (card.age % 64 === 1) BOSS_PATTERNS.aimedPollen(boss, game, card);
    },

    poorVisibility(boss, game, card) {
      if (card.age % 46 !== 1) return;
      for (let i = 0; i < 18; i += 1) {
        const a = (i / 18) * TAU + card.age * 0.01;
        game.enemyBullets.push(new Bullet(boss.x, boss.y, Math.cos(a) * 1.0, Math.sin(a) * 1.0, 6, "enemy", "rgba(242, 199, 79, 0.62)"));
      }
    },

    cedarBlockade(boss, game, card) {
      if (card.age % 128 !== 1) return;
      const safeSlot = Math.floor((card.age / 128) % 4);
      for (let i = 0; i < 5; i += 1) {
        if (i === safeSlot) continue;
        const lx = 62 + i * 82;
        game.lasers.push({ x: lx, warn: 76, live: 42, age: 0, width: 15 });
      }
    },

    infiniteScatter(boss, game, card) {
      if (card.age % 46 === 1) BOSS_PATTERNS.yellowDance(boss, game, card);
      if (card.age % 24 === 1) BOSS_PATTERNS.wavePollen(boss, game, card);
      if (card.age % 14 === 1) BOSS_PATTERNS.needleRain(boss, game, card);
    },
  };

  const BOSS_SPELL_LIBRARY = [
    { name: "花粉符「黄塵円舞」", pattern: "yellowDance", status: "stage1" },
    { name: "杉符「針葉雨」", pattern: "needleRain", status: "stage1" },
    { name: "鼻撃符「連続くしゃみ」", pattern: "sneezeCombo", status: "future" },
    { name: "春霞符「視界不良」", pattern: "poorVisibility", status: "future" },
    { name: "神木符「杉並木封鎖」", pattern: "cedarBlockade", status: "stage1" },
    { name: "奥義「無限飛散」", pattern: "infiniteScatter", status: "stage1" },
  ];

  class Boss {
    constructor() {
      this.x = W / 2;
      this.y = -95;
      this.r = 42;
      this.age = 0;
      this.attackAge = 0;
      this.entered = false;
      this.dialogueStarted = false;
      this.defeated = false;
      this.name = "スギノミコト";
      this.spellCards = this.createSpellCards();
      this.cardIndex = 0;
      this.currentCard = this.spellCards[0];
      this.hp = this.currentCard.hp;
      this.maxHp = this.currentCard.maxHp;
    }

    update(game) {
      this.age += 1;

      if (!this.entered) {
        this.y += 1.6;
        if (this.y >= 118) {
          this.entered = true;
          this.dialogueStarted = true;
          this.attackAge = 0;
          game.startDialogue("scene_boss", () => {
            game.state.bossNameTimer = 170;
            game.state.showMessage("戦闘開始", 90);
            this.beginCurrentCard(game);
          });
        }
        return;
      }

      this.x = W / 2 + Math.sin(this.age * 0.018) * 78;
      if (!this.currentCard || this.defeated) return;
      this.attackAge = this.currentCard.age;
      this.currentCard.update(this, game);
      this.hp = this.currentCard.hp;
      this.maxHp = this.currentCard.maxHp;
      if (this.currentCard.hp <= 0 || this.currentCard.age >= this.currentCard.duration) this.nextCard(game);
    }

    createSpellCards() {
      return [
        new SpellCard({ name: "通常攻撃1", duration: 520, hp: 240, pattern: "normalSpread", type: "normal" }),
        new SpellCard({ name: "花粉符「黄塵円舞」", duration: 620, hp: 250, pattern: "yellowDance" }),
        new SpellCard({ name: "通常攻撃2", duration: 460, hp: 220, pattern: "aimedPollen", type: "normal" }),
        new SpellCard({ name: "杉符「針葉雨」", duration: 620, hp: 260, pattern: "needleRain" }),
        new SpellCard({ name: "通常攻撃3", duration: 500, hp: 230, pattern: "wavePollen", type: "normal" }),
        new SpellCard({ name: "神木符「杉並木封鎖」", duration: 620, hp: 260, pattern: "cedarBlockade" }),
        new SpellCard({ name: "奥義「無限飛散」", duration: 820, hp: 360, pattern: "infiniteScatter" }),
      ];
    }

    beginCurrentCard(game) {
      this.currentCard = this.spellCards[this.cardIndex];
      if (!this.currentCard) return;
      this.currentCard.start(this, game);
      this.hp = this.currentCard.hp;
      this.maxHp = this.currentCard.maxHp;
      this.enemyClearOnCardChange(game);
      if (this.currentCard.isSpell) {
        game.state.showMessage(this.currentCard.name, 135);
      }
    }

    nextCard(game) {
      if (!this.currentCard) return;
      this.currentCard.end(this, game);
      this.cardIndex += 1;
      if (this.cardIndex >= this.spellCards.length) {
        game.defeatBoss();
        return;
      }
      this.beginCurrentCard(game);
    }

    takeDamage(game, amount) {
      if (!this.currentCard || this.defeated || !this.entered) return;
      this.currentCard.hp -= amount;
      this.hp = this.currentCard.hp;
      game.state.score += Math.max(1, Math.floor(amount * 8));
      if (this.currentCard.hp <= 0) this.nextCard(game);
    }

    enemyClearOnCardChange(game) {
      game.enemyBullets = [];
      game.lasers = [];
      for (let i = 0; i < 18; i += 1) {
        game.particles.push(new Particle(this.x + (Math.random() - 0.5) * 90, this.y + (Math.random() - 0.5) * 60, "#fff0a2"));
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);

      // 杉の神らしいシルエットを、三角の樹冠と面で表現する。
      ctx.fillStyle = "#2d8a48";
      ctx.strokeStyle = "#b9ffd0";
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i += 1) {
        ctx.beginPath();
        ctx.moveTo(0, -62 + i * 26);
        ctx.lineTo(-50 + i * 7, 2 + i * 18);
        ctx.lineTo(50 - i * 7, 2 + i * 18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      ctx.fillStyle = "#60451e";
      ctx.fillRect(-10, 28, 20, 42);
      ctx.fillStyle = "#dff6c7";
      ctx.beginPath();
      ctx.arc(-13, -6, 5, 0, TAU);
      ctx.arc(13, -6, 5, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#17341f";
      ctx.beginPath();
      ctx.moveTo(-12, 12);
      ctx.quadraticCurveTo(0, 21, 13, 12);
      ctx.stroke();
      ctx.restore();
    }
  }

  class Particle {
    constructor(x, y, color) {
      this.x = x;
      this.y = y;
      const a = Math.random() * TAU;
      const s = 0.8 + Math.random() * 2.8;
      this.vx = Math.cos(a) * s;
      this.vy = Math.sin(a) * s;
      this.life = 26 + Math.random() * 26;
      this.maxLife = this.life;
      this.color = color;
      this.r = 2 + Math.random() * 3;
    }

    update() {
      this.life -= 1;
      this.x += this.vx;
      this.y += this.vy;
      this.vy += 0.015;
    }

    draw(ctx) {
      ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  class DialogueManager {
    constructor(scenes, portraitBase) {
      this.scenes = scenes;
      this.portraitBase = portraitBase;
      this.cache = new Map();
      this.active = false;
      this.sceneName = "";
      this.lines = [];
      this.index = 0;
      this.charCount = 0;
      this.age = 0;
      this.fade = 0;
      this.closing = false;
      this.onComplete = null;
    }

    start(sceneName, onComplete = null) {
      const scene = this.scenes[sceneName];
      if (!scene || scene.length === 0) {
        if (onComplete) onComplete();
        return;
      }

      this.active = true;
      this.sceneName = sceneName;
      this.lines = scene;
      this.index = 0;
      this.charCount = 0;
      this.age = 0;
      this.fade = 0;
      this.closing = false;
      this.onComplete = onComplete;
      this.preloadScene(scene);
    }

    preloadScene(scene) {
      scene.forEach((line) => this.getPortrait(line.portrait));
    }

    getPortrait(fileName) {
      if (!fileName) return null;
      if (this.cache.has(fileName)) return this.cache.get(fileName);

      const record = { image: new Image(), loaded: false, failed: false };
      record.image.onload = () => {
        record.loaded = true;
      };
      record.image.onerror = () => {
        record.failed = true;
      };
      record.image.src = this.portraitBase + fileName;
      this.cache.set(fileName, record);
      return record;
    }

    update() {
      if (!this.active) return;
      this.age += 1;
      if (this.closing) {
        this.fade = Math.max(0, this.fade - 0.08);
        if (this.fade <= 0) this.completeNow();
        return;
      }
      this.fade = Math.min(1, this.fade + 0.06);
      const line = this.currentLine();
      if (line) this.charCount = Math.min(line.text.length, this.charCount + 0.55);
    }

    currentLine() {
      return this.lines[this.index] || null;
    }

    advance() {
      if (!this.active || this.closing) return;
      const line = this.currentLine();
      if (line && this.charCount < line.text.length) {
        this.charCount = line.text.length;
        return;
      }
      this.index += 1;
      if (this.index >= this.lines.length) {
        this.finish();
        return;
      }
      this.charCount = 0;
      this.age = 0;
    }

    skip() {
      if (!this.active || this.closing) return;
      this.finish();
    }

    finish() {
      this.closing = true;
    }

    completeNow() {
      const done = this.onComplete;
      this.active = false;
      this.closing = false;
      this.sceneName = "";
      this.lines = [];
      this.index = 0;
      this.charCount = 0;
      this.onComplete = null;
      if (done) done();
    }

    draw(ctx) {
      if (!this.active) return;
      const line = this.currentLine();
      if (!line) return;

      ctx.save();
      ctx.globalAlpha = this.fade;
      ctx.fillStyle = "rgba(0, 0, 0, 0.58)";
      ctx.fillRect(0, 0, W, H);

      this.drawPortrait(ctx, "left", line);
      this.drawPortrait(ctx, "right", line);
      this.drawWindow(ctx, line);
      ctx.restore();
    }

    drawPortrait(ctx, side, activeLine) {
      const isActive = activeLine.side === side;
      const fileName = isActive ? activeLine.portrait : null;
      const speaker = isActive ? activeLine.speaker : (side === "left" ? "PLAYER" : "BOSS");
      const record = this.getPortrait(fileName);
      const w = 156;
      const h = 300;
      const baseX = side === "left" ? 24 : W - w - 24;
      const slide = (1 - Math.min(1, this.age / 18)) * 34;
      const x = baseX + (side === "left" ? -slide : slide);
      const y = 118;

      ctx.save();
      ctx.globalAlpha *= isActive ? 1 : 0.28;
      if (record && record.loaded && !record.failed) {
        ctx.drawImage(record.image, x, y, w, h);
      } else {
        this.drawPlaceholder(ctx, x, y, w, h, speaker, side);
      }
      ctx.restore();
    }

    drawPlaceholder(ctx, x, y, w, h, label, side) {
      const grad = ctx.createLinearGradient(x, y, x, y + h);
      if (side === "left") {
        grad.addColorStop(0, "rgba(92, 196, 244, 0.92)");
        grad.addColorStop(1, "rgba(35, 96, 128, 0.92)");
      } else {
        grad.addColorStop(0, "rgba(88, 173, 93, 0.92)");
        grad.addColorStop(1, "rgba(37, 91, 48, 0.92)");
      }
      ctx.fillStyle = grad;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.58)";
      ctx.lineWidth = 2;
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
      ctx.fillRect(x + 14, y + h - 62, w - 28, 38);
      ctx.fillStyle = "#ffffff";
      ctx.font = "800 20px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label || "CHARACTER", x + w / 2, y + h - 43);
      ctx.textBaseline = "alphabetic";
    }

    drawWindow(ctx, line) {
      const pad = 22;
      const winH = H * 0.4;
      const y = H - winH;
      ctx.fillStyle = "rgba(0, 0, 0, 0.76)";
      ctx.fillRect(0, y, W, winH);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.32)";
      ctx.lineWidth = 2;
      ctx.strokeRect(0, y, W, winH);

      ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
      ctx.fillRect(pad, y + 18, 176, 36);
      ctx.fillStyle = "#fff4b8";
      ctx.font = "800 18px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(line.speaker || "", pad + 14, y + 42);

      ctx.fillStyle = "#f7fff0";
      ctx.font = "22px system-ui, sans-serif";
      this.drawWrappedText(ctx, line.text.slice(0, Math.floor(this.charCount)), pad + 12, y + 92, W - pad * 2 - 24, 34, 4);

      if (Math.floor(this.age / 22) % 2 === 0 && this.charCount >= line.text.length) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
        ctx.font = "14px system-ui, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText("Z / Tap", W - pad, H - 20);
      }
    }

    drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
      const lines = [];
      let line = "";
      for (const ch of text) {
        const next = line + ch;
        if (ctx.measureText(next).width > maxWidth && line) {
          lines.push(line);
          line = ch;
          if (lines.length >= maxLines) break;
        } else {
          line = next;
        }
      }
      if (line && lines.length < maxLines) lines.push(line);
      lines.forEach((row, i) => ctx.fillText(row, x, y + i * lineHeight));
    }
  }

  class Game {
    constructor() {
      this.state = new GameState();
      this.player = new Player();
      this.enemies = [];
      this.playerBullets = [];
      this.enemyBullets = [];
      this.particles = [];
      this.lasers = [];
      this.boss = null;
      this.playerSpellCount = 3;
      this.playerSpellTimer = 0;
      this.playerSpellCutin = 0;
      this.playerSpellCooldown = 0;
      this.dialogue = new DialogueManager(DIALOGUE_SCENES, PORTRAIT_BASE);
      this.lastTime = 0;
      this.input = {
        left: false,
        right: false,
        up: false,
        down: false,
        fire: false,
        slow: false,
        touchActive: false,
        touchX: W / 2,
        touchY: H - 90,
      };
      this.bindInput();
      this.startDialogue("scene_intro");
    }

    start() {
      this.state.resetRun();
      this.player.reset();
      this.enemies = [];
      this.playerBullets = [];
      this.enemyBullets = [];
      this.particles = [];
      this.lasers = [];
      this.boss = null;
      this.playerSpellCount = 3;
      this.playerSpellTimer = 0;
      this.playerSpellCutin = 0;
      this.playerSpellCooldown = 0;
    }

    startDialogue(sceneName, onComplete = null) {
      this.input.fire = false;
      this.input.touchActive = false;
      this.dialogue.start(sceneName, onComplete);
    }

    bindInput() {
      window.addEventListener("keydown", (e) => {
        if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " ", "Shift", "x", "X"].includes(e.key)) e.preventDefault();
        if (this.dialogue.active) {
          if (e.key === "Enter") this.dialogue.skip();
          if (e.key === "z" || e.key === "Z" || e.key === " ") this.dialogue.advance();
          return;
        }
        if (this.state.mode !== "stage" && (e.key === "z" || e.key === "Z" || e.key === " " || e.key === "Enter")) this.start();
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") this.input.left = true;
        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") this.input.right = true;
        if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") this.input.up = true;
        if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") this.input.down = true;
        if (e.key === "Shift") this.input.slow = true;
        if (e.key === "z" || e.key === "Z" || e.key === " ") this.input.fire = true;
        if (e.key === "x" || e.key === "X") this.activatePlayerSpell();
      }, { passive: false });

      window.addEventListener("keyup", (e) => {
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") this.input.left = false;
        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") this.input.right = false;
        if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") this.input.up = false;
        if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") this.input.down = false;
        if (e.key === "Shift") this.input.slow = false;
        if (e.key === "z" || e.key === "Z" || e.key === " ") this.input.fire = false;
      });

      canvas.addEventListener("pointerdown", (e) => {
        if (this.dialogue.active) {
          this.dialogue.advance();
          return;
        }
        if (this.state.mode !== "stage") this.start();
        this.input.touchActive = true;
        this.setTouch(e);
        canvas.setPointerCapture(e.pointerId);
      });
      canvas.addEventListener("pointermove", (e) => {
        if (!this.input.touchActive) return;
        this.setTouch(e);
      });
      canvas.addEventListener("pointerup", () => {
        this.input.touchActive = false;
      });
      canvas.addEventListener("pointercancel", () => {
        this.input.touchActive = false;
      });

      slowButton.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        if (this.dialogue.active) {
          this.dialogue.advance();
          return;
        }
        this.input.slow = true;
        slowButton.classList.add("is-active");
      });
      slowButton.addEventListener("pointerup", () => {
        this.input.slow = false;
        slowButton.classList.remove("is-active");
      });
      slowButton.addEventListener("pointercancel", () => {
        this.input.slow = false;
        slowButton.classList.remove("is-active");
      });

      spellButton.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        if (this.dialogue.active) {
          this.dialogue.advance();
          return;
        }
        this.activatePlayerSpell();
      });
    }

    setTouch(e) {
      const rect = canvas.getBoundingClientRect();
      this.input.touchX = ((e.clientX - rect.left) / rect.width) * W;
      this.input.touchY = ((e.clientY - rect.top) / rect.height) * H;
    }

    loop = (time) => {
      const dt = Math.min(2, (time - this.lastTime) / 16.666 || 1);
      this.lastTime = time;
      for (let i = 0; i < dt; i += 1) this.update();
      this.draw();
      requestAnimationFrame(this.loop);
    };

    update() {
      this.dialogue.update();
      if (!this.dialogue.active && this.state.mode === "stage") this.updateStage();
      if (this.dialogue.active) return;
      this.particles.forEach((p) => p.update());
      this.particles = this.particles.filter((p) => p.life > 0);
      this.state.shake = Math.max(0, this.state.shake - 1);
      this.state.messageTimer = Math.max(0, this.state.messageTimer - 1);
      this.state.bossNameTimer = Math.max(0, this.state.bossNameTimer - 1);
    }

    updateStage() {
      this.state.time += 1;
      this.playerSpellCooldown = Math.max(0, this.playerSpellCooldown - 1);
      this.playerSpellCutin = Math.max(0, this.playerSpellCutin - 1);
      this.playerSpellTimer = Math.max(0, this.playerSpellTimer - 1);
      this.player.update(this.input, this.playerBullets);
      this.updatePlayerSpell();
      this.spawnStageEnemies();

      this.enemies.forEach((e) => e.update(this));
      this.playerBullets.forEach((b) => b.update());
      this.enemyBullets.forEach((b) => b.update());
      this.updateLasers();
      if (this.boss) this.boss.update(this);

      this.resolveCollisions();

      this.enemies = this.enemies.filter((e) => !e.offscreen() && e.hp > 0);
      this.playerBullets = this.playerBullets.filter((b) => !b.offscreen());
      this.enemyBullets = this.enemyBullets.filter((b) => !b.offscreen());
    }

    activatePlayerSpell() {
      if (this.state.mode !== "stage" || this.dialogue.active) return;
      if (this.playerSpellCount <= 0 || this.playerSpellTimer > 0 || this.playerSpellCooldown > 0) return;
      this.playerSpellCount -= 1;
      this.playerSpellTimer = 165;
      this.playerSpellCutin = 82;
      this.playerSpellCooldown = 220;
      this.player.invincible = Math.max(this.player.invincible, 180);
      this.enemyBullets = [];
      this.lasers = [];
      this.state.shake = 16;
      this.state.showMessage("MASTER SLIPPER", 100);
      for (let i = 0; i < 40; i += 1) this.particles.push(new Particle(this.player.x, this.player.y - 40, "#bdf6ff"));
    }

    updatePlayerSpell() {
      if (this.playerSpellTimer <= 0) return;
      this.player.invincible = Math.max(this.player.invincible, 3);
      if (this.playerSpellTimer % 8 === 0) this.enemyBullets = [];

      const beam = this.getPlayerSpellBeam();
      for (const e of this.enemies) {
        if (e.x > beam.x - beam.w / 2 - e.r && e.x < beam.x + beam.w / 2 + e.r && e.y < beam.bottom && e.y > -30) {
          e.hp -= 3.5;
          if (this.playerSpellTimer % 10 === 0) this.spawnBurst(e.x, e.y, "#c9f8ff", 4);
        }
      }
      if (this.boss && this.boss.entered && !this.boss.defeated) {
        if (Math.abs(this.boss.x - beam.x) < beam.w / 2 + this.boss.r && this.boss.y < beam.bottom) {
          this.boss.takeDamage(this, 1.25);
          if (this.playerSpellTimer % 12 === 0) this.spawnBurst(this.boss.x, this.boss.y, "#d7fbff", 8);
        }
      }
    }

    getPlayerSpellBeam() {
      return {
        x: this.player.x,
        w: 92 + Math.sin(this.playerSpellTimer * 0.18) * 10,
        bottom: this.player.y - 12,
      };
    }

    spawnStageEnemies() {
      const t = this.state.time;
      if (t < 3300) {
        if (t % 105 === 20) {
          for (let i = 0; i < 5; i += 1) this.enemies.push(new Enemy(55 + i * 85, -20 - i * 12, "drift"));
        }
        if (t % 170 === 90) {
          this.enemies.push(new Enemy(70, -25, "sine"));
          this.enemies.push(new Enemy(W - 70, -25, "sine"));
        }
        if (t % 420 === 260) {
          this.enemies.push(new Enemy(W / 2, -35, "big"));
        }
      }

      if (t === 3420) {
        this.boss = new Boss();
        this.enemyBullets = [];
        this.state.showMessage("花粉濃度、異常上昇", 150);
      }
    }

    updateLasers() {
      this.lasers.forEach((l) => {
        l.age += 1;
        if (l.age > l.warn && l.age < l.warn + l.live) {
          if (Math.abs(this.player.x - l.x) < l.width + this.player.r && this.player.y > 38) this.player.hit(this);
        }
      });
      this.lasers = this.lasers.filter((l) => l.age < l.warn + l.live);
    }

    resolveCollisions() {
      for (const b of this.playerBullets) {
        for (const e of this.enemies) {
          if (dist2(b, e) < (b.r + e.r) ** 2) {
            e.hp -= b.damage;
            b.y = -100;
            if (e.hp <= 0) {
              this.state.score += e.type === "big" ? 800 : 300;
              this.spawnBurst(e.x, e.y, "#f6d94e", 14);
            }
            break;
          }
        }
        if (this.boss && this.boss.entered && !this.boss.defeated && dist2(b, this.boss) < (b.r + this.boss.r) ** 2) {
          this.boss.takeDamage(this, b.damage);
          b.y = -100;
        }
      }

      for (const b of this.enemyBullets) {
        if (dist2(b, this.player) < (b.r + this.player.r) ** 2) {
          b.y = H + 100;
          this.player.hit(this);
        }
      }

      for (const e of this.enemies) {
        if (dist2(e, this.player) < (e.r + this.player.r) ** 2) {
          e.hp = 0;
          this.spawnBurst(e.x, e.y, "#f6d94e", 12);
          this.player.hit(this);
        }
      }
    }

    spawnBurst(x, y, color, count) {
      for (let i = 0; i < count; i += 1) this.particles.push(new Particle(x, y, color));
    }

    defeatBoss() {
      if (!this.boss || this.boss.defeated) return;
      this.boss.defeated = true;
      this.spawnBurst(this.boss.x, this.boss.y, "#b7ff8a", 90);
      this.state.score += 12000;
      this.enemyBullets = [];
      this.lasers = [];
      this.playerSpellTimer = 0;
      this.state.showMessage("消滅", 120);
      this.startDialogue("scene_clear", () => {
        this.boss = null;
        this.state.mode = "clear";
        this.state.showMessage("花粉、滅殺完了！", 9999);
        this.startDialogue("scene_ending");
      });
    }

    draw() {
      ctx.save();
      if (this.state.shake > 0) {
        ctx.translate((Math.random() - 0.5) * this.state.shake, (Math.random() - 0.5) * this.state.shake);
      }
      this.drawBackground();

      this.lasers.forEach((l) => this.drawLaser(l));
      this.enemies.forEach((e) => e.draw(ctx));
      if (this.boss) this.boss.draw(ctx);
      this.drawPlayerSpellEffects();
      this.playerBullets.forEach((b) => b.draw(ctx));
      this.enemyBullets.forEach((b) => b.draw(ctx));
      this.particles.forEach((p) => p.draw(ctx));
      if (this.state.mode === "stage") this.player.draw(ctx, this.state.time);

      ctx.restore();
      this.drawUi();
      if (this.state.mode === "title") this.drawTitle();
      if (this.state.mode === "gameover") this.drawResult("GAME OVER", "Z / Space / タップで再挑戦");
      if (this.state.mode === "clear") this.drawResult("花粉、滅殺完了！", "スコア " + this.state.score);
      this.drawPlayerSpellCutin();
      this.dialogue.draw(ctx);
    }

    drawPlayerSpellEffects() {
      if (this.playerSpellTimer <= 0) return;
      const beam = this.getPlayerSpellBeam();
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      const g = ctx.createLinearGradient(beam.x, 0, beam.x, beam.bottom);
      g.addColorStop(0, "rgba(173, 245, 255, 0.08)");
      g.addColorStop(0.65, "rgba(135, 231, 255, 0.54)");
      g.addColorStop(1, "rgba(255, 255, 255, 0.86)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(beam.x - beam.w / 2, beam.bottom);
      ctx.lineTo(beam.x - beam.w * 0.32, 0);
      ctx.lineTo(beam.x + beam.w * 0.32, 0);
      ctx.lineTo(beam.x + beam.w / 2, beam.bottom);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.translate(beam.x, this.player.y - 58);
      ctx.rotate(-0.08);
      ctx.fillStyle = "rgba(190, 248, 255, 0.82)";
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 34, 62, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-20, -10);
      ctx.quadraticCurveTo(0, -36, 20, -10);
      ctx.stroke();
      ctx.restore();
    }

    drawPlayerSpellCutin() {
      if (this.playerSpellCutin <= 0) return;
      const alpha = Math.min(0.78, this.playerSpellCutin / 28);
      ctx.save();
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = Math.min(1, this.playerSpellCutin / 20);
      ctx.fillStyle = "#e8fbff";
      ctx.font = "900 38px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("MASTER SLIPPER", W / 2, H / 2 - 16);
      ctx.fillStyle = "#9cefff";
      ctx.font = "700 17px system-ui, sans-serif";
      ctx.fillText("マスタースリッパ", W / 2, H / 2 + 22);
      ctx.restore();
    }

    drawBackground() {
      const t = this.state.time || 0;
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#d8f1bf");
      sky.addColorStop(0.35, "#9fcf96");
      sky.addColorStop(1, "#253d31");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = "rgba(78, 63, 48, 0.34)";
      ctx.beginPath();
      ctx.moveTo(146, 0);
      ctx.lineTo(304, 0);
      ctx.lineTo(382, H);
      ctx.lineTo(68, H);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "rgba(42, 92, 52, 0.55)";
      ctx.lineWidth = 12;
      for (let i = 0; i < 9; i += 1) {
        const y = ((i * 118 + t * 0.8) % (H + 120)) - 60;
        ctx.beginPath();
        ctx.moveTo(46, y);
        ctx.lineTo(112, y + 80);
        ctx.moveTo(W - 46, y);
        ctx.lineTo(W - 112, y + 80);
        ctx.stroke();
      }

      for (let i = 0; i < 42; i += 1) {
        const x = (i * 73 + Math.sin(t * 0.01 + i) * 22) % W;
        const y = (i * 131 + t * (0.35 + (i % 4) * 0.06)) % H;
        ctx.fillStyle = `rgba(245, 215, 82, ${0.11 + (i % 3) * 0.035})`;
        ctx.beginPath();
        ctx.arc(x, y, 2 + (i % 4), 0, TAU);
        ctx.fill();
      }
    }

    drawLaser(l) {
      if (l.age <= l.warn) {
        ctx.globalAlpha = 0.28 + Math.sin(l.age * 0.4) * 0.12;
        ctx.fillStyle = "#f8e46d";
        ctx.fillRect(l.x - 2, 40, 4, H - 40);
        ctx.globalAlpha = 1;
        return;
      }
      const pulse = 0.75 + Math.sin(l.age * 0.6) * 0.2;
      ctx.fillStyle = `rgba(255, 220, 71, ${pulse})`;
      ctx.fillRect(l.x - l.width, 40, l.width * 2, H - 40);
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillRect(l.x - 4, 40, 8, H - 40);
    }

    drawUi() {
      ctx.fillStyle = "rgba(8, 18, 15, 0.72)";
      ctx.fillRect(0, 0, W, 38);
      ctx.fillStyle = "#f3fff2";
      ctx.font = "700 15px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`SCORE ${this.state.score}`, 12, 24);
      ctx.textAlign = "center";
      ctx.fillText(this.state.stageName, W / 2, 24);
      ctx.textAlign = "right";
      ctx.fillText(`LIFE ${"■".repeat(Math.max(0, this.state.lives))}`, W - 12, 24);
      ctx.fillStyle = "#fff0a8";
      ctx.font = "700 13px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`SPELL ${this.playerSpellCount}`, 12, 55);

      if (this.boss && this.boss.entered && this.state.mode === "stage") {
        ctx.fillStyle = "rgba(10, 25, 17, 0.72)";
        ctx.fillRect(54, 45, W - 108, 10);
        ctx.fillStyle = "#85f06e";
        ctx.fillRect(54, 45, (W - 108) * Math.max(0, this.boss.hp / this.boss.maxHp), 10);
        if (this.boss.currentCard && this.boss.currentCard.isSpell) {
          const card = this.boss.currentCard;
          const rest = Math.max(0, Math.ceil((card.duration - card.age) / 60));
          ctx.fillStyle = "rgba(8, 18, 15, 0.76)";
          ctx.fillRect(78, 62, W - 156, 28);
          ctx.fillStyle = "#fff1a8";
          ctx.font = "800 15px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(`${card.name}  ${rest}`, W / 2, 82);
        }
      }

      ctx.fillStyle = "rgba(255, 255, 255, 0.68)";
      ctx.font = "12px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("花粉滅殺スリッパー", W / 2, H - 12);

      if (this.state.messageTimer > 0) {
        ctx.fillStyle = "rgba(9, 20, 15, 0.68)";
        ctx.fillRect(64, 96, W - 128, 42);
        ctx.fillStyle = "#fff7bd";
        ctx.font = "700 20px system-ui, sans-serif";
        ctx.fillText(this.state.message, W / 2, 124);
      }

      if (this.state.bossNameTimer > 0 && this.boss) {
        ctx.fillStyle = "rgba(7, 15, 12, 0.78)";
        ctx.fillRect(50, 150, W - 100, 74);
        ctx.fillStyle = "#d8ffd2";
        ctx.font = "700 16px system-ui, sans-serif";
        ctx.fillText("一面ボス", W / 2, 178);
        ctx.font = "800 29px system-ui, sans-serif";
        ctx.fillText(this.boss.name, W / 2, 210);
      }
    }

    drawTitle() {
      ctx.fillStyle = "rgba(5, 13, 12, 0.70)";
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = "center";
      ctx.fillStyle = "#f8ffe9";
      ctx.font = "900 42px system-ui, sans-serif";
      ctx.fillText("花粉滅殺", W / 2, 230);
      ctx.fillStyle = "#91e9ff";
      ctx.font = "900 36px system-ui, sans-serif";
      ctx.fillText("スリッパー", W / 2, 276);
      ctx.fillStyle = "#fff1a6";
      ctx.font = "16px system-ui, sans-serif";
      ctx.fillText("King of Slipper 外伝ミニゲーム", W / 2, 320);
      ctx.fillStyle = "#efffed";
      ctx.font = "15px system-ui, sans-serif";
      ctx.fillText("矢印/WASD: 移動  Shift: 低速  Z/Space: ショット", W / 2, 410);
      ctx.fillText("X: マスタースリッパ  スマホ: SPELLボタン", W / 2, 438);
      ctx.fillText("スマホ: ドラッグ移動・自動ショット", W / 2, 466);
      ctx.font = "700 20px system-ui, sans-serif";
      ctx.fillText("Z / Space / タップで開始", W / 2, 520);
    }

    drawResult(title, subtitle) {
      ctx.fillStyle = "rgba(5, 13, 12, 0.72)";
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = "center";
      ctx.fillStyle = title === "GAME OVER" ? "#ffb8a8" : "#f8ffe9";
      ctx.font = "900 34px system-ui, sans-serif";
      ctx.fillText(title, W / 2, 330);
      ctx.fillStyle = "#eaffdf";
      ctx.font = "18px system-ui, sans-serif";
      ctx.fillText(subtitle, W / 2, 382);
      ctx.font = "15px system-ui, sans-serif";
      ctx.fillText("Z / Space / タップでタイトルから再開", W / 2, 432);
    }
  }

  const game = new Game();
  const updateManager = new UpdateManager();
  updateManager.init();
  requestAnimationFrame(game.loop);
})();
