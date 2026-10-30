# WebUIDemo（热插件）

> **简介**:演示**热插件的 Web UI 能力** —— 主菜单按钮 + 原生弹窗框架 + 系统 WebView 页面,
> `AOH3` / `AOHCache` 两个 JS 桥,游戏内命令 / 事件调用,以及热重载与缓存。
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
2. 启动后进入主菜单，应看到新增的 **Web UI** 按钮；
3. 进入 **设置** 页：`Back` 下方应自动多出一整行 **Web UI**；点击后会打开一个**插件自定义的原生页面**（标题 + 关闭 X + 两行按钮：`打开网页` / `返回设置` / `双窗口`）。
4. 自定义页里点 `打开网页` → 原生弹窗 + WebView；点 `返回设置` → 跳回设置页（`UiHost.openPage(Pages.SETTINGS.id())`）。
5. 点 `双窗口` → 同时打开两个独立 WebView 弹窗（左右并排，`WebCore.openDialogAt`）。
6. 缓存测试（`AOHCache`）：
   - 点几次 `点击我` → 重开弹窗，计数应保留（元素缓存 `demo:counter`）；
   - 点 `URL 缓存测试` → 写入 `https://webdemo.local/demo.json` 后 `fetch` 立即成功（离线拦截命中）；
   - 点 `缓存：开` 关闭缓存后再点 URL 缓存测试 → `putUrl failed`，关闭重开后计数不保留；
   - `页面快照` → 写入 `page:index.html`；`清空缓存` 删除；底部显示 `enabled/files/bytes/dir`；
   - 文件位置：`hotplugins/resources/WebUIDemo/cache/`（不会写到其他地方）。
7. 主菜单只有一个 `Web UI` 按钮：点它进入插件自定义页（`UiHost.openPage`），
   页内 `打开网页 / 游戏命令 / 返回设置 / 双窗口` 全部由 UI API 自动布局。

页面全部是 `WebUIDemo\resources\web\` 下的**普通文件**（`index.html` / `app.js` / `game.html` / `game.js`），
`build.bat` 会把整个 `resources\` 目录（含 `event\event_demo.txt`）同步到 `hotplugins\resources\WebUIDemo\`，
改页面不需要重新编译 jar。

8. 进入**存档**后按 Esc 打开暂停菜单：新增 `游戏命令` 行（`Pages.PAUSE`，插在标题条下方；不再放百科全书页——那里的行会被分节标题裁掉）→
   打开 `game.html`，三类测试：
   - 控制台：`金币 +100`（`AOH3.game('gold 100')`）与任意命令输入框；
   - 普通事件：`AOH3.event(id, path)`（path=插件 resources 相对，可空）+ `AOH3.findEvent(id)`；
   - 任务事件：`AOH3.missionsEvent(id, assetPath)`（assetPath 可空=自动按 id 查找）+ `AOH3.findMissionsEvent(id)`；
     默认示例 `J9MIad @ game/missions/missionsEvents/administrative_buildings.txt`（注意 id 里是**大写 I**）。
6. 点击页面中间的按钮：
   - 页面内计数 +1；
   - 游戏底部出现原生 Toast：`Clicked: N`；
7. **热更新**：编辑 `hotplugins\resources\WebUIDemo\web\app.js`
   （例如把 `var BUILD = 'v1'` 改成 `'v2'`）并保存；
   约 0.6 秒后页面自动重载，左下角版本号变为 `web-demo v2`。

日志：

```powershell
adb logcat -s AOH3Web AOH3UI
```

UI API 会自动写入 `hotplugins\ui.log`（按钮注册/挂载位置/修复），无 adb 时可让测试者直接取文件。

## 说明

- 插件首次运行会在自己的 `resources\WebUIDemo\web\` 下生成一份最小 HTML/JS（若文件已存在则不覆盖）。
- 插件通过反射调用 `com.saysky.web.WebCore`；未安装 LoaderSettings 时只会在 `hotloader.log` 记录一条 `WebCore unavailable`，不会崩溃。
- 事件接口（`WebEvents`/自定义触发器）尚未纳入本 demo；当前重点是 WebView、主菜单按钮、原生弹窗、热更新与 JS 桥。
