/* ================================================================
   留言页
   - 读 messages/messages.json（没有服务器时给出提示）
   - 关键词云：按留言标签统计，字越大提及越多，点一下筛
   - 纸条墙：纯 DOM 渲染，倾斜角按 id 哈希算，稳定不跳
   - 写信：本地草稿 + mailto / 复制，本站无后端
   ================================================================ */

(function () {
  "use strict";

  var DATA_URL = "messages/messages.json";
  var LIMIT = 160;
  var MAIL = "chengnan-zhongxue-202208@outlook.com";
  var DRAFT_KEY = "cnzx-msg-draft";

  /* 没有写 tags 时，用这张表从正文里认关键词 */
  var DICT = [
    "毕业", "中考", "运动会", "研学", "艺术节", "晚自习", "老师", "班主任",
    "同学", "加油", "未来", "谢谢", "记得", "夏天", "操场", "食堂", "宿舍",
    "拍照", "合照", "合唱", "篮球", "足球", "跑操", "作业", "考试", "再见",
    "想念", "排练", "唱歌", "教室", "军训", "照片"
  ];

  var ACCENTS = ["var(--blue)", "var(--seal)", "#4a6b4f", "#8a6a33"];

  var state = {
    all: [],
    tag: ""
  };

  function $(id) {
    return document.getElementById(id);
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function hash(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) {
      h = (h * 31 + s.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }

  /* -1.1deg ~ +1.1deg，同一个 id 每次结果一样 */
  function tiltOf(id) {
    return ((hash(id) % 221) / 100 - 1.1).toFixed(2) + "deg";
  }

  function fmtDate(iso) {
    if (!iso) return "";
    var p = String(iso).split("-");
    if (p.length !== 3) return String(iso);
    return p[0] + "." + p[1] + "." + p[2];
  }

  function today() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }

  function autoTags(text) {
    var out = [];
    for (var i = 0; i < DICT.length; i++) {
      if (text.indexOf(DICT[i]) >= 0) out.push(DICT[i]);
    }
    return out;
  }

  function normTags(msg) {
    var raw = Array.isArray(msg.tags) && msg.tags.length ? msg.tags : autoTags(msg.t || "");
    var seen = {};
    return raw.filter(function (t) {
      if (!t || seen[t]) return false;
      seen[t] = true;
      return true;
    });
  }

  /* ---------- 提示条 ---------- */

  var toastTimer = null;

  function showToast(text) {
    var el = $("toast");
    if (!el) return;
    el.textContent = text;
    el.classList.add("is-in");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove("is-in");
    }, 2200);
  }

  /* ---------- 关键词云 ---------- */

  function buildTags() {
    var counts = {};
    state.all.forEach(function (m) {
      m.tags.forEach(function (t) {
        counts[t] = (counts[t] || 0) + 1;
      });
    });

    var list = Object.keys(counts)
      .map(function (t) { return { t: t, c: counts[t] }; })
      .sort(function (a, b) {
        return b.c - a.c || a.t.localeCompare(b.t, "zh-Hans-CN");
      });

    var box = $("tags");
    box.innerHTML = "";

    /* 按「被提到几次」把所有词铺到 0.95rem ~ 2.05rem 之间，
       用平方根让中间档也有明显差别，不至于看着像一行普通文字。 */
    var maxC = list.length ? list[0].c : 1;
    var minC = list.length ? list[list.length - 1].c : 1;
    var span = Math.max(maxC - minC, 1);

    list.forEach(function (item) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tag";
      btn.dataset.tag = item.t;
      btn.setAttribute("aria-pressed", "false");

      var k = Math.sqrt((item.c - minC) / span);
      var size = 0.95 + k * 0.78;
      btn.style.setProperty("--tag-size", size.toFixed(2) + "rem");

      if (k > 0.7) {
        btn.style.color = "var(--blue)";
      } else if (k < 0.15) {
        btn.style.color = "var(--ink-3)";
      }

      btn.innerHTML = esc(item.t) + "<sup>" + item.c + "</sup>";
      btn.addEventListener("click", function () {
        toggleTag(item.t);
      });

      box.appendChild(btn);
    });

    $("tagCount").textContent = String(list.length);
  }

  function toggleTag(tag) {
    state.tag = state.tag === tag ? "" : tag;
    var btns = document.querySelectorAll(".tag");
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute(
        "aria-pressed",
        btns[i].dataset.tag === state.tag ? "true" : "false"
      );
    }
    renderWall();
  }

  /* ---------- 留言墙 ---------- */

  function renderWall() {
    var wall = $("wall");
    var st = $("wallState");
    var note = $("wallNote");

    if (!state.all.length) {
      wall.hidden = true;
      st.hidden = false;
      st.textContent = "墙上还是空的。第一句话可以是你写的。";
      note.textContent = "暂时没有留言。";
      return;
    }

    var list = state.all.filter(function (m) {
      if (!state.tag) return true;
      return m.tags.indexOf(state.tag) >= 0 || m.t.indexOf(state.tag) >= 0;
    });

    note.textContent = state.tag
      ? "只看「" + state.tag + "」的 " + list.length + " 条。再点一次这个词取消筛选。"
      : "共 " + list.length + " 条，新的在上。";

    wall.innerHTML = "";

    if (!list.length) {
      wall.hidden = true;
      st.hidden = false;
      st.textContent = "没有提到「" + state.tag + "」的留言。换个词试试。";
      return;
    }

    st.hidden = true;
    wall.hidden = false;

    var frag = document.createDocumentFragment();

    list.forEach(function (m) {
      var li = document.createElement("li");
      li.className = "note";
      li.style.setProperty("--tilt", tiltOf(m.id));
      li.style.setProperty("--accent", ACCENTS[hash(m.id) % ACCENTS.length]);

      var text = esc(m.t);
      if (state.tag) {
        var needle = esc(state.tag);
        text = text.split(needle).join("<mark>" + needle + "</mark>");
      }

      li.innerHTML =
        '<p class="note__text">' + text + "</p>" +
        '<div class="note__foot">' +
          '<span class="note__who">' +
            (m.s ? '<span class="note__seat">' + esc(m.s) + "</span>" : "") +
            esc(m.n) +
          "</span>" +
          "<span>" + esc(fmtDate(m.d)) + "</span>" +
        "</div>";

      frag.appendChild(li);
    });

    wall.appendChild(frag);
  }

  /* ---------- 写信 ---------- */

  function composeText() {
    var body = $("fText").value.trim();
    if (!body) return "";
    var name = $("fName").value.trim() || "匿名";
    var seat = $("fSeat").value.trim();
    return [
      body,
      "",
      "—— " + name + (seat ? "（" + seat + " 号）" : ""),
      fmtDate(today())
    ].join("\n");
  }

  function wireComposer() {
    var form = $("composer");
    var name = $("fName");
    var seat = $("fSeat");
    var text = $("fText");
    var count = $("fCount");
    var sendBtn = $("sendBtn");
    var copyBtn = $("copyBtn");

    /* 草稿 */
    try {
      var saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
      if (saved) {
        name.value = saved.n || "";
        seat.value = saved.s || "";
        text.value = saved.t || "";
      }
    } catch (e) {
      /* 隐私模式下 localStorage 可能直接用不了，忽略 */
    }

    var saveTimer = null;

    function saveDraft() {
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ n: name.value, s: seat.value, t: text.value })
        );
      } catch (e) {}
    }

    function scheduleSave() {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(saveDraft, 400);
    }

    function refresh() {
      var len = text.value.length;
      count.textContent = len + " / " + LIMIT;
      count.classList.toggle("is-over", len > LIMIT);
      var empty = !text.value.trim();
      sendBtn.disabled = empty;
      copyBtn.disabled = empty;
    }

    function onEdit() {
      scheduleSave();
      refresh();
    }

    name.addEventListener("input", onEdit);
    seat.addEventListener("input", onEdit);
    text.addEventListener("input", onEdit);

    /* ⌘ / Ctrl + Enter 直接生成邮件 */
    text.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        submit();
      }
    });

    function submit() {
      var body = composeText();
      if (!body) {
        showToast("先写点什么");
        text.focus();
        return;
      }
      var subject = "【CNZX 留言】" + (name.value.trim() || "匿名");
      window.location.href =
        "mailto:" + MAIL +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(body);
      showToast("已打开邮件客户端");
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      submit();
    });

    copyBtn.addEventListener("click", function () {
      var body = composeText();
      if (!body) {
        showToast("先写点什么");
        return;
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(body).then(function () {
          showToast("已复制，去微信或者邮件里粘贴吧");
        }, function () {
          fallbackCopy(body);
        });
      } else {
        fallbackCopy(body);
      }
    });

    function fallbackCopy(body) {
      var ta = document.createElement("textarea");
      ta.value = body;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-1000px";
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (e) {}
      document.body.removeChild(ta);
      showToast(ok ? "已复制" : "复制失败，请手动选中");
      text.focus();
    }

    refresh();
  }

  /* ---------- 启动 ---------- */

  function boot(data) {
    $("msgCount").textContent = String(state.all.length);
    buildTags();
    renderWall();
    wireComposer();

    if (data && data.updated) {
      var meta = document.querySelector(".board-head__meta");
      if (meta) {
        var span = document.createElement("span");
        span.textContent = "更新于 " + fmtDate(data.updated);
        meta.appendChild(span);
      }
    }
  }

  function fail(reason) {
    var st = $("wallState");
    var note = $("wallNote");
    if (note) note.textContent = "没有读到留言数据。";
    if (st) {
      st.hidden = false;
      st.innerHTML =
        "留言读不出来" +
        (reason ? "（" + esc(reason) + "）" : "") +
        "。如果你是把文件直接双击打开的，用本地服务器访问就好；" +
        "也可以直接写信给 <a href=\"mailto:" + MAIL + "\">" + MAIL + "</a>。";
    }
    var tags = $("tags");
    if (tags) tags.innerHTML = "";
  }

  fetch(DATA_URL, { cache: "no-cache" })
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(function (data) {
      var list = (data && data.messages) || [];

      state.all = list
        .map(function (m, i) {
          return {
            id: m.id || "m" + i,
            n: String(m.n || "").trim() || "匿名",
            s: m.s ? String(m.s).trim() : "",
            d: m.d || "",
            t: String(m.t || "").trim(),
            tags: normTags(m)
          };
        })
        .filter(function (m) {
          return m.t;
        })
        .sort(function (a, b) {
          return String(b.d).localeCompare(String(a.d));
        });

      boot(data);
    })
    .catch(function (err) {
      fail(err && err.message ? err.message : "");
    });
})();
