# CNZX-202208 · 初中生活记忆馆

2022 届初中八班（CNZX）的班级纪念站：**一本可以随时翻开的相册**。
纯静态、无构建工具、无后端，`img/` 里的原图由脚本批量压成 WebP 三档尺寸，页面只读 `photos/`。

> 仓库：<https://github.com/Chai-Bing-Kun/CNZX-202208>
> 在线：<https://cn-202208.pages.dev/>（Cloudflare Pages）

---

## 一句话结构

```
img/（原图，2 GB 级，不入库）
   └─ tools/build_photos.py  ──▶  photos/（WebP 三档 + albums.json）
                                      └─▶ main.html / gallery.html / album.html
```

页面本身不含任何照片清单，全部由 `photos/albums.json` 驱动。加照片只需要丢进 `img/<相册>/` 再跑一次脚本。

---

## 页面

| 文件 | 作用 |
| --- | --- |
| `main.html` | 新首页。报头 + 统计 + 「最近拍的」六张 + 47 位同学名录。 |
| `gallery.html` | 相册总览。按拍摄时间列出全部相册（封面、张数、日期区间）。 |
| `album.html?id=<id>` | 单本相册。瀑布流「照片纸」布局，点开进灯箱，支持 ← → 与 Esc。 |
| `word-clouds/word-clouds.html` | 3D 毕业祝福词云（沿用旧页）。 |
| `no-information.html` / `no-body.html` | 两个占位页，已改成新设计语言。 |
| `index.html` | 入口，直接 `location.replace('./main.html')`，一站到底。 |

### 资源

| 文件 | 作用 |
| --- | --- |
| `assets/site.css` | 新设计系统：牛皮纸 + 装订孔 + 胶带照片，全部尺寸在 `:root` 变量里。 |
| `assets/site.js` | 数据读取、相册/照片渲染、分块加载（每次 48 张）、灯箱。 |
| `tools/build_photos.py` | 图片压缩 + 清单生成脚本（下面详述）。 |
| `photos/` | **构建产物**，脚本生成，随站点一起发布。 |
| `photos/.cache.json` | 增量构建缓存（不进版本库）。 |

---

## 图片管线

原图放在 `img/` 下，不随仓库发布（见 `.gitignore`：只忽略 `img/*/` 子目录，`img/` 根目录的 `1.JPG` 等主视觉仍在库里）。

```bash
py -3 -X utf8 tools/build_photos.py              # 增量：已存在的档位直接跳过
py -3 -X utf8 tools/build_photos.py --force      # 全部重编码
py -3 -X utf8 tools/build_photos.py --limit 20   # 只跑前 20 张试水
```

做的事：

1. 按 `ALBUMS` 表把 `img/<目录>` 映射成相册 id 与标题；
2. 每张照片输出 **480 / 1280 / 1920**（长边）三档 WebP，质量为 66 / 72 / 74；原图比某档还小时自动并档；
3. JPEG 先用 `draft()` 做 DCT 快速解码，只解到 1920 就够；三档从大到小依次缩放，大图只做一次 LANCZOS；
4. `ImageOps.exif_transpose` 摆正方向，**剥离全部 EXIF（含 GPS）**；
5. 取 1×1 缩略算主色，写进清单，用于图片加载前的占位底色；
6. 拍摄时间取自 EXIF `DateTimeOriginal`，没有则退回文件修改时间；
7. 输出 `photos/<album>/<文件名>-<宽>.webp`、`photos/albums.json`、`photos/albums.js`（省掉首屏一次 fetch）；
8. `photos/.cache.json` 记录每张原图的 mtime/size 与产物信息，**重复运行基本是秒级**。

清单结构：

```json
{ "generated": "...", "tiers": [480,1280,1920], "total": 644,
  "albums": [{ "id": "study-tour-4", "title": "第四次研学", "count": 193,
               "videos": 1, "from": "2024-11-08", "to": "2024-11-09",
               "cover": "DSCF1234",
               "photos": [{ "n":"DSCF1234", "w":1920, "h":1280,
                            "c":"#6b5844", "d":"2024-11-08", "t":[480,1280,1920] }] }] }
```

> 脚本只看路径和 EXIF，**从不判断照片内容**，所以新照片加进来不需要任何人工标注。

### 视频

`img/` 下另有 23 个 `.mp4`，脚本只在清单里统计数量（`videos`），暂不转码、不上传。

---

## 本地预览

```bash
py -3 -m http.server 8866
```

然后打开 <http://127.0.0.1:8866/main.html>。

直接双击 HTML 也能看，但 `photos/albums.js` 之外的兜底 `fetch` 会被 `file://` 拦住，所以还是建议起个服务器。

---

## 设计约定

- 背景牛皮纸 `--paper`，装订孔在 `.page::before` 里（`--spine` 控制宽度，移动端 68px → 26px）；
- 照片是「拍立得」：白边、轻微随机倾斜（按文件名哈希，稳定不跳）、悬停才浮出胶带；
- 显示字体走楷体栈（`--f-display`），数据与日期走等宽字体；
- 印章红 `--seal` 只用在编号、标签这类小面积上；
- 灯箱是原生 `<dialog>`，`100vw/100vh` 铺满，方向键翻页，打开时锁滚动；
- 断点 900px / 640px，`prefers-reduced-motion` 与 `print` 都有兜底。

新增页面时直接引 `assets/site.css`，报头用 `.masthead`、内容包一层 `.page`、页脚用 `.foot` 即可。

---

## 已知事项

- `photos/` 目录体积不小，首次构建要跑十几分钟；之后再跑是增量，很快。
- 照片目前 `alt=""`（没有内容描述），需要无障碍时可后续补。
- `同学总名字临时存储.txt` 是 47 人名单的原始片段，名录已固化在 `main.html`。
- 旧的 `styles.css` / `scripts.js` / `happy-times/` / 三段式入口页已删除；
  原来引导页里的离线压缩包与安卓 APP 下载链接，挪到了首页页脚。

---

## 部署

推送到 `main` 分支，Cloudflare Pages 自动构建（无需构建命令，输出目录为仓库根目录）。

```bash
git add -A
git commit -m "重新设计站点结构：相册驱动的静态照片站"
git push
```
