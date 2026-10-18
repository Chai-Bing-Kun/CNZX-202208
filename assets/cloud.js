/* ================================================================
   词云
   - 一百个祝福词按斐波那契球面均匀分布，绕 Y 轴缓慢旋转
   - 不用 Three.js：自己算 3D 旋转 + 透视投影，写 transform
   - 点任意一个词 → 从祝福语池里随机抽一条
   - 可以拖动改转角；prefers-reduced-motion 时不自动转
   ================================================================ */

(function () {
  "use strict";

  /* 词表沿用旧页，一个都没改 */
  var WORDS = [
    { text: "毕业快乐", size: 60 }, { text: "前程似锦", size: 58 },
    { text: "未来可期", size: 58 }, { text: "梦想成真", size: 44 },
    { text: "一帆风顺", size: 42 }, { text: "学业有成", size: 40 },
    { text: "事业腾飞", size: 38 }, { text: "青春无悔", size: 36 },
    { text: "友谊长存", size: 34 }, { text: "感恩师长", size: 32 },
    { text: "勇敢追梦", size: 30 }, { text: "不忘初心", size: 28 },
    { text: "展翅高飞", size: 36 }, { text: "才华横溢", size: 34 },
    { text: "心想事成", size: 30 }, { text: "鹏程万里", size: 25 },
    { text: "锦绣前程", size: 18 }, { text: "功成名就", size: 16 },
    { text: "学无止境", size: 14 }, { text: "厚德载物", size: 12 },
    { text: "自强不息", size: 10 }, { text: "天道酬勤", size: 18 },
    { text: "志存高远", size: 16 }, { text: "海阔天空", size: 10 },
    { text: "扬帆起航", size: 19 }, { text: "金榜题名", size: 18 },
    { text: "桃李芬芳", size: 16 }, { text: "春风化雨", size: 14 },
    { text: "德才兼备", size: 12 }, { text: "继往开来", size: 10 },
    { text: "出类拔萃", size: 20 }, { text: "卓尔不群", size: 19 },
    { text: "大展宏图", size: 19 }, { text: "光耀门楣", size: 22 },
    { text: "青云直上", size: 18 }, { text: "龙腾虎跃", size: 16 },
    { text: "鱼跃龙门", size: 14 }, { text: "才高八斗", size: 12 },
    { text: "学富五车", size: 10 }, { text: "金玉满堂", size: 8 },
    { text: "辉煌人生", size: 16 }, { text: "智慧之光", size: 14 },
    { text: "才华出众", size: 12 }, { text: "前途无量", size: 10 },
    { text: "步步高升", size: 8 }, { text: "幸福安康", size: 6 },
    { text: "快乐成长", size: 7 }, { text: "心想事成", size: 17 },
    { text: "美梦成真", size: 18 }, { text: "才华洋溢", size: 16 },
    { text: "智慧超群", size: 14 }, { text: "学业精进", size: 12 },
    { text: "事业有成", size: 10 }, { text: "家庭幸福", size: 19 },
    { text: "健康平安", size: 19 }, { text: "快乐无忧", size: 4 },
    { text: "财源广进", size: 21 }, { text: "幸福美满", size: 18 },
    { text: "快乐无限", size: 16 }, { text: "智慧如海", size: 14 },
    { text: "才华斐然", size: 12 }, { text: "学业进步", size: 40 },
    { text: "事业辉煌", size: 12 }, { text: "家庭和睦", size: 16 },
    { text: "健康长寿", size: 14 }, { text: "快乐常伴", size: 12 },
    { text: "财源滚滚", size: 18 }, { text: "幸福永恒", size: 16 },
    { text: "快乐无边", size: 14 }, { text: "智慧无限", size: 12 },
    { text: "才华盖世", size: 22 }, { text: "学业优秀", size: 28 },
    { text: "事业腾达", size: 16 }, { text: "家庭温馨", size: 14 },
    { text: "健康如意", size: 60 }, { text: "快乐永远", size: 18 },
    { text: "财源茂盛", size: 16 }, { text: "幸福安康", size: 14 },
    { text: "快乐成长", size: 12 }, { text: "智慧超群", size: 10 },
    { text: "才华横溢", size: 16 }, { text: "学业有成", size: 19 },
    { text: "事业成功", size: 18 }, { text: "家庭美满", size: 22 },
    { text: "健康快乐", size: 18 }, { text: "快乐幸福", size: 16 },
    { text: "智慧人生", size: 14 }, { text: "才华出众", size: 12 },
    { text: "学业进步", size: 10 }, { text: "事业辉煌", size: 18 },
    { text: "家庭幸福", size: 16 }, { text: "健康平安", size: 14 },
    { text: "快乐无忧", size: 12 }
  ];

  var BLESSINGS = [
    "愿你在人生的新征程中，如雄鹰展翅，翱翔于广阔天空！",
    "毕业不是终点，而是新的起点，愿你以梦为马，不负韶华！",
    "四年的耕耘，终有收获；未来的道路，必将更加辉煌！",
    "愿你带着母校的祝福，在人生的舞台上绽放最耀眼的光芒！",
    "今天的离别是为了明天更好的相聚，愿你前程似锦，归来仍是少年！",
    "愿你在未来的日子里，保持热爱，奔赴山海，创造属于自己的精彩人生！",
    "毕业快乐！愿你以智慧、勇气和毅力，书写人生新的篇章！",
    "愿你的未来如星辰大海般广阔，如旭日东升般充满希望！",
    "带着梦想出发吧，愿你在追梦的路上永远保持热情与坚定！",
    "毕业是人生的重要里程碑，愿你在新的征程中继续闪耀！",
    "愿你像颗种子，勇敢地冲破泥沙，将嫩绿的幼芽伸出地面，指向天空！",
    "愿你是一棵树：春天，吐一山淡淡的香味；夏天，洒一抹如泉的凉荫；秋天，举一树甜甜的青果；冬天，做一个养精蓄锐的好梦！",
    "愿你像那小小的溪流，将那高高的山峰作为生命的起点，一路跳跃，一路奔腾，勇敢地奔向生活的大海！",
    "愿你在这短暂的学习时日里，获得高超的本领、顽强的意志、博大的胸怀；像赛马一般，越过一道又一道高栏；让生命扬帆前进，驶向碧波滔滔的大海！",
    "愿你插上一对有力的翅膀，坚韧地飞吧，不要为风雨所折服；诚挚地飞吧，不要为香甜的蜜汁所陶醉。朝着明确的目标，飞向美好的未来！",
    "愿你是一叶执著的小舟，载着希望的梦幻，驶向辽阔的海洋；愿你是一艘坚强的船，剪开蓝色的波澜，驶向成功的彼岸！",
    "愿你在这多彩的世界里，拥有绚丽的人生；愿你永远保持此刻的纯真与热情，拥抱未来的每一天！",
    "愿你是风，鼓起白色的帆；愿你是船，剪开蓝色的波澜。生活正在你的前方微笑，勇敢地走上前去，将彩色的人生拥抱！"
  ];

  var stage = document.querySelector(".cloud-frame");
  var cloud = document.getElementById("cloud");
  var blessing = document.getElementById("blessing");
  var wordLabel = document.getElementById("blessingWord");
  var textLabel = document.getElementById("blessingText");
  var againBtn = document.getElementById("againBtn");
  var backBtn = document.getElementById("backBtn");
  var randomBtn = document.getElementById("randomBtn");

  if (!stage || !cloud) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* 让同一句祝福不要连着出现两次 */
  var lastBlessing = -1;

  /* ---------- 造球 ---------- */

  var golden = Math.PI * (3 - Math.sqrt(5));
  var nodes = [];

  function colorFor(size) {
    if (size >= 34) return "var(--ink)";
    if (size >= 18) return "var(--blue)";
    if (size >= 11) return "var(--ink-2)";
    return "var(--ink-3)";
  }

  WORDS.forEach(function (w, i) {
    var y = WORDS.length === 1 ? 0 : 1 - (i / (WORDS.length - 1)) * 2;
    var r = Math.sqrt(Math.max(0, 1 - y * y));
    var theta = golden * i;

    var el = document.createElement("button");
    el.type = "button";
    el.className = "word";
    el.tabIndex = -1;
    el.textContent = w.text;
    el.style.color = colorFor(w.size);
    cloud.appendChild(el);

    nodes.push({
      el: el,
      text: w.text,
      base: 11 + (w.size / 60) * 14,    /* 字号区间 11~25，再乘深度系数 */
      x: r * Math.cos(theta),
      y: y,
      z: r * Math.sin(theta)
    });
  });

  /* ---------- 旋转与投影 ---------- */

  var ry = 0;
  var rx = -0.2;
  var spin = reduceMotion ? 0 : 0.0018;
  var baseSpin = spin;

  var W = 0, H = 0, RADIUS = 0, FONT_SCALE = 1, CAM = 3.2;
  var SC_FAR = CAM / (CAM + 1);   /* 球背面的透视系数 */
  var SC_NEAR = CAM / (CAM - 1);  /* 球正面的透视系数 */

  function measure() {
    var box = stage.getBoundingClientRect();
    W = box.width;
    H = box.height;
    /* 投影最大半径 ≈ 1.05 × RADIUS（已验证：max(sqrt(1-z^2)*CAM/(CAM+z)) 在 CAM=3.2 时为 1.053），
       四周再让出词宽/字高的余量，保证整个球不顶出边框、宽窄屏都不被裁 */
    RADIUS = Math.max(40, Math.min(W / 2 - 38, H / 2 - 24) / 1.06);
    FONT_SCALE = Math.min(Math.max(RADIUS / 215, 0.56), 1.12);
  }

  function paint() {
    var cy = Math.cos(ry), sy = Math.sin(ry);
    var cx = Math.cos(rx), sx = Math.sin(rx);
    var hw = W / 2, hh = H / 2;

    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];

      /* 绕 Y 再绕 X */
      var x1 = n.x * cy - n.z * sy;
      var z1 = n.x * sy + n.z * cy;
      var y2 = n.y * cx - z1 * sx;
      var z2 = n.y * sx + z1 * cx;

      /* 透视：z2 越大越远 */
      var sc = CAM / (CAM + z2);
      var depth = (sc - SC_FAR) / (SC_NEAR - SC_FAR); /* 0 = 最远，1 = 最近 */

      var px = hw + x1 * RADIUS * sc;
      var py = hh + y2 * RADIUS * sc;

      var size = n.base * FONT_SCALE * (0.5 + 0.82 * depth);

      n.el.style.transform =
        "translate(" + px.toFixed(1) + "px," + py.toFixed(1) + "px) translate(-50%, -50%)";
      n.el.style.fontSize = size.toFixed(1) + "px";
      n.el.style.opacity = (0.16 + 0.84 * depth).toFixed(2);
      n.el.style.zIndex = String(200 - Math.round(sc * 100));

      /* 记住屏幕坐标，点选时按距离找最近的词 */
      n.cx = px;
      n.cy = py;
      n.sc = sc;
      n.hitr = Math.max(15, size * 1.5) * 0.5 + 6;
    }
  }

  /* 球一直在转，鼠标按下去的瞬间词可能已经挪开几像素，
     所以先看落点是否压在某个词上，压不上就找最近的那个 */
  function hitTest(px, py) {
    var best = null;
    var bestSc = -1;
    var bestD = Infinity;
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var dx = px - n.cx;
      var dy = py - n.cy;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d > n.hitr) continue;
      /* 前面的词优先，同一层取更近的 */
      if (n.sc > bestSc + 0.02 || (Math.abs(n.sc - bestSc) <= 0.02 && d < bestD)) {
        best = n;
        bestSc = n.sc;
        bestD = d;
      }
    }
    return best;
  }

  function frame() {
    /* 指针停在某个词上时停下，方便点准 */
    if (!hovering) ry += spin;
    paint();
    requestAnimationFrame(frame);
  }

  /* ---------- 祝福 ---------- */

  function pickBlessing() {
    if (BLESSINGS.length < 2) return BLESSINGS[0] || "";
    var i = Math.floor(Math.random() * BLESSINGS.length);
    if (i === lastBlessing) i = (i + 1 + Math.floor(Math.random() * (BLESSINGS.length - 1))) % BLESSINGS.length;
    lastBlessing = i;
    return BLESSINGS[i];
  }

  function showBlessing(word) {
    wordLabel.textContent = word || "祝福";
    textLabel.textContent = pickBlessing();
    blessing.hidden = false;
    /* 焦点放到「再抽一句」上，键盘也能继续 */
    againBtn.focus({ preventScroll: true });
  }

  function hideBlessing() {
    blessing.hidden = true;
    if (randomBtn) randomBtn.focus({ preventScroll: true });
  }

  function roll(word) {
    var pick = word || WORDS[Math.floor(Math.random() * WORDS.length)].text;
    showBlessing(pick);
  }

  /* ---------- 点词 / 拖动 ---------- */

  var dragging = false;
  var moved = 0;
  var lastX = 0;
  var lastY = 0;
  var lastDX = 0;
  var downWord = null;
  var hovering = false;

  stage.addEventListener("pointerover", function (e) {
    var w = e.target.closest ? e.target.closest(".word") : null;
    if (w) hovering = true;
  });

  stage.addEventListener("pointerout", function (e) {
    var w = e.target.closest ? e.target.closest(".word") : null;
    if (w) hovering = false;
  });

  stage.addEventListener("pointerleave", function () {
    hovering = false;
  });

  stage.addEventListener("pointerdown", function (e) {
    /* 祝福卡开着的时候不接管 */
    if (!blessing.hidden) return;
    dragging = true;
    moved = 0;
    lastDX = 0;
    downWord = e.target.closest ? e.target.closest(".word") : null;
    lastX = e.clientX;
    lastY = e.clientY;
    stage.classList.add("is-dragging");
    if (stage.setPointerCapture) {
      try { stage.setPointerCapture(e.pointerId); } catch (err) {}
    }
  });

  stage.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    var dx = e.clientX - lastX;
    var dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    moved += Math.abs(dx) + Math.abs(dy);
    lastDX = dx;

    ry += dx * 0.0075;
    rx -= dy * 0.0055;
    /* 别让球翻过头，留一点余地 */
    rx = Math.max(-1.05, Math.min(1.05, rx));
  });

  stage.addEventListener("pointerup", function (e) {
    if (!dragging) return;
    dragging = false;
    stage.classList.remove("is-dragging");

    if (moved > 6) {
      /* 甩一下带点惯性，然后回落到常速 */
      spin = Math.max(-0.06, Math.min(0.06, lastDX * 0.0016));
      if (reduceMotion) spin = 0;
      downWord = null;
      return;
    }

    var target = downWord;
    downWord = null;

    /* 按下时可能刚好落在两个词中间，松手时再按坐标找一次最近的词 */
    if (!target) {
      var hit = document.elementFromPoint(e.clientX, e.clientY);
      target = hit && hit.closest ? hit.closest(".word") : null;
    }

    if (!target) {
      var box = stage.getBoundingClientRect();
      var near = hitTest(e.clientX - box.left, e.clientY - box.top);
      if (near) target = near.el;
    }

    if (target) roll(target.textContent.trim());
  });

  stage.addEventListener("pointercancel", function () {
    dragging = false;
    hovering = false;
    stage.classList.remove("is-dragging");
  });

  backBtn.addEventListener("click", hideBlessing);
  againBtn.addEventListener("click", function () {
    textLabel.textContent = pickBlessing();
  });
  if (randomBtn) {
    randomBtn.addEventListener("click", function () {
      roll(null);
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !blessing.hidden) hideBlessing();
  });

  /* 惯性慢慢回到常速 */
  function relax() {
    if (!dragging && spin !== baseSpin) {
      spin += (baseSpin - spin) * 0.035;
      if (Math.abs(spin - baseSpin) < 0.0002) spin = baseSpin;
    }
    requestAnimationFrame(relax);
  }

  /* ---------- 启动 ---------- */

  var countEl = document.getElementById("wordCount");
  if (countEl) countEl.textContent = WORDS.length + " 个";

  measure();
  paint();

  if (reduceMotion) {
    /* 静态球：不自动转，但拖动仍然有效 */
    requestAnimationFrame(function loop() {
      if (dragging) paint();
      requestAnimationFrame(loop);
    });
  } else {
    requestAnimationFrame(frame);
    requestAnimationFrame(relax);
  }

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      measure();
      paint();
    }, 120);
  });

  /* 首屏淡入，免得 100 个词一下子跳出来 */
  cloud.style.opacity = "0";
  cloud.style.transition = "opacity 0.5s ease";
  requestAnimationFrame(function () {
    cloud.style.opacity = "1";
  });
})();
