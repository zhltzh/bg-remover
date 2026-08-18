// 9 语言专项验证：SEO 头 / html lang+dir / 切换器 / 404 / llms / RTL 布局
const { chromium } = require('playwright');

const BASE = 'http://localhost:3000';
const LOCALES = [
  { code: 'en', lang: 'en-US', dir: null, titleKw: 'Background Remover' },
  { code: 'ja', lang: 'ja-JP', dir: null, titleKw: '背景' },
  { code: 'ko', lang: 'ko-KR', dir: null, titleKw: '배경' },
  { code: 'fr', lang: 'fr-FR', dir: null, titleKw: 'arrière-plan' },
  { code: 'de', lang: 'de-DE', dir: null, titleKw: 'Hintergrund' },
  { code: 'es', lang: 'es-ES', dir: null, titleKw: 'fondo' },
  { code: 'ru', lang: 'ru-RU', dir: null, titleKw: 'фон' },
  { code: 'pt', lang: 'pt-PT', dir: null, titleKw: 'fundo' },
  { code: 'ar', lang: 'ar-SA', dir: 'rtl', titleKw: 'خلفية' },
];

const results = [];
function report(name, pass, detail) { results.push({ name, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'} | ${name} | ${detail}`); }

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  for (const l of LOCALES) {
    const path = l.code === 'en' ? '/en' : `/${l.code}`;
    await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);

    // 1. html lang / dir
    const html = await page.evaluate(() => {
      const el = document.documentElement;
      return { lang: el.lang, dir: el.getAttribute('dir') };
    });
    report(`${l.code} html lang`, html.lang === l.lang, `lang=${html.lang}`);
    report(`${l.code} html dir`, (l.dir ? html.dir === 'rtl' : (html.dir === null || html.dir === 'ltr')), `dir=${html.dir || '(none)'}`);

    // 2. title 含本语言关键词
    const title = await page.title();
    report(`${l.code} title 本地化`, title.toLowerCase().includes(l.titleKw.toLowerCase()), `title="${title.slice(0, 60)}..."`);

    // 3. hreflang 存在（alternate 链接）
    const hreflangs = await page.evaluate(() =>
      Array.from(document.querySelectorAll('link[rel="alternate"][hreflang]')).map(l => l.getAttribute('hreflang'))
    );
    report(`${l.code} hreflang 齐全`, hreflangs.length >= 9, `hreflang=${hreflangs.length}个`);

    // 4. H1 渲染（非空、非 key 名）
    const h1 = await page.locator('h1').first().innerText().catch(() => '');
    report(`${l.code} H1 渲染`, h1.length > 5 && !h1.includes('seo.title'), `H1="${h1.slice(0, 50)}..."`);

    // 5. ar 布局检查：body 应无横向溢出
    if (l.code === 'ar') {
      const overflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth + 2);
      report('ar 无横向溢出', !overflow, `scrollWidth=${overflow ? '溢出' : '正常'}`);
    }

    // 6. 语言切换器：当前语言高亮 + 选项数量
    // 定位：语言按钮是 header 内第一个含 Globe 图标的 button（圆角 border 容器内的第一个 button）
    const langBtn = page.locator('header div.relative button').first();
    await langBtn.click().catch(() => {});
    await page.waitForTimeout(400);
    const langItems = await page.locator('header a', { hasText: /中文|English|日本語|한국어|Français|Deutsch|Español|Русский|Português|العربية/ }).count();
    report(`${l.code} 切换器选项数`, langItems >= 9, `选项=${langItems}`);
    // 关闭下拉（点 body 空白处）
    await page.mouse.click(5, 5);
    await page.waitForTimeout(200);
  }

  // 7. 各语言 404 页
  for (const l of LOCALES) {
    const path = l.code === 'en' ? '/en' : `/${l.code}`;
    await page.goto(BASE + path + '/404', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    const h1 = await page.locator('h1').first().innerText().catch(() => '');
    report(`${l.code} 404 页渲染`, h1.length > 0 && !h1.includes('error.pageTitle'), `H1="${h1.slice(0, 40)}"`);
  }

  // 8. llms 文件可访问
  for (const l of LOCALES) {
    const resp = await page.request.get(`${BASE}/llms-${l.code}.txt`).catch(() => null);
    report(`${l.code} llms 文件`, resp && resp.status() === 200, `status=${resp ? resp.status() : 'FAIL'}`);
  }

  console.log('\n========== 汇总 ==========');
  const passCount = results.filter(r => r.pass).length;
  results.filter(r => !r.pass).forEach(f => console.log(`  ✗ ${f.name} | ${f.detail}`));
  console.log(`通过: ${passCount}/${results.length}`);
  await browser.close();
  process.exit(results.filter(r => !r.pass).length ? 1 : 0);
})().catch(e => { console.error('脚本异常:', e); process.exit(1); });
