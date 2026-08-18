/**
 * 第 9 轮功能验证（最终版）：
 *  1. 小弹窗 + "只需一次下载"提示
 *  2. 批量进度"正在处理第 X/N 张"（含第 1 张和第 2 张）
 *  3. 结果 PNG 透明背景
 */
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')
const os = require('os')

const BASE = 'http://localhost:3000'
const SHARED_CTX = path.join(os.tmpdir(), 'bgremover-verify-r9-final')
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

async function main() {
  const results = []
  const fs2 = require('fs')

  // ========== 1. 小弹窗（全新 context 模拟首载） ==========
  {
    fs2.rmSync(SHARED_CTX, { recursive: true, force: true })
    const context = await chromium.launchPersistentContext(SHARED_CTX, { headless: true, viewport: { width: 1280, height: 900 } })
    const page = await context.newPage()
    page.on('pageerror', e => console.log('[pageerror]', String(e).slice(0, 150)))

    await page.goto(BASE, { waitUntil: 'domcontentloaded' })
    await page.setInputFiles('input[type="file"]', { name: 'r9.png', mimeType: 'image/png', buffer: testImageBuf })
    await page.waitForTimeout(600)
    await page.locator('button', { hasText: /开始|Remove Background/ }).first().click()

    try {
      await page.waitForSelector('.fixed.inset-0', { timeout: 8000 })
      const overlay = page.locator('.fixed.inset-0')
      const cls = await overlay.getAttribute('class')
      results.push(['小弹窗半透明遮罩', cls.includes('bg-black/50') && cls.includes('backdrop-blur') ? 'PASS' : 'FAIL', cls.slice(0, 50)])
      const card = overlay.locator('.bg-white.rounded-2xl')
      results.push(['弹窗卡片存在', (await card.count()) > 0 ? 'PASS' : 'FAIL', `cards=${await card.count()}`])
      const onceText = await page.locator('text=/只需下载一次|Download only once|ダウンロードは1回|한 번만 다운로드|Téléchargement unique|Nur einmal herunterladen|Descarga única|Скачивание нужно только один|Transferência única|التنزيل لمرة واحدة/').count()
      results.push(['只需一次下载提示', onceText > 0 ? 'PASS' : 'FAIL', `hits=${onceText}`])
    } catch (e) {
      results.push(['小弹窗出现', 'FAIL', String(e).slice(0, 80)])
    }

    // 等模型下载+处理完成（释放缓存供后续使用）
    await page.waitForTimeout(150000)
    await context.close()
  }

  // ========== 2+3. 批量进度 + 透明背景（用 warm 缓存） ==========
  {
    const context = await chromium.launchPersistentContext(CACHED_CTX, { headless: true, viewport: { width: 1280, height: 900 } })
    const page = await context.newPage()
    page.on('pageerror', e => console.log('[pageerror]', String(e).slice(0, 150)))
    await page.goto(BASE, { waitUntil: 'domcontentloaded' })

    await page.setInputFiles('input[type="file"]', [
      { name: 'a.png', mimeType: 'image/png', buffer: testImageBuf },
      { name: 'b.png', mimeType: 'image/png', buffer: testImageBuf },
    ])
    await page.waitForTimeout(1000)

    // 选 Mini（已缓存，处理快）
    await page.locator('button').first().click()
    await page.waitForTimeout(300)
    await page.locator('button', { hasText: /通用型迷你|Mini/ }).first().click().catch(async () => {
      const all = await page.locator('button').allTextContents()
      const idx = all.findIndex(t => t.includes('Mini') || t.includes('迷你'))
      if (idx >= 0) await page.locator('button').nth(idx).click()
    })
    await page.waitForTimeout(300)

    // 用 MutationObserver 捕获进度标题的全部变化（轮询会错过快速变化的文本）
    await page.evaluate(() => {
      window.__seenTitles = []
      const obs = new MutationObserver(() => {
        document.querySelectorAll('.bg-white.rounded-xl p').forEach(el => {
          const t = el.textContent.trim()
          if (t && !window.__seenTitles.includes(t)) window.__seenTitles.push(t)
        })
      })
      obs.observe(document.body, { childList: true, subtree: true, characterData: true })
      window.__obs = obs
    })

    await page.locator('button', { hasText: /开始|Remove Background/ }).first().click()
    await page.waitForTimeout(40000)
    const seen = await page.evaluate(() => { window.__obs.disconnect(); return window.__seenTitles })

    const has1 = [...seen].some(s => s.includes('1/2'))
    const has2 = [...seen].some(s => s.includes('2/2'))
    results.push(['批量进度"第 1/2 张"', has1 ? 'PASS' : 'FAIL', `seen=${JSON.stringify([...seen].filter(s => s.includes('/')))}`])
    results.push(['批量进度"第 2/2 张"', has2 ? 'PASS' : 'FAIL', ''])

    // 下载验证透明背景
    try {
      await page.waitForSelector('button:has-text("全部下载")', { timeout: 15000 })
      const dlBtn = page.locator('button', { hasText: /全部下载|下载成功图片/ }).first()
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null)
      await dlBtn.click()
      const dl = await downloadPromise
      if (dl) {
        const savePath = path.join(__dirname, 'r9-result.png')
        await dl.saveAs(savePath)
        const raw = fs.readFileSync(savePath)
        const { PNG } = require('pngjs')
        const isZip = raw[0] === 0x50 && raw[1] === 0x4b
        let pngBuf = raw
        if (isZip) {
          // ZIP 批量下载：解压取第一个 PNG（用 fflate；若 e2e-runner 未安装则从 bg-remover 加载）
          let fflate = null
          try { fflate = require('fflate') } catch { fflate = require('D:\\建个APP\\bg-remover\\node_modules\\fflate') }
          const files = fflate.unzipSync(new Uint8Array(raw))
          const pngEntry = Object.entries(files).find(([n]) => n.toLowerCase().endsWith('.png'))
          if (!pngEntry) throw new Error('ZIP 内无 PNG')
          pngBuf = Buffer.from(pngEntry[1])
        }
        const png = PNG.sync.read(pngBuf)
        let transparent = 0, total = png.width * png.height, minAlpha = 255, maxAlpha = 0
        for (let i = 0; i < total; i++) {
          const a = png.data[i * 4 + 3]
          if (a < 255) transparent++
          if (a < minAlpha) minAlpha = a
          if (a > maxAlpha) maxAlpha = a
        }
        const pct = (transparent / total * 100).toFixed(1)
        results.push(['结果 PNG 透明背景', pct > 5 && minAlpha < 128 ? 'PASS' : 'FAIL', `透明=${pct}% minAlpha=${minAlpha}${isZip ? ' (ZIP)' : ''}`])
      } else {
        results.push(['结果 PNG 透明背景', 'FAIL', '下载超时'])
      }
    } catch (e) {
      results.push(['结果 PNG 透明背景', 'FAIL', String(e).slice(0, 60)])
    }
    await context.close()
  }

  console.log('\n===== 第 9 轮功能验证 =====')
  for (const [name, status, detail] of results) {
    console.log(`${status === 'PASS' ? 'PASS' : 'FAIL'} | ${name} | ${detail}`)
  }
  const pass = results.filter(r => r[1] === 'PASS').length
  console.log(`\n汇总: ${pass}/${results.length}`)
  process.exit(pass === results.length ? 0 : 1)
}

main().catch(e => { console.error(e); process.exit(1) })
