# WebUIDemo（热插件）

> **简介**:演示**热插件的 Web UI 能力** —— 游戏内暂停菜单按钮 + 原生弹窗框架 + 系统 WebView 页面,
> `AOH3` / `AOHCache` 两个 JS 桥,游戏内命令 / 事件调用,以及热重载与缓存。
> 主菜单不再注册按钮(避免与 Army3DWeb 的「3D 调试」等插件抢位置);v0.4.0 起所有入口都在
> **剧本进行时**的暂停菜单里,见「游戏内测试」。
>
> **快速开始**:① `gradlew.bat shadowJar`（或 `build.bat`）→ ② `out\WebUIDemo.jar`（只有产物，不自动部署）→
> ③ 自行把 jar + `WebUIDemo.json` 复制到 `<游戏根>\hotplugins\`，`resources\` 复制到 `hotplugins\resources\WebUIDemo\`。
> **依赖**(不进版本库):JDK 11+、`HotPluginLoader-0.2.0.jar`、`LoaderSettings\out\ui-api.jar`。
> **许可**:GPL-3.0,见 `LICENSE.TXT`。
> **隐私**:不收集任何数据;示例页面只用假域名 `https://webdemo.local/` 演示离线缓存,不会真正联网。

LoaderSettings WebUI + **UI API v1** 的测试插件。

## 依赖

1. 先构建 LoaderSettings：`LoaderSettings\build-dex.bat`
   会产出 `LoaderSettings\out\classes.dex`（补丁）与 `LoaderSettings\out\ui-api.jar`（插件编译用）。
2. `build.gradle` 里两个依赖都是 `compileOnly`（`HotPluginLoader.jar + ui-api.jar`）；
   **不要把 ui-api.jar 里的类打进插件 jar**（运行时由补丁 dex 提供）。

## 构建

```bat
WebUIDemo\gradlew.bat shadowJar   rem 纯 Gradle:产物 out\WebUIDemo.jar
WebUIDemo\build.bat               rem 同一命令的批处理包装
```

只产出构建产物，不会向游戏目录写任何东西：

```text
WebUIDemo\out\WebUIDemo.jar     ← 复制到 <游戏根>\hotplugins\
WebUIDemo\WebUIDemo.json        ← 复制到 <游戏根>\hotplugins\
WebUIDemo\resources\            ← 复制到 <游戏根>\hotplugins\resources\WebUIDemo\
```

