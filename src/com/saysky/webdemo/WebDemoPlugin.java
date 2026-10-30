package com.saysky.webdemo;

import java.io.File;

import com.saysky.hotplugloader.api.HotContext;
import com.saysky.hotplugloader.api.HotPlugin;
import com.saysky.hotplugloader.api.HotPluginInfo;
import com.saysky.ui.UiHost;
import com.saysky.ui.api.CustomPage;
import com.saysky.ui.api.Pages;
import com.saysky.ui.api.TextButtonSpec;

/**
 * WebUI demo plugin.
 *
 * <p>All pages are plain files under {@code resources/web/} (deployed next to the jar) and the
 * event demo is {@code resources/event/event_demo.txt}; nothing is generated from Java strings,
 * so the pages can be edited without rebuilding the jar.</p>
 *
 * <p>Entries: 全部挂在<b>剧本进行时</b>的暂停菜单(Esc)上,主菜单不再占用按钮(留给 Army3DWeb 等插件):</p>
 * <ul>
 *   <li>{@code Web UI} -&gt; index.html(缓存 / URL / 快照演示);</li>
 *   <li>{@code 网络自检} -&gt; net.html;</li>
 *   <li>{@code 游戏命令} -&gt; game.html(控制台 / 事件引擎);</li>
 *   <li>{@code 双窗口} -&gt; 同一页面两个独立窗口。</li>
 * </ul>
 *
 * <p>{@code net.html} 是网络自检页:分别探测 HTTPS / 明文 HTTP / 回环 127.0.0.1 / DNS 失败,
 * 用来判断游戏内 WebView 是否被 <b>cleartext 策略</b>(安卓 9+ 默认禁止 http)拦住。</p>
 */
@HotPluginInfo(
        id = "com.saysky.webdemo",
        name = "Web UI Demo",
        version = "0.4.0",
        trusted = true,
        description = "LoaderSettings WebUI demo (pages in resources/web, event demo in resources/event, net self-check)"
)
public final class WebDemoPlugin implements HotPlugin {

    /** Plugin-owned page (host builds the native menu). */
    static final String PAGE_ID = "webdemo.page";

