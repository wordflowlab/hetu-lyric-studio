import { test, expect, _electron as electron } from "@playwright/test";
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import manifest from "../../contracts/plugin-manifest.json" with { type: "json" };
import {
  scenario,
  original,
  base,
  selection,
  sha,
} from "../support/scenario.ts";
import {chromium} from "@playwright/test";
import {pathToFileURL} from "node:url";
import { config } from "../../src/domain/config.ts";
import { start, host } from "../support/machine.ts";
import { importText } from "../support/import.ts";
import {fixedScript} from "../support/fixed-script.ts";
import {importAsset} from "../support/assets.ts";
import {wav,addTake,lrc} from "../support/scenario.ts";
test("真实Electron审阅、专业操作、导出、冲突保留与关闭重开", async ({}, info) => {
  test.setTimeout(600000);
  const c = await start();
  let app: any;
  const slug = manifest.id.replace("org.wordflowlab.", ""),
    errors: string[] = [];
  try {
    const source=await fixedScript(c,original,'ui-source'),audioRef=await importAsset(c,wav(),'原创节拍测试音.wav','ui-audio');
    const refs=[source.source_ref,audioRef],p=addTake(scenario());
    let record: any;
    const exports = path.join(c.directory, "exports");
    await mkdir(exports);
    app = await electron.launch({
      executablePath:
        process.env.HETU_PACKAGED_APP ??
        createRequire(path.join(host, "package.json"))("electron"),
      args: process.env.HETU_PACKAGED_APP
        ? []
        : [path.join(host, "apps/desktop")],
      env: c.env,
    });
    await app.evaluate(
      ({ dialog }: any, { workspace, exports }: any) => {
        dialog.showOpenDialog = async () => ({
          canceled: false,
          filePaths: [workspace],
        });
        dialog.showSaveDialog = async (...args: any[]) => ({
          canceled: false,
          filePath:
            exports +
            "/" +
            (args.at(-1)?.defaultPath ?? "成果.html").split(/[\\/]/).pop(),
        });
        dialog.showMessageBox = async () => ({
          response: 1,
          checkboxChecked: false,
        });
      },
      { workspace: c.workspace, exports },
    );
    const shell = await app.firstWindow();
    await shell
      .getByRole("button", { name: "打开作品", exact: true })
      .first()
      .click();
    await shell
      .getByRole("button", { name: "雨港主题歌", exact: false })
      .first()
      .click();
    const open = async () => {
      await shell
        .getByRole("button", { name: manifest.display["zh-CN"], exact: true })
        .click();
      await expect
        .poll(() =>
          app
            .context()
            .pages()
            .some((p: any) => p.url().startsWith("hetu-plugin:")),
        )
        .toBe(true);
      const page = app
        .context()
        .pages()
        .find((p: any) => p.url().startsWith("hetu-plugin:"));
      page.on("pageerror", (e: Error) => errors.push(e.message));
      return page;
    };
    let page: any = await open();
    await expect(
      page.getByRole("heading", { name: "从作品出发", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: info.outputPath("empty.png"),
      fullPage: true,
    });
    record = await c.invoke("save_project", {
      content: p,
      source_refs: refs,
      expected_revision: 0,
      expected_sha256: "",
      operation_key: "ui-seed",
    });
    await page.getByRole("button", { name: "刷新", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: p.title, level: 2, exact: true }),
    ).toBeVisible();
    for (const [index, name] of config.tabs.entries()) {
      await page.bringToFront();
      await page
        .getByRole("navigation", { name: "专业视图" })
        .getByRole("button", { name, exact: true })
        .click();
      await expect(
        page.getByRole("button", { name, exact: true }),
      ).toHaveAttribute("aria-current", "page");
      await page.screenshot({
        path: info.outputPath("view-" + index + ".png"),
        fullPage: true,
      });
    }
    const tab = async (index: number) => {
      await page.bringToFront();
      const button=page.getByRole("navigation",{name:"专业视图"}).getByRole("button",{name:config.tabs[index],exact:true});
      await button.focus();await expect(button).toBeFocused();await button.click();
      await expect(button).toHaveAttribute("aria-current","page");
    };
    await tab(0);await expect(page.locator('.song-copy')).toContainText('旧信落在雨声里');await expect(page.locator('.song-copy section')).toHaveCount(3);
    await page.getByRole('button',{name:'查看原句依据'}).first().click();await expect(page.getByLabel('固定依据')).toContainText('旧信落在雨声里');await page.getByRole('button',{name:'关闭依据'}).click();
    await tab(1);await expect(page.locator('.lyric-table')).toContainText('超出约束');await expect(page.locator('.rhyme-groups')).toContainText('声明韵尾存在差异');
    await tab(2);await page.getByRole('button',{name:'载入实际音频',exact:true}).click();await expect(page.getByLabel('实际录音波形')).toBeVisible();
    const player=page.getByLabel('实际歌词录音', {exact:true});await expect.poll(()=>player.evaluate((a:HTMLAudioElement)=>a.readyState)).toBeGreaterThanOrEqual(1);expect(await player.evaluate((a:HTMLAudioElement)=>a.duration)).toBe(4);
    await player.dispatchEvent('error');await expect(page.getByRole('alert')).toContainText('音频未能播放');await expect(page.getByLabel('实际录音波形')).toBeVisible();await page.getByRole('button',{name:'载入实际音频',exact:true}).click();await expect(page.getByRole('alert')).toHaveCount(0);
    await page.getByText('导入逐句LRC',{exact:true}).click();await page.getByLabel('LRC原文').fill(lrc(p));await page.getByRole('button',{name:'预览LRC',exact:true}).click();await expect(page.getByText('6条时间 正offset提前显示')).toBeVisible();await page.getByRole('button',{name:'按预览对齐当前录音',exact:true}).click();await expect(page.getByRole('status')).toContainText('已保存');
    await page.getByRole('button',{name:'载入实际音频',exact:true}).click();await page.getByRole('button',{name:'定位 钥匙藏着你的名',exact:true}).click();expect(await player.evaluate((a:HTMLAudioElement)=>a.currentTime)).toBeCloseTo(.5,1);await player.evaluate(async(a:HTMLAudioElement)=>{await a.play();});await expect.poll(()=>player.evaluate((a:HTMLAudioElement)=>a.currentTime)).toBeGreaterThan(.6);await player.evaluate((a:HTMLAudioElement)=>a.pause());
    await tab(3);await expect(page.locator('.variant-grid')).toContainText('旧信轻轻落在雨声里');
    await page.getByText('为当前歌词留意见',{exact:true}).click();await page.getByLabel('歌词意见',{exact:true}).fill('保留旧信意象，核对首句呼吸。');await page.getByRole('button',{name:'保存固定意见',exact:true}).click();await expect(page.getByRole('status')).toContainText('已保存');
    await tab(4);await page.getByRole('button',{name:'导出当前LRC',exact:true}).click();await expect(page.getByRole('status')).toContainText('文件已按固定修订导出');await page.getByRole('button',{name:'导出完整审核本',exact:true}).click();await expect(page.getByRole('status')).toContainText('文件已按固定修订导出');
    await page.getByRole('button',{name:'准备固定专业交接',exact:true}).click();await expect(page.getByLabel('固定依据')).toContainText('4000');await page.getByRole('button',{name:'关闭依据'}).click();
    await page.getByRole('button',{name:'让AI处理',exact:true}).click();await expect(page.getByRole('status')).toContainText('已复制');const clipboard=await app.evaluate(({clipboard}:any)=>clipboard.readText());expect(clipboard).toContain('org.wordflowlab.lyric-studio');
    const normalDisplay = await app.context().newCDPSession(page);
    await normalDisplay.send("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-transparency",value:"no-preference"},{name:"prefers-contrast",value:"no-preference"}]});
    for (const theme of ["light", "dark"] as const) {
      await app.evaluate(({webContents}:any,theme:any)=>{for(const w of webContents.getAllWebContents())if(w.getURL().startsWith("hetu-plugin:"))w.send("plugin:preferences",{theme,language:"zh-CN"});},theme);
      await normalDisplay.send("Emulation.setEmulatedMedia",{features:[{name:"prefers-color-scheme",value:theme},{name:"prefers-reduced-transparency",value:"no-preference"},{name:"prefers-contrast",value:"no-preference"}]});
      for (const width of [1360, 760]) {
        await page.setViewportSize({ width, height: 900 });
        await page.screenshot({
          path: info.outputPath(theme + "-" + width + ".png"),
          fullPage: true,
        });
        for (const [viewIndex, viewName] of config.tabs.entries()) {
          await tab(viewIndex);
          if(viewIndex===1)await expect(page.locator('.lyric-table')).toContainText('字数与范围');
          if(viewIndex===2){await page.getByRole('button',{name:'载入实际音频',exact:true}).click();await expect(page.getByLabel('实际录音波形')).toBeVisible();}
          await page.screenshot({
            path: info.outputPath(
              theme + "-" + width + "-view-" + viewIndex + ".png",
            ),
            fullPage: true,
          });
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth > innerWidth + 1,
            ),
            viewName + " overflow",
          ).toBe(false);
        }
        const metrics = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
          background: getComputedStyle(document.body).backgroundImage,
          sizes: [
            ...new Set(
              [...document.querySelectorAll("body *")]
                .filter((e) => {
                  const r = e.getBoundingClientRect();
                  return r.width && r.height;
                })
                .map((e) => getComputedStyle(e).fontSize),
            ),
          ],
        }));
        expect(metrics.overflow).toBe(false);
        expect(metrics.background).toContain("gradient");
        expect(metrics.sizes.length).toBeLessThanOrEqual(4);
      }
    }
    const focused = page.getByRole("button", { name: "让AI处理", exact: true });
    await focused.focus();
    await expect(focused).toBeFocused();
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe(
      "BODY",
    );
    const filesBeforeCancel = await readdir(exports);
    await app.evaluate(({ dialog }: any) => {
      dialog.showSaveDialog = async () => ({
        canceled: true,
        filePath: undefined,
      });
    });
    await page.getByRole("button", { name: "导出报告", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("已取消导出");
    expect(await readdir(exports)).toEqual(filesBeforeCancel);
    const display = await app.context().newCDPSession(page);
    await display.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-transparency", value: "reduce" }],
    });
    const metrics=await page.evaluate(()=>({reduced:matchMedia("(prefers-reduced-transparency:reduce)").matches,background:getComputedStyle(document.body).backgroundImage}));
    expect(metrics.reduced).toBe(true);expect(metrics.background).not.toContain("gradient");
    await page.screenshot({
      path: info.outputPath("reduced-transparency.png"),
      fullPage: true,
    });
    await page.locator("summary").filter({ hasText: "高级" }).click();
    await page
      .getByRole("button", { name: "编辑专业数据", exact: true })
      .click();
    record = await c.invoke("get_project", {
      object_id: record.object.object_id,
    });
    const draft = { ...record.object.content, title: "雨港等晴 作者修订" };
    await page
      .getByLabel("专业数据", { exact: true })
      .fill(JSON.stringify(draft, null, 2));
    const external = { ...record.object.content, title: "外部Agent新修订" };
    await c.invoke("save_project", {
      ...base(record, "ui-external"),
      content: external,
    });
    await page.getByRole("button", { name: "保存修改", exact: true }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByLabel("专业数据", { exact: true })).toHaveValue(
      JSON.stringify(draft, null, 2),
    );
    await page
      .getByRole("button", { name: "读取最新基线", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("已读取最新基线");
    await page.getByRole("button", { name: "保存修改", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("已保存");
    await expect(
      page.getByRole("heading", { name: draft.title, level: 2, exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "返回作品", exact: true }).click();
    await expect
      .poll(() =>
        app
          .context()
          .pages()
          .some((p: any) => p.url().startsWith("hetu-plugin:")),
      )
      .toBe(false);
    page = await open();
    await expect(
      page.getByRole("heading", { name: draft.title, level: 2, exact: true }),
    ).toBeVisible();
    await page.locator("summary").filter({ hasText: "高级" }).click();
    await page
      .getByRole("button", { name: "编辑专业数据", exact: true })
      .click();
    const unsaved = JSON.stringify(
      { ...draft, title: "保留未保存编辑" },
      null,
      2,
    );
    await page.getByLabel("专业数据", { exact: true }).fill(unsaved);
    await expect
      .poll(async () => {
        const b: any = await page.evaluate(() => window.hetu.buffer());
        return b?.editor;
      })
      .toBe(unsaved);
    await page.getByRole("button", { name: "返回作品", exact: true }).click();
    page = await open();
    await expect(page.getByLabel("专业数据", { exact: true })).toHaveValue(
      unsaved,
    );
    await page.getByRole("button", { name: "取消编辑", exact: true }).click();
    await page.getByRole('button',{name:'意见与备选',exact:true}).click();await page.getByRole('button',{name:'使用该句备选',exact:true}).click();await expect(page.getByRole('status')).toContainText('已保存');await expect(page.locator('.variant-grid')).toContainText('原句依据已变化');
    await page.getByRole('button',{name:'专业交付',exact:true}).click();await page.getByRole('button',{name:'导出当前LRC',exact:true}).click();await expect(page.getByRole('alert')).toContainText('LRC不是当前完整有效对齐');
    expect(errors).toEqual([]);
    const dir = process.env.HETU_RECEIPT_DIRECTORY ?? "docs/research";
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, "ui-acceptance.json"),
      JSON.stringify(
        {
          date: new Date().toISOString(),
          plugin_id: manifest.id,
          package_sha256: c.pkg.package_sha256,
          host_version: c.coreVersion,
          platform: process.platform,
          architecture: process.arch,
          tabs: config.tabs,
          empty_state: true,
          professional_actions: true,
          artifact_files: await readdir(exports),
          themes: ["light", "dark"],
          widths: [1360, 760],
          reduced_transparency: true,
          CAS_preserves_input: true,
          explicit_rebase: true,
          close_reopen: true,
          dirty_buffer_restore: true,
          page_errors: errors,
          limits: ["原生窗口材质、系统输入法及Windows/Linux未由本测试证明"],
        },
        null,
        2,
      ) + "\n",
    );
  } finally {
    await app?.close();
    await c.client.close();
  }
});
