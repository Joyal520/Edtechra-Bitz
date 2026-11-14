/* Modular BalloonScene: Background, Character, Balloon, Basket, ParticleEffects */
(function (global) {
  "use strict";

  const BALLOON_ASSETS = [
    { name: "red", src: "./save-the-balloon/assets/balloon-red.webp", shardColor: "#f43f5e" },
    { name: "orange", src: "./save-the-balloon/assets/balloon-orange.webp", shardColor: "#fb923c" },
    { name: "green", src: "./save-the-balloon/assets/balloon-green.webp", shardColor: "#22c55e" },
    { name: "blue", src: "./save-the-balloon/assets/balloon-blue.webp", shardColor: "#3b82f6" },
    { name: "purple", src: "./save-the-balloon/assets/balloon-purple.webp", shardColor: "#a855f7" },
    { name: "pink", src: "./save-the-balloon/assets/balloon-pink.webp", shardColor: "#ec4899" }
  ];

  const SVG_NS = "http://www.w3.org/2000/svg";

  /* Preload all sprite assets once so expression transitions are instant */
  function preloadAssets() {
    const urls = [
      "./save-the-balloon/assets/bg-landscape.webp",
      "./save-the-balloon/assets/basket.webp",
      "./save-the-balloon/assets/char-happy.webp",
      "./save-the-balloon/assets/char-worried.webp",
      "./save-the-balloon/assets/char-surprised.webp",
      "./save-the-balloon/assets/char-sad.webp",
      "./save-the-balloon/assets/char-excited.webp",
      "./save-the-balloon/assets/cloud-lavender.webp",
      "./save-the-balloon/assets/cloud-pink.webp",
      "./save-the-balloon/assets/decor-leaves.webp",
      "./save-the-balloon/assets/decor-flowers.webp",
      ...BALLOON_ASSETS.map((b) => b.src)
    ];
    urls.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }

  /* ---------- PARTICLE EFFECTS ENGINE ---------- */
  class ParticleEffects {
    constructor(canvasEl) {
      this.cv = canvasEl;
      this.ctx = canvasEl.getContext("2d");
      this.ps = [];
      this.motes = [];
      for (let i = 0; i < 24; i++) {
        this.motes.push({
          x: Math.random(),
          y: Math.random() * 0.72,
          s: 1 + Math.random() * 2.2,
          v: 0.004 + Math.random() * 0.009,
          ph: Math.random() * Math.PI * 2
        });
      }
      this.resize();
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.cv.width = window.innerWidth * dpr;
      this.cv.height = window.innerHeight * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    burst(x, y, count, palette = ["#ffe875", "#ffb199", "#7be8a4", "#7cbcff", "#d4a5ff", "#ffffff"], kind = "conf") {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const p = {
          kind,
          x,
          y,
          vx: 0,
          vy: 0,
          w: 5,
          h: 3.5,
          r: Math.random() * Math.PI * 2,
          vr: (Math.random() - 0.5) * 0.28,
          a: 1,
          da: 0.011,
          g: 0.12,
          d: 0.985,
          grow: 0,
          c: palette[Math.floor(Math.random() * palette.length)]
        };
        if (kind === "conf") {
          const speed = 2.2 + Math.random() * 5.2;
          p.vx = Math.cos(angle) * speed;
          p.vy = Math.sin(angle) * speed - 3.2;
          p.w = 5 + Math.random() * 5;
          p.h = 3.5 + Math.random() * 4;
          p.da = 0.009;
        } else if (kind === "shard") {
          const speed = 1.8 + Math.random() * 4.4;
          p.vx = Math.cos(angle) * speed;
          p.vy = Math.sin(angle) * speed - 1.6;
          p.w = 7 + Math.random() * 7;
          p.h = 3.5 + Math.random() * 3.5;
          p.vr = (Math.random() - 0.5) * 0.4;
          p.da = 0.016;
          p.g = 0.11;
          p.d = 0.965;
        } else if (kind === "spark") {
          const speed = 0.6 + Math.random() * 2.4;
          p.vx = Math.cos(angle) * speed;
          p.vy = Math.sin(angle) * speed - 0.8;
          p.w = 1.6 + Math.random() * 2.6;
          p.da = 0.015;
          p.g = -0.01;
          p.d = 0.97;
        } else {
          // Soft landing dust puff
          p.vx = (Math.random() - 0.5) * 2.1;
          p.vy = -0.3 - Math.random() * 0.7;
          p.w = 8 + Math.random() * 8;
          p.da = 0.014;
          p.g = 0;
          p.d = 0.96;
          p.grow = 0.35;
          p.a = 0.62;
        }
        this.ps.push(p);
      }
    }

    tick(dt, elapsed) {
      const ctx = this.ctx;
      const W = window.innerWidth;
      const H = window.innerHeight;
      ctx.clearRect(0, 0, W, H);

      // Gentle glowing sky particles / sparkles
      this.motes.forEach((m) => {
        m.y -= m.v * dt * 9;
        if (m.y < -0.04) {
          m.y = 0.72;
          m.x = Math.random();
        }
        const mx = (m.x + Math.sin(elapsed * 0.35 + m.ph) * 0.012) * W;
        const my = m.y * H;
        const rad = m.s * 3.6;
        const grad = ctx.createRadialGradient(mx, my, 0, mx, my, rad);
        const alpha = 0.16 + 0.14 * Math.sin(elapsed * 1.4 + m.ph);
        grad.addColorStop(0, `rgba(255, 246, 206, ${alpha})`);
        grad.addColorStop(1, "rgba(255, 246, 206, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(mx, my, rad, 0, Math.PI * 2);
        ctx.fill();
      });

      for (let i = this.ps.length - 1; i >= 0; i--) {
        const p = this.ps[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.g;
        p.vx *= p.d;
        p.r += p.vr;
        p.a -= p.da;
        p.w += p.grow;
        if (p.a <= 0) {
          this.ps.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.min(1, p.a);
        ctx.translate(p.x, p.y);
        if (p.kind === "puff" || p.kind === "spark") {
          const isSpark = p.kind === "spark";
          const r = isSpark ? p.w * 2.8 : p.w;
          const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
          grad.addColorStop(0, isSpark ? "#fffbe6" : p.c);
          grad.addColorStop(1, isSpark ? "rgba(255, 244, 196, 0)" : "rgba(255, 244, 224, 0)");
          if (isSpark) ctx.globalCompositeOperation = "lighter";
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.rotate(p.r);
          ctx.scale(1, Math.abs(Math.cos(p.r * 2)) * 0.8 + 0.2);
          ctx.fillStyle = p.c;
          if (p.kind === "shard") {
            ctx.beginPath();
            ctx.ellipse(0, 0, p.w / 2, p.h / 2, 0, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          }
        }
        ctx.restore();
      }
    }
  }

  /* ---------- SCENE RIG CONTROLLER (Balloons + Strings + Basket + Character) ---------- */
  class BalloonScene {
    constructor(sceneEl, rigStageEl, particleEngine) {
      this.sceneEl = sceneEl;
      this.rigStageEl = rigStageEl;
      this.fx = particleEngine;
      this.rigAssembly = null;
      this.stringsSvg = null;
      this.basketRig = null;
      this.charLayer = null;
      this.charImages = {};

      this.balloons = [];
      this.targetY = 0;
      this.y = 0;
      this.vy = 0;
      this.kick = 0;
      this.elapsed = 0;
      this.maxLives = 6;
      this.tempReactionUntil = 0;
      this.roundOutcome = null; // null | "win" | "lose"
      this.currentLives = 6;

      this.buildRigMarkup();
      this.updateScale();
    }

    buildRigMarkup() {
      this.rigStageEl.innerHTML = `
        <div class="rig-assembly" id="rig-assembly">
          <svg class="rig-strings-svg" id="rig-strings" viewBox="0 0 340 255"></svg>
          <div id="rig-balloons-layer"></div>
          <div class="basket-rig" id="basket-rig">
            <div class="char-layer" id="char-layer">
              <img class="char-expr active" data-expr="happy" src="./save-the-balloon/assets/char-happy.webp" alt="Adventurer character happy" />
              <img class="char-expr" data-expr="worried" src="./save-the-balloon/assets/char-worried.webp" alt="Adventurer character worried" />
              <img class="char-expr" data-expr="surprised" src="./save-the-balloon/assets/char-surprised.webp" alt="Adventurer character surprised" />
              <img class="char-expr" data-expr="sad" src="./save-the-balloon/assets/char-sad.webp" alt="Adventurer character sad" />
              <img class="char-expr" data-expr="excited" src="./save-the-balloon/assets/char-excited.webp" alt="Adventurer character cheering" />
            </div>
            <img class="basket-sprite" src="./save-the-balloon/assets/basket.webp" alt="Wooden hot air balloon basket" />
          </div>
        </div>
      `;

      this.rigAssembly = document.getElementById("rig-assembly");
      this.stringsSvg = document.getElementById("rig-strings");
      this.balloonsLayer = document.getElementById("rig-balloons-layer");
      this.basketRig = document.getElementById("basket-rig");
      this.charLayer = document.getElementById("char-layer");
      this.charLayer.querySelectorAll(".char-expr").forEach((img) => {
        this.charImages[img.dataset.expr] = img;
      });
    }

    updateScale() {
      const rect = this.sceneEl.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const sx = (rect.width - 8) / 340;
      const sy = (rect.height - 4) / 255;
      const scale = Math.max(0.56, Math.min(1.22, sx, sy));
      this.rigStageEl.style.transform = `scale(${scale.toFixed(3)})`;
    }

    reset(maxBalloons) {
      this.maxLives = maxBalloons;
      this.currentLives = maxBalloons;
      this.y = 0;
      this.vy = 0;
      this.targetY = 0;
      this.kick = 0;
      this.roundOutcome = null;
      this.tempReactionUntil = 0;

      this.balloonsLayer.innerHTML = "";
      this.stringsSvg.innerHTML = "";
      this.balloons = [];

      const ax = 170;
      const ay = 186;
      const spreadDeg = maxBalloons >= 8 ? 58 : maxBalloons === 5 ? 48 : 54;

      for (let i = 0; i < maxBalloons; i++) {
        const t = maxBalloons === 1 ? 0.5 : i / (maxBalloons - 1);
        const theta = ((-spreadDeg + spreadDeg * 2 * t) * Math.PI) / 180;
        const radius = i % 2 === 1 ? 128 : 106;
        const bx = ax + radius * Math.sin(theta) * 1.12;
        const by = ay - radius * Math.cos(theta) - 24;
        const asset = BALLOON_ASSETS[i % BALLOON_ASSETS.length];

        const line = document.createElementNS(SVG_NS, "path");
        line.setAttribute("fill", "none");
        line.setAttribute("stroke", "rgba(255, 248, 224, 0.85)");
        line.setAttribute("stroke-width", "1.7");
        line.setAttribute("stroke-linecap", "round");
        this.stringsSvg.appendChild(line);

        const node = document.createElement("div");
        node.className = "balloon-node";
        node.style.left = `${bx.toFixed(1)}px`;
        node.style.top = `${by.toFixed(1)}px`;
        const img = document.createElement("img");
        img.src = asset.src;
        img.alt = `${asset.name} balloon`;
        node.appendChild(img);
        this.balloonsLayer.appendChild(node);

        this.balloons.push({
          idx: i,
          baseX: bx,
          baseY: by,
          anchorX: 146 + t * 48,
          anchorY: 192,
          phase: Math.random() * Math.PI * 2,
          freq: 0.9 + Math.random() * 0.45,
          born: this.elapsed + i * 0.08,
          poppedAt: -1,
          dead: false,
          shardColor: asset.shardColor,
          node,
          line
        });
      }

      this.updateCharacterExpression();
    }

    setDescent(livesRemaining) {
      this.currentLives = livesRemaining;
      const lostRatio = 1 - Math.max(0, livesRemaining) / Math.max(1, this.maxLives);
      // Smooth gradual descent inside the sky scene (up to ~34px in stage coordinates)
      this.targetY = lostRatio * 34;
      this.updateCharacterExpression();
    }

    setVictory(scoreCallbackPoint) {
      this.roundOutcome = "win";
      this.targetY = -28; // Happy celebratory upward float
      this.updateCharacterExpression();

      const rect = this.basketRig.getBoundingClientRect();
      this.fx.burst(window.innerWidth / 2, window.innerHeight * 0.34, 46);
      if (rect.width > 0) {
        this.fx.burst(rect.left + rect.width / 2, rect.top + 20, 26, ["#fff7cc", "#fde047", "#ffffff"], "spark");
      }
      if (typeof scoreCallbackPoint === "function") scoreCallbackPoint(rect);
    }

    setGameOver() {
      this.roundOutcome = "lose";
      this.targetY = 38;
      this.updateCharacterExpression();
      const rect = this.basketRig.getBoundingClientRect();
      if (rect.width > 0) {
        this.fx.burst(rect.left + rect.width / 2, rect.bottom - 6, 12, ["#f5e6d3", "#e2e8f0"], "puff");
      }
    }

    updateCharacterExpression() {
      let expr = "happy";
      const isFinalBalloon = !this.roundOutcome && this.currentLives === 1;

      if (this.roundOutcome === "win") {
        expr = "excited";
      } else if (this.roundOutcome === "lose" || this.currentLives <= 0) {
        expr = "sad";
      } else if (this.elapsed < this.tempReactionUntil) {
        expr = "surprised";
      } else {
        const lost = this.maxLives - this.currentLives;
        if (lost === 0) expr = "happy";
        else if (this.currentLives === 3 && this.maxLives >= 5) expr = "surprised";
        else expr = "worried";
      }

      Object.keys(this.charImages).forEach((key) => {
        this.charImages[key].classList.toggle("active", key === expr);
      });
      this.charLayer.classList.toggle("is-nervous", isFinalBalloon);
    }

    popRandomBalloon(onSoundPop) {
      const alive = this.balloons.filter((b) => b.poppedAt < 0);
      if (!alive.length) return false;
      const target = alive[Math.floor(Math.random() * alive.length)];
      target.poppedAt = this.elapsed;

      // Shake briefly before popping burst
      target.node.classList.add("popping");
      this.vy += 18;
      this.kick += (Math.random() - 0.5) * 1.4;
      this.tempReactionUntil = this.elapsed + 0.72;
      this.updateCharacterExpression();

      const rect = target.node.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      setTimeout(() => {
        target.dead = true;
        target.node.style.display = "none";
        target.line.style.display = "none";

        if (rect.width > 0) {
          this.fx.burst(cx, cy, 18, [target.shardColor, target.shardColor, "#ffffff"], "shard");
          this.fx.burst(cx, cy, 9, ["#ffffff", "#fef08a"], "spark");
        }
        if (typeof onSoundPop === "function") onSoundPop();
      }, 145);

      return true;
    }

    tick(dt) {
      this.elapsed += dt;
      if (this.tempReactionUntil > 0 && this.elapsed >= this.tempReactionUntil) {
        this.tempReactionUntil = 0;
        this.updateCharacterExpression();
      }

      // Spring-damper vertical physics for smooth natural basket descent
      this.vy += ((this.targetY - this.y) * 18 - this.vy * 4.8) * dt;
      this.y += this.vy * dt;
      this.kick *= Math.pow(0.025, dt);

      const wind = Math.sin(this.elapsed * 0.7) * 0.65 + Math.sin(this.elapsed * 1.5) * 0.3 + this.kick;
      const tilt = wind * 1.8;

      if (this.rigAssembly) {
        this.rigAssembly.style.transform = `translate3d(0, ${this.y.toFixed(2)}px, 0) rotate(${tilt.toFixed(2)}deg)`;
      }
      if (this.basketRig) {
        const counterRot = (-tilt * 0.65 + Math.sin(this.elapsed * 1.2) * 1.6).toFixed(2);
        const bobY = (Math.sin(this.elapsed * 2.1) * 1.8).toFixed(2);
        this.basketRig.style.transform = `translate3d(0, ${bobY}px, 0) rotate(${counterRot}deg)`;
      }

      this.balloons.forEach((b) => {
        if (b.dead) return;
        const spawnT = Math.min(1, Math.max(0, (this.elapsed - b.born) / 0.55));
        const scale = 0.35 + 0.65 * (1 - Math.pow(1 - spawnT, 3));
        const swayX = Math.sin(this.elapsed * b.freq + b.phase) * 3.2 + wind * 4.5;
        const swayY = Math.cos(this.elapsed * b.freq * 0.85 + b.phase) * 2.4;
        const rot = swayX * 0.85;

        if (b.poppedAt < 0) {
          b.node.style.transform = `translate3d(${swayX.toFixed(2)}px, ${swayY.toFixed(2)}px, 0) rotate(${rot.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
        }

        // Exact knot position in 340x255 SVG coordinates
        const knotX = b.baseX + swayX;
        const knotY = b.baseY + swayY + 34;
        const ctrlX = (b.anchorX + knotX) / 2 + Math.cos(this.elapsed + b.phase) * 2.5;
        const ctrlY = (b.anchorY + knotY) / 2 + 5;
        b.line.setAttribute("d", `M ${b.anchorX.toFixed(1)} ${b.anchorY.toFixed(1)} Q ${ctrlX.toFixed(1)} ${ctrlY.toFixed(1)} ${knotX.toFixed(1)} ${knotY.toFixed(1)}`);
      });
    }
  }

  global.SaveBalloonScene = {
    preloadAssets,
    ParticleEffects,
    BalloonScene
  };
})(window);