    @Override
    public void init(HotContext context) {
        try {
            File web = new File(context.dataDir(), "web");
            if (!web.isDirectory()) {
                //noinspection ResultOfMethodCallIgnored
                web.mkdirs();
            }
            context.log("web dir: " + web.getAbsolutePath());

            Class<?> core = Class.forName("com.saysky.web.WebCore");
            core.getMethod("registerPlugin", String.class, String.class, String.class)
                    .invoke(null, context.id(), web.getAbsolutePath(), "index.html");
            context.log("WebCore: " + core.getMethod("status").invoke(null));

            // Java-side cache self-test (the JS side is exercised by index.html).
            try {
                Class<?> wc = Class.forName("com.saysky.web.WebCache");
                String cid = context.id();
                Object put = wc.getMethod("put", String.class, String.class, String.class)
                        .invoke(null, cid, "java:init", String.valueOf(System.currentTimeMillis()));
                Object got = wc.getMethod("get", String.class, String.class)
                        .invoke(null, cid, "java:init");
                Object bad = wc.getMethod("put", String.class, String.class, String.class)
                        .invoke(null, cid, "../escape.txt", "x");
                Object stats = wc.getMethod("stats", String.class).invoke(null, cid);
                context.log("WebCache: put=" + put + " get=" + got
                        + " escapeRejected=" + Boolean.valueOf(!Boolean.TRUE.equals(bad))
                        + " " + stats);
            } catch (Throwable t) {
                context.log("WebCache unavailable: " + t);
            }

            final String pid = context.id();

            // 只挂在「剧本进行时」的暂停菜单(Esc)。主菜单留给其它插件(例如 Army3DWeb 的「3D 调试」)。
            // 每行都走 WebCore.openDialog → 游戏内 WebView,已实测可用。
            addPauseButton(pid, "Web UI", "index.html",
                    "\u7f13\u5b58 / URL / \u5feb\u7167\u6f14\u793a");
            addPauseButton(pid, "\u7f51\u7edc\u81ea\u68c0", "net.html",
                    "HTTPS / \u660e\u6587 HTTP / \u56de\u73af 127.0.0.1 \u63a2\u6d4b");
            addPauseButton(pid, "\u6e38\u620f\u547d\u4ee4", "game.html",
                    "\u5411\u63a7\u5236\u53f0/\u4e8b\u4ef6\u5f15\u64ce\u53d1\u9001\u6307\u4ee4");
            UiHost.addButton(pid, new TextButtonSpec() {
                @Override
                public String pageId() {
                    return Pages.PAUSE.id();
                }

                @Override
                public String label() {
                    return "\u53cc\u7a97\u53e3";
                }

                @Override
                public String tooltip() {
                    return "\u540c\u4e00\u9875\u9762\u5f00\u4e24\u4e2a\u72ec\u7acb WebView \u7a97\u53e3";
                }

                @Override
                public void onClick() {
                    openTwoWindows(pid);
                }
            });

            // CustomPage API 演示(host 生成的原生菜单)。暂停菜单里没有它的入口,
            // 需要时用 UiHost.openPage("webdemo.page") 打开。
            UiHost.addCustomPage(new CustomPage(PAGE_ID, "Web UI")
                    .text("\u6253\u5f00\u7f51\u9875", new Runnable() {
                        @Override
                        public void run() {
                            openWeb(pid, "index.html", "Web UI Demo");
                        }
                    })
                    .text("\u7f51\u7edc\u81ea\u68c0", new Runnable() {
                        @Override
                        public void run() {
                            openWeb(pid, "net.html", "\u7f51\u7edc\u81ea\u68c0");
                        }
                    })
                    .text("\u6e38\u620f\u547d\u4ee4", new Runnable() {
                        @Override
                        public void run() {
                            openWeb(pid, "game.html", "Game Cmd Test");
                        }
                    })
                    .link("\u8fd4\u56de\u8bbe\u7f6e", Pages.SETTINGS.id())
                    .text("\u53cc\u7a97\u53e3", new Runnable() {
                        @Override
                        public void run() {
                            openTwoWindows(pid);
                        }
                    }));

            context.log("UiHost: " + UiHost.status());
        } catch (Throwable t) {
            context.log("WebCore/UI API unavailable (is LoaderSettings installed?): " + t);
        }
    }

    /** 在「剧本进行时」的暂停菜单加一行,点击用游戏内 WebView 打开 {@code resources/web/<entry>}。 */
    private static void addPauseButton(final String pluginId, final String rowLabel, final String entry,
                                      final String tip) {
        UiHost.addButton(pluginId, new TextButtonSpec() {
            @Override
            public String pageId() {
                return Pages.PAUSE.id();
            }

            @Override
            public String label() {
                return rowLabel;
            }

            @Override
            public String tooltip() {
                return tip;
            }

            @Override
            public void onClick() {
                openWeb(pluginId, entry, rowLabel);
            }
        });
    }

    private static void openWeb(String pluginId, String entry, String title) {
        try {
            Class<?> core = Class.forName("com.saysky.web.WebCore");
            core.getMethod("openDialog", String.class, String.class, String.class)
                    .invoke(null, pluginId, entry, title);
        } catch (Throwable ignored) {
        }
    }

    /** 演示：同一页面开两个独立窗口（不同矩形 = 不同会话）。 */
    private static void openTwoWindows(String pluginId) {
        try {
            Class<?> cfg = Class.forName("aoc.kingdoms.lukasz.jakowski.CFG");
            int gw = cfg.getField("GAME_WIDTH").getInt(null);
            int gh = cfg.getField("GAME_HEIGHT").getInt(null);
            int w = Math.max(240, gw / 2 - 24);
            int h = Math.max(200, gh - 220);
            Class<?> core = Class.forName("com.saysky.web.WebCore");
            java.lang.reflect.Method m = core.getMethod("openDialogAt",
                    String.class, String.class, String.class,
                    int.class, int.class, int.class, int.class);
            m.invoke(null, pluginId, "index.html", "Web UI A", 16, 120, w, h);
            m.invoke(null, pluginId, "index.html", "Web UI B", gw - w - 16, 120, w, h);
        } catch (Throwable ignored) {
        }
    }
}
