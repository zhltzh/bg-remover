/**
 * 第 10 轮功能验证：
 *  1. 收藏提示：每下载 5 次居中弹窗（localStorage 计数）
 *  2. 编辑功能（常驻面板）：橡皮擦涂抹→保存→透明度变化；复原；撤销；面板保持常驻
 */
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')
const os = require('os')

const BASE = 'http://localhost:3000'
const CACHED_CTX = path.join(os.tmpdir(), 'bgremover-runall-cache')

function createTestPng(w = 400, h = 200) {
  const { PNG } = require('pngjs')
  const png = new PNG({ width: w, height: h })
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4
    if (x > w * 0.4) { png.data[i]=220; png.data[i+1]=40; png.data[i+2]=40; png.data[i+3]=255 }
    else { png.data[i]=255; png.data[i+1]=255; png.data[i+2]=255; png.data[i+3]=255 }
  }
  return PNG.sync.write(png)
}
const testImageBuf = createTestPng()

// 打开页面并完成一次抠图处理（用默认 Pro，已缓存）
async function setupDonePage(context, imgBuf = testImageBuf, imgName = 'r10.png', mime = 'image/png') {
  const page = await context.newPage()
  page.on('pageerror', e => console.log('[pageerror]', String(e).slice(0, 150)))
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.setInputFiles('input[type="file"]', { name: imgName, mimeType: mime, buffer: imgBuf })
  await page.waitForTimeout(800)
  // 直接点开始抠图（默认 Pro，已缓存）
  await page.locator('button', { hasText: /开始|Remove Background/ }).first().click()
  // 等单张"立即下载"按钮出现（处理完成）
  await page.waitForSelector('button:has-text("立即下载")', { timeout: 90000 })
  await page.waitForTimeout(800)
  return page
}

// 统计 canvas 的完全透明像素占比（alpha===0，用于检测橡皮擦/复原/撤销的变化）
async function zeroAlphaPct(page) {
  return await page.evaluate(() => {
    const c = document.querySelector('canvas.checker-bg')
    const ctx = c.getContext('2d')
    const d = ctx.getImageData(0, 0, c.width, c.height).data
    let zero = 0, total = c.width * c.height
    for (let i = 0; i < total; i++) if (d[i*4+3] === 0) zero++
    return zero / total * 100
  })
}

