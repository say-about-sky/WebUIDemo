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
 * <p>Entries:</p>
 * <ul>
 *   <li>main menu {@code Web UI} -&gt; host-built page (index.html / game.html / two windows);</li>
 *   <li>in-game pause menu ({@link Pages#PAUSE}) -&gt; {@code 游戏命令} -&gt; game.html.</li>
 * </ul>
 */
@HotPluginInfo(
        id = "com.saysky.webdemo",
        name = "Web UI Demo",
        version = "0.2.0",
        trusted = true,
        description = "LoaderSettings WebUI demo (pages in resources/web, event demo in resources/event)"
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

            // Main menu entry -> host-built page; the raw dialog is the safety net.
            UiHost.addButton(pid, new TextButtonSpec() {
                @Override
                public String pageId() {
                    return Pages.MAIN_MENU.id();
                }

                @Override
                public String label() {
                    return "Web UI";
                }

                @Override
                public String tooltip() {
                    return "Web UI Demo";
                }

                @Override
                public void onClick() {
                    if (!UiHost.openPage(PAGE_ID)) {
                        openWeb(pid, "index.html", "Web UI Demo");
                    }
                }
            });

            UiHost.addCustomPage(new CustomPage(PAGE_ID, "Web UI")
                    .text("\u6253\u5f00\u7f51\u9875", new Runnable() {
                        @Override
                        public void run() {
                            openWeb(pid, "index.html", "Web UI Demo");
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

            // In-game entry (pause menu, only exists inside a save): console / event runtime test.
            // NOTE: deliberately NOT on the encyclopedia page - its rows are clipped by the section
            // headers, the pause menu is a plain button list so a new row fits cleanly.
            UiHost.addButton(pid, new TextButtonSpec() {
                @Override
                public String pageId() {
                    return Pages.PAUSE.id();
                }

                @Override
                public String label() {
                    return "\u6e38\u620f\u547d\u4ee4";
                }

                @Override
                public String tooltip() {
                    return "\u5411\u63a7\u5236\u53f0/\u4e8b\u4ef6\u5f15\u64ce\u53d1\u9001\u6307\u4ee4";
                }

                @Override
                public void onClick() {
                    openWeb(pid, "game.html", "Game Cmd Test");
                }
            });

            context.log("UiHost: " + UiHost.status());
        } catch (Throwable t) {
            context.log("WebCore/UI API unavailable (is LoaderSettings installed?): " + t);
        }
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