> **依赖/路径**:编译期依赖 `HotPluginLoader\build\libs\HotPluginLoader-*.jar` 与 `LoaderSettings\out\ui-api.jar`,
> 默认自动定位且都是纯 `compileOnly`(不会打进插件 jar);可用 `-PhostJar=` / `-PuiApiJar=` 或 `AOH_GAME_ROOT` 覆盖。
> 两者都不进版本库(`build\`、`out\`、`*.jar` 已在 `.gitignore` 中)。

### 构建加速（国内网络）

- 镜像顺序：阿里云 `gradle-plugin` → 阿里云 `public` → 华为云 → `mavenCentral()`（兜底）；
  `settings.gradle` 的 `pluginManagement` 专门给 shadow 插件配了镜像。
- `gradle.properties` 已开 `daemon / parallel / caching / vfs.watch` + 2 GB 堆，增量构建 ≈1 s。
- Gradle 发行包走腾讯云镜像（3.7 MB/s）。

### IntelliJ IDEA 运行/调试配置

`.run\` 内的配置打开工程即生效：

| 配置 | 类型 | 作用 |
|---|---|---|
| 构建 jar（gradle shadowJar） | Gradle | 出 `out\WebUIDemo.jar` |
| 调试游戏（桌面 JDWP 5005） | Remote JVM Debug | 先 `StartFinality-jdwp.bat` 启动游戏再 Debug |

## 游戏内测试

1. 安装带 `LoaderSettings\out\classes.dex` 的 APK（前置为 `classes.dex`，冷启动）；
2. **主菜单没有本插件的按钮**（避免和 Army3DWeb 的「3D 调试」等插件抢位置，也不用改 `Pages.MAIN_MENU`）；
3. 进入**存档**后按 Esc 打开暂停菜单（`Pages.PAUSE`，行插在标题条下方），应看到四行：

   | 暂停菜单行 | 打开 |
   |---|---|
   | `Web UI` | `index.html`（缓存 / URL / 快照演示） |
   | `网络自检` | `net.html` |
   | `游戏命令` | `game.html`（控制台 / 事件引擎） |
   | `双窗口` | 同一页面两个独立 WebView（`WebCore.openDialogAt`） |

   暂停菜单是滚动页（`PageSpec.KIND_SCROLL`），行多了会扩展滚动范围，不会把原生按钮挤掉。
4. 缓存测试（`AOHCache`）：
   - 点几次 `点击我` → 重开弹窗，计数应保留（元素缓存 `demo:counter`）；
   - 点 `URL 缓存测试` → 写入 `https://webdemo.local/demo.json` 后 `fetch` 立即成功（离线拦截命中）；
   - 点 `缓存：开` 关闭缓存后再点 URL 缓存测试 → `putUrl failed`，关闭重开后计数不保留；
   - `页面快照` → 写入 `page:index.html`；`清空缓存` 删除；底部显示 `enabled/files/bytes/dir`；
   - 文件位置：`hotplugins/resources/WebUIDemo/cache/`（不会写到其他地方）。
5. 暂停菜单 → `游戏命令`：打开 `game.html`，三类测试：
   - 控制台：`金币 +100`（`AOH3.game('gold 100')`）与任意命令输入框；
   - 普通事件：`AOH3.event(id, path)`（path=插件 resources 相对，可空）+ `AOH3.findEvent(id)`；
   - 任务事件：`AOH3.missionsEvent(id, assetPath)`（assetPath 可空=自动按 id 查找）+ `AOH3.findMissionsEvent(id)`；
     默认示例 `J9MIad @ game/missions/missionsEvents/administrative_buildings.txt`（注意 id 里是**大写 I**）。
6. 暂停菜单 → `Web UI`：点页面中间的按钮，页面内计数 +1，游戏底部出现原生 Toast `Clicked: N`。
7. **热更新**：编辑 `hotplugins\resources\WebUIDemo\web\app.js`
   （例如把 `var BUILD = 'v1'` 改成 `'v2'`）并保存；
   约 0.6 秒后页面自动重载，左下角版本号变为 `web-demo v2`。

页面全部是 `WebUIDemo\resources\web\` 下的**普通文件**（`index.html` / `app.js` / `game.html` / `game.js`），
`build.bat` 会把整个 `resources\` 目录（含 `event\event_demo.txt`）同步到 `hotplugins\resources\WebUIDemo\`，
改页面不需要重新编译 jar。

> 暂停菜单里另有「Web UI 面板」一行，点开的是插件自建的**原生 Menu**（`Ui.panel(...)` +
> `UiMenu.addAll/stack/sync/show`），演示 UiKit 的自有页面写法（页内 `打开网页 / 网络自检 /
> 游戏命令 / 双窗口`）。

日志：

```powershell
adb logcat -s AOH3Web AOH3UI
```

UI API 会自动写入 `hotplugins\ui.log`（按钮注册/挂载位置/修复），无 adb 时可让测试者直接取文件。

## 网络自检（`net.html`）

暂停菜单 → **`网络自检`**（`net.html`），用来判断游戏内 WebView 的网络能力，尤其是
**安卓 9+ 默认禁止明文 HTTP**（`net::ERR_CLEARTEXT_NOT_PERMITTED`）这一条。

点 `开始自检` 会依次探测（每项 8 秒超时）：

| # | 项目 | 说明 |
|---|---|---|
| 1-2 | `https://www.baidu.com` fetch / 图片 | HTTPS 基线 |
| 3-4 | `http://www.baidu.com` fetch / 图片 | **明文 HTTP** |
| 5 | `http://neverssl.com` fetch | 纯 http 站点(不会被重定向到 https) |
| 6 | `https://example.com` fetch | 另一个 HTTPS 基线 |
| 7 | `http://127.0.0.1:8787/api/ping` | 回环(Army3DWeb 在跑时才有意义) |
| 8 | `https://no-such-host-aoh3.invalid` | DNS 失败对照(应失败) |
| 9 | `net.html` 自身 | `file://` 本地读取是否可用 |

判定规则（页面顶部「结论」区）：

- **HTTPS 通 + 明文 HTTP 失败** → WebView 有网,但被 cleartext 策略拦住(最常见);
- **两者都通** → WebView 网络正常,问题在服务/端口;
- **两者都失败** → 没有网络出口(权限/系统 WebView)。

`手动测试` 区可输入任意 URL 做 `fetch` / 图片 / iframe(iframe 里直接显示 `ERR_…` 错误码,
注意站点自身的 `X-Frame-Options` 也会拒绝被嵌入,不代表网络故障)。

点 `复制报告`(或直接截图 `报告` 区)即可带走结果;报告同时写入 `AOHCache` 的
`net:report` 键(`hotplugins/resources/WebUIDemo/cache/`),并写到 `AOH3` 日志。

## 说明

- 插件首次运行会在自己的 `resources\WebUIDemo\web\` 下生成一份最小 HTML/JS（若文件已存在则不覆盖）。
- 插件通过反射调用 `com.saysky.web.WebCore`；未安装 LoaderSettings 时只会在 `hotloader.log` 记录一条 `WebCore unavailable`，不会崩溃。
- 事件接口（`WebEvents`/自定义触发器）尚未纳入本 demo；当前重点是 WebView、暂停菜单按钮、原生弹窗、热更新与 JS 桥。