async function main() {
  const results = []

  // ========== 1. 收藏提示（每 5 次下载） ==========
  {
    const context = await chromium.launchPersistentContext(CACHED_CTX, { headless: true, viewport: { width: 1280, height: 900 } })
    const page = await setupDonePage(context)
    await page.evaluate(() => localStorage.removeItem('bgremover_download_count'))

    const downloadBtn = page.locator('button', { hasText: /立即下载/ }).first()

    // 下载 4 次：不弹窗
    for (let i = 1; i <= 4; i++) {
      await downloadBtn.click()
      await page.waitForTimeout(500)
      const count = await page.evaluate(() => parseInt(localStorage.getItem('bgremover_download_count') || '0', 10))
      const visible = await page.locator('.fixed.inset-0.z-\\[300\\]').count()
      results.push([`第 ${count} 次下载`, count >= 5 ? (visible > 0 ? 'PASS' : 'FAIL') : (visible === 0 ? 'PASS' : 'FAIL'), `count=${count} visible=${visible}`])
    }

    // 第 5 次：应弹窗
    await downloadBtn.click()
    await page.waitForTimeout(600)
    const count5 = await page.evaluate(() => parseInt(localStorage.getItem('bgremover_download_count') || '0', 10))
    const visible5 = await page.locator('.fixed.inset-0.z-\\[300\\]').count()
    results.push([`第 ${count5} 次下载`, count5 >= 5 && visible5 > 0 ? 'PASS' : 'FAIL', `count=${count5} visible=${visible5}`])

    // 弹窗内容
    if (visible5 > 0) {
      const title = await page.locator('.fixed.inset-0.z-\\[300\\] h2').textContent().catch(() => '')
      results.push(['收藏弹窗标题', (title.includes('收藏') || title.includes('Bookmark')) ? 'PASS' : 'FAIL', `title=${title}`])
      const desc = await page.locator('.fixed.inset-0.z-\\[300\\] p').first().textContent().catch(() => '')
      results.push(['收藏弹窗文案', desc.includes('Ctrl+D') || desc.includes('Cmd+D') ? 'PASS' : 'FAIL', `desc=${desc.slice(0,30)}`])
      // 点关闭
      await page.locator('.fixed.inset-0.z-\\[300\\] button').last().click()
      await page.waitForTimeout(400)
      results.push(['收藏弹窗关闭', (await page.locator('.fixed.inset-0.z-\\[300\\]').count()) === 0 ? 'PASS' : 'FAIL', ''])
    } else {
      results.push(['收藏弹窗标题', 'FAIL', '未出现'])
      results.push(['收藏弹窗文案', 'FAIL', '未出现'])
      results.push(['收藏弹窗关闭', 'FAIL', '未出现'])
    }
    await context.close()
  }

  // ========== 2. 编辑功能（工具条 + 浮层） ==========
  // 注意：模型输出为半透明 mask（无纯 255 像素），因此用「完全透明(alpha===0)像素数」
  // 的增减来检测橡皮擦/复原/撤销的效果。用真实照片（subject 明确）更可靠。
  const photoBuf = fs.readFileSync(path.join(__dirname, 'test-photo.jpg'))
  {
    const context = await chromium.launchPersistentContext(CACHED_CTX, { headless: true, viewport: { width: 1280, height: 900 } })
    const page = await setupDonePage(context, photoBuf, 'photo.jpg', 'image/jpeg')

    const mask = page.locator('.fixed.inset-0.z-\\[200\\]')
    const canvas = page.locator('canvas.checker-bg')
    // 浮层内按钮（限定在遮罩内，避免与工具条按钮混淆）
    const modalBtn = (text) => page.locator('.fixed.inset-0.z-\\[200\\] button', { hasText: text })

    // 1) 工具条常驻显示（模型选择器上方，无需点击即可见）
    const toolbarVisible = (await page.locator('[data-edit-toolbar]').count()) > 0
    results.push(['编辑工具条常驻显示', toolbarVisible ? 'PASS' : 'FAIL', ''])

    // 2) 初始状态：浮层未打开、页面上无编辑画布
    const initMask = await mask.count()
    const initCanvas = await canvas.count()
    results.push(['初始无浮层', initMask === 0 && initCanvas === 0 ? 'PASS' : 'FAIL', `mask=${initMask} canvas=${initCanvas}`])

    // 3) 点击工具条「橡皮擦」→ 浮层打开，画布出现
    await page.locator('[data-edit-toolbar] button', { hasText: /橡皮|Eraser/ }).first().click()
    await page.waitForTimeout(700)
    const modalOpen = (await mask.count()) > 0 && (await canvas.count()) > 0
    results.push(['点击橡皮擦弹出编辑浮层', modalOpen ? 'PASS' : 'FAIL', `mask=${await mask.count()} canvas=${await canvas.count()}`])

    if (!modalOpen) {
      results.push(['浮层内橡皮擦涂抹透明增加', 'FAIL', '浮层未打开'])
      results.push(['浮层内复原恢复透明', 'FAIL', '浮层未打开'])
      results.push(['浮层内撤销恢复', 'FAIL', '浮层未打开'])
      results.push(['保存后浮层关闭', 'FAIL', '浮层未打开'])
      results.push(['缩略图铅笔打开浮层', 'FAIL', '浮层未打开'])
    } else {
      // 4) 初始完全透明像素数（baseline）
      const beforeZero = await zeroAlphaPct(page)
      results.push(['编辑前完全透明占比', 'PASS', `zero=${beforeZero.toFixed(2)}%`])

      // 5) 橡皮擦涂抹中心区域
      const box = await canvas.boundingBox()
      const stroke = async (x0f, y0f, x1f, y1f, steps = 8) => {
        await page.mouse.move(box.x + box.width * x0f, box.y + box.height * y0f)
        await page.mouse.down()
        await page.mouse.move(box.x + box.width * x1f, box.y + box.height * y1f, { steps })
        await page.mouse.up()
        await page.waitForTimeout(400)
      }
      await stroke(0.5, 0.5, 0.6, 0.5)
      const afterErase = await zeroAlphaPct(page)
      results.push(['浮层内橡皮擦涂抹透明增加', afterErase > beforeZero + 0.05 ? 'PASS' : 'FAIL', `before=${beforeZero.toFixed(2)}% after=${afterErase.toFixed(2)}%`])

      // 6) 复原笔刷：恢复涂抹区域（应回到接近 baseline）
      await modalBtn(/复原|Restore/).first().click()
      await page.waitForTimeout(300)
      await stroke(0.5, 0.5, 0.6, 0.5)
      const afterRestore = await zeroAlphaPct(page)
      results.push(['浮层内复原恢复透明', Math.abs(afterRestore - beforeZero) < 0.1 ? 'PASS' : 'FAIL', `restore=${afterRestore.toFixed(2)}% before=${beforeZero.toFixed(2)}%`])

      // 7) 再擦一笔 → 撤销
      await modalBtn(/橡皮|Eraser/).first().click()
      await page.waitForTimeout(300)
      await stroke(0.5, 0.5, 0.55, 0.6, 6)
      const afterErase2 = await zeroAlphaPct(page)
      await modalBtn(/撤销|Undo/).first().click()
      await page.waitForTimeout(400)
      const afterUndo = await zeroAlphaPct(page)
      results.push(['浮层内撤销恢复', Math.abs(afterUndo - afterRestore) < 0.1 ? 'PASS' : 'FAIL', `undo=${afterUndo.toFixed(2)}% afterRestore=${afterRestore.toFixed(2)}% erased2=${afterErase2.toFixed(2)}%`])

      // 8) 保存：应用修改并关闭浮层（遮罩消失、画布移除）
      await modalBtn(/保存|Save/).first().click()
      await page.waitForTimeout(1200)
      const maskAfterSave = await mask.count()
      const canvasAfterSave = await canvas.count()
      results.push(['保存后浮层关闭', maskAfterSave === 0 && canvasAfterSave === 0 ? 'PASS' : 'FAIL', `mask=${maskAfterSave} canvas=${canvasAfterSave}`])

      // 9) 缩略图铅笔 → 再次打开浮层（直接选中该图）
      await page.hover('.relative.group')
      await page.waitForTimeout(400)
      const editIcon = page.locator('button[title="编辑图片"], button[title="Edit image"]').first()
      if (await editIcon.count() > 0) {
        await editIcon.click()
        await page.waitForTimeout(700)
        const reopened = (await mask.count()) > 0 && (await canvas.count()) > 0
        results.push(['缩略图铅笔打开浮层', reopened ? 'PASS' : 'FAIL', `mask=${await mask.count()} canvas=${await canvas.count()}`])
      } else {
        results.push(['缩略图铅笔打开浮层', 'FAIL', '无铅笔按钮'])
      }
    }

    await context.close()
  }

  console.log('\n===== 第 10 轮功能验证 =====')
  for (const [name, status, detail] of results) {
    console.log(`${status === 'PASS' ? 'PASS' : 'FAIL'} | ${name} | ${detail}`)
  }
  const pass = results.filter(r => r[1] === 'PASS').length
  console.log(`\n汇总: ${pass}/${results.length}`)
  process.exit(pass === results.length ? 0 : 1)
}

main().catch(e => { console.error(e); process.exit(1) })
