/* CNZX-202208 · 同学录 前端脚本
   数据来自 photos/albums.js（window.ALBUMS_DATA），
   若直接双击打开或数据缺失，再退回 fetch photos/albums.json。 */

(function () {
  "use strict";

  var PREFIX = "photos/";
  var CHUNK = 48;

  /* ---------------- 数据 ---------------- */

  function getData() {
    if (window.ALBUMS_DATA) return Promise.resolve(window.ALBUMS_DATA);
    return fetch(PREFIX + "albums.json", { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .catch(function (err) {
        console.error(err);
        return null;
      });
  }

  /* ---------------- 工具 ---------------- */

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function fmtDate(d) {
    return d ? d.replace(/-/g, ".") : "";
  }

  function srcsetOf(albumId, name, tiers) {
    return tiers
      .map(function (w) {
        return PREFIX + albumId + "/" + name + "-" + w + ".webp " + w + "w";
      })
      .join(", ");
  }

  function hash(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function tiltOf(name) {
    /* 稳定的微倾角，范围 -1.1deg ~ 1.1deg */
    return ((hash(name) % 9) / 4 - 1).toFixed(2) + "deg";
  }

  /* ---------------- 逐块出现 ---------------- */

  function revealAll(root) {
    var nodes = (root || document).querySelectorAll(".reveal:not(.is-in)");
    if (!("IntersectionObserver" in window)) {
      Array.prototype.forEach.call(nodes, function (n) {
        n.classList.add("is-in");
      });
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    Array.prototype.forEach.call(nodes, function (n) {
      io.observe(n);
    });
  }

  /* ---------------- 相册总览 ---------------- */

  function renderShelf(data, mount) {
    var frag = document.createDocumentFragment();

    data.albums.forEach(function (album, i) {
      var card = el("a", "album reveal");
      card.href = "album.html?id=" + encodeURIComponent(album.id);
      card.setAttribute("aria-label", album.title + "，共 " + album.count + " 张");

      card.appendChild(el("span", "album__tape"));

      var coverPhoto = coverOf(album);
      var coverTiers = coverPhoto.t || [480];
      var coverBig = coverTiers[coverTiers.length - 1];

      var cover = el("div", "album__cover");
      cover.appendChild(el("span", "album__no", String(i + 1)));

      var img = el("img");
      img.src = PREFIX + album.id + "/" + album.cover + "-" + coverBig + ".webp";
      img.srcset = srcsetOf(album.id, album.cover, coverTiers);
      img.sizes = "(max-width: 640px) 44vw, (max-width: 1100px) 30vw, 258px";
      img.loading = i < 3 ? "eager" : "lazy";
      img.decoding = "async";
      img.alt = "";
      img.width = coverPhoto.w || 480;
      img.height = coverPhoto.h || 360;
      img.style.background = coverPhoto.c || "";
      cover.appendChild(img);
      card.appendChild(cover);

      var body = el("div", "album__body");
      var title = el("h3", "album__title");
      title.appendChild(el("span", null, album.title));
      title.appendChild(el("span", "album__count", album.count + " 张"));
      body.appendChild(title);

      var meta = el("p", "album__meta");
      var span = album.from && album.to
        ? fmtDate(album.from) + (album.from === album.to ? "" : " — " + fmtDate(album.to))
        : "日期待补";
      meta.textContent = span;
      body.appendChild(meta);

      card.appendChild(body);
      frag.appendChild(card);
    });

    mount.appendChild(frag);
    revealAll(mount);
  }

  function coverOf(album) {
    var list = album.photos || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].n === album.cover) return list[i];
    }
    return list[0] || { t: [480], w: 480, h: 360, c: "#ded6c3" };
  }

  /* ---------------- 相册内页 ---------------- */

  function renderSheet(album, mount) {
    var frag = document.createDocumentFragment();
    var queue = album.photos.slice();
    var rendered = 0;

    var sentinel = el("div", "state");
    sentinel.style.height = "1px";
    sentinel.style.padding = "0";

    function batch() {
      var slice = queue.slice(0, CHUNK);
      queue = queue.slice(CHUNK);
      slice.forEach(function (p, k) {
        var index = rendered + k;
        frag.appendChild(makePhoto(album, p, index));
      });
      rendered += slice.length;
      mount.appendChild(frag);
      if (queue.length) {
        mount.appendChild(sentinel);
      } else if (sentinel.parentNode) {
        sentinel.parentNode.removeChild(sentinel);
      }
    }

    function bindSentinel() {
      if (!("IntersectionObserver" in window)) {
        while (queue.length) batch();
        return;
      }
      var io = new IntersectionObserver(
        function (entries) {
          if (!entries.some(function (e) { return e.isIntersecting; })) return;
          io.disconnect();
          if (queue.length) {
            batch();
            bindSentinel();
          }
        },
        { rootMargin: "600px 0px" }
      );
      io.observe(sentinel);
    }

    batch();
    if (queue.length) bindSentinel();
  }

  function makePhoto(album, p, index) {
    var btn = el("button", "photo");
    btn.type = "button";
    btn.style.setProperty("--tilt", tiltOf(p.n));
    btn.setAttribute(
      "aria-label",
      "查看 " + album.title + " 第 " + (index + 1) + " 张"
    );

    var frame = el("span", "photo__frame");
    var img = document.createElement("img");
    var big = p.t[p.t.length - 1];
    img.src = PREFIX + album.id + "/" + p.n + "-" + big + ".webp";
    img.srcset = srcsetOf(album.id, p.n, p.t);
    img.sizes = "(max-width: 640px) 46vw, (max-width: 900px) 44vw, 24vw";
    img.loading = index < 6 ? "eager" : "lazy";
    img.decoding = "async";
    img.width = p.w;
    img.height = p.h;
    img.alt = "";
    img.style.background = p.c || "";
    frame.appendChild(img);
    btn.appendChild(frame);

    var cap = el("span", "photo__cap");
    cap.appendChild(el("span", null, fmtDate(p.d)));
    cap.appendChild(el("span", null, pad(index + 1) + "/" + album.count));
    btn.appendChild(cap);

    btn.addEventListener("click", function () {
      openLightbox(album, index);
    });

    return btn;
  }

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  /* ---------------- 灯箱 ---------------- */

  var lb = null;
  var lbImg = null;
  var lbBar = null;
  var lbState = { album: null, index: 0 };

  function buildLightbox() {
    var dlg = document.createElement("dialog");
    dlg.className = "lightbox";
    dlg.setAttribute("aria-label", "照片浏览");

    var stage = el("div", "lightbox__stage");

    var prev = el("button", "lightbox__nav", "‹");
    prev.type = "button";
    prev.setAttribute("aria-label", "上一张");

    var figure = el("figure", "lightbox__figure");
    lbImg = document.createElement("img");
    lbImg.alt = "";
    lbImg.decoding = "async";
    figure.appendChild(lbImg);

    lbBar = el("figcaption", "lightbox__bar");
    figure.appendChild(lbBar);

    var next = el("button", "lightbox__nav", "›");
    next.type = "button";
    next.setAttribute("aria-label", "下一张");

    var close = el("button", "lightbox__nav lightbox__close", "×");
    close.type = "button";
    close.setAttribute("aria-label", "关闭");

    stage.appendChild(prev);
    stage.appendChild(figure);
    stage.appendChild(next);
    dlg.appendChild(stage);
    dlg.appendChild(close);

    prev.addEventListener("click", function () { step(-1); });
    next.addEventListener("click", function () { step(1); });
    close.addEventListener("click", function () { dlg.close(); });

    dlg.addEventListener("click", function (e) {
      if (e.target === dlg || e.target === stage) dlg.close();
    });

    dlg.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
      if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
      if (e.key === "Escape") { e.preventDefault(); dlg.close(); }
    });

    // 部分浏览器/嵌入环境下原生 Esc 不一定触发，自己兜一层
    dlg.addEventListener("cancel", function (e) {
      e.preventDefault();
      dlg.close();
    });

    dlg.addEventListener("close", function () {
      document.documentElement.style.overflow = "";
      lbState.album = null;
    });

    document.body.appendChild(dlg);
    lb = dlg;
  }

  function openLightbox(album, index) {
    if (!lb) buildLightbox();
    lbState.album = album;
    lbState.index = index;
    paint();
    document.documentElement.style.overflow = "hidden";
    if (typeof lb.showModal === "function") lb.showModal();
    else lb.setAttribute("open", "");
  }

  function step(delta) {
    var album = lbState.album;
    if (!album) return;
    var total = album.photos.length;
    lbState.index = (lbState.index + delta + total) % total;
    paint();
  }

  function paint() {
    var album = lbState.album;
    var p = album.photos[lbState.index];
    var big = p.t[p.t.length - 1];

    lbImg.src = PREFIX + album.id + "/" + p.n + "-" + big + ".webp";
    lbImg.srcset = srcsetOf(album.id, p.n, p.t);
    lbImg.sizes = "92vw";
    lbImg.width = p.w;
    lbImg.height = p.h;

    lbBar.textContent = "";
    lbBar.appendChild(el("span", null, album.title));
    lbBar.appendChild(el("span", null, (p.d ? fmtDate(p.d) : "日期不详")));
    lbBar.appendChild(el("span", null, pad(lbState.index + 1) + " / " + album.count));

    /* 预取相邻两张 */
    [-1, 1].forEach(function (d) {
      var q = album.photos[(lbState.index + d + album.photos.length) % album.photos.length];
      if (!q) return;
      var pre = new Image();
      pre.src = PREFIX + album.id + "/" + q.n + "-" + q.t[q.t.length - 1] + ".webp";
    });
  }

  /* ---------------- 首页：最近拍的 ---------------- */

  function renderRecent(data, mount) {
    var flat = [];
    data.albums.forEach(function (a) {
      a.photos.forEach(function (p, i) {
        flat.push({ album: a, photo: p, index: i });
      });
    });
    flat.sort(function (x, y) {
      var dx = x.photo.d || "0000";
      var dy = y.photo.d || "0000";
      if (dx === dy) return 0;
      return dx < dy ? 1 : -1;
    });

    var row = el("div", "recent");
    flat.slice(0, 6).forEach(function (item) {
      var node = makePhoto(item.album, item.photo, item.index);
      node.classList.add("photo--mini");
      row.appendChild(node);
    });
    mount.appendChild(row);
  }

  /* ---------------- 页面分发 ---------------- */

  function boot() {
    revealAll(document);

    var shelf = document.getElementById("shelf");
    var sheet = document.getElementById("sheet");
    var recent = document.getElementById("recent");
    var stats = document.getElementById("statPhotos");

    if (!shelf && !sheet && !recent && !stats) return;

    getData().then(function (data) {
      if (!data || !data.albums || !data.albums.length) {
        var mount = shelf || sheet || recent;
        if (mount) {
          mount.innerHTML =
            '<p class="state">相册数据还没生成。先在电脑上运行 <code>py -3 -X utf8 tools/build_photos.py</code>，' +
            '或用本地服务器打开本站（见 README）。</p>';
        }
        return;
      }

      var totalPhotos = document.getElementById("statPhotos");
      var totalAlbums = document.getElementById("statAlbums");
      if (totalPhotos) totalPhotos.textContent = data.total;
      if (totalAlbums) totalAlbums.textContent = data.albums.length;

      if (recent) renderRecent(data, recent);
      if (shelf) {
        renderShelf(data, shelf);
        return;
      }
      if (!sheet) return;

      var id = new URLSearchParams(location.search).get("id");
      var index = -1;
      var album = null;
      data.albums.forEach(function (a, i) {
        if (a.id === id) { album = a; index = i; }
      });

      if (!album) {
        document.getElementById("albumHead").innerHTML =
          '<p class="state">没找到这本相册。<a href="gallery.html">回到相册总览</a></p>';
        return;
      }

      document.title = album.title + " · 初中生活记忆馆";
      document.getElementById("albumNo").textContent =
        "第 " + (index + 1) + " 本 / 共 " + data.albums.length + " 本";
      document.getElementById("albumTitle").textContent = album.title;
      document.getElementById("albumMeta").innerHTML =
        "<span>" + album.count + " 张照片</span>" +
        "<span>" + (album.from ? fmtDate(album.from) + " — " + fmtDate(album.to) : "日期待补") + "</span>" +
        (album.videos ? "<span>" + album.videos + " 段视频（待整理）</span>" : "");

      renderSheet(album, sheet);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
