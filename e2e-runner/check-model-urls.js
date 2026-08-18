const { chromium } = require('playwright');
const http = require('http');

const urls = [
  // u2net (Mini) - 单文件
  { id: 'u2netp jsDelivr', url: 'https://cdn.jsdelivr.net/npm/@rmbg/model-u2netp@0.0.1/u2netp.onnx' },
  { id: 'u2netp unpkg', url: 'https://unpkg.com/@rmbg/model-u2netp@0.0.1/u2netp.onnx' },
  // modnet (肖像) - 3 分片
  { id: 'modnet-1 jsDelivr', url: 'https://cdn.jsdelivr.net/npm/@rmbg/model-modnet@0.0.1/modnet-1.onnx' },
  { id: 'modnet-2 jsDelivr', url: 'https://cdn.jsdelivr.net/npm/@rmbg/model-modnet@0.0.1/modnet-2.onnx' },
  { id: 'modnet-3 jsDelivr', url: 'https://cdn.jsdelivr.net/npm/@rmbg/model-modnet@0.0.1/modnet-3.onnx' },
  { id: 'modnet-1 unpkg', url: 'https://unpkg.com/@rmbg/model-modnet@0.0.1/modnet-1.onnx' },
  // bria (Pro) - 5 分片
  { id: 'briaai-1 jsDelivr', url: 'https://cdn.jsdelivr.net/npm/@rmbg/model-briaai@0.0.1/briaai-1.onnx' },
  { id: 'briaai-5 jsDelivr', url: 'https://cdn.jsdelivr.net/npm/@rmbg/model-briaai@0.0.1/briaai-5.onnx' },
  { id: 'briaai-1 unpkg', url: 'https://unpkg.com/@rmbg/model-briaai@0.0.1/briaai-1.onnx' },
];

(async () => {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end('<!doctype html><html><body>cors-test</body></html>');
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const origin = `http://127.0.0.1:${server.address().port}`;

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(origin + '/');

  const rows = [];

  for (const { id, url } of urls) {
    const row = { id, url };
    console.error(`-- checking ${id}: ${url}`);

    // A. HEAD 拿最终响应头（不下载 body）
    try {
      const resp = await page.request.head(url, { timeout: 30000 });
      const headers = await resp.headers();
      row.status = resp.status();
      row.finalHost = resp.url().split('/')[2] || null;
      row.contentType = headers['content-type'] || null;
      row.contentLength = headers['content-length'] || null;
      row.allowOrigin = headers['access-control-allow-origin'] || null;
      row.allowCredentials = headers['access-control-allow-credentials'] || null;
      row.acaoExpose = headers['access-control-expose-headers'] ? headers['access-control-expose-headers'].slice(0, 80) : null;
    } catch (e) {
      row.status = 'HEAD-ERROR';
      row.error = e.message.split('\n')[0];
    }

    // B. 首次重定向（maxRedirects:0）看第一跳 Location 与它的 ACAO
    try {
      const r0 = await page.request.get(url, { timeout: 30000, maxRedirects: 0 });
      const h0 = await r0.headers();
      row.firstHop = r0.status() + ' -> ' + (h0['location'] ? h0['location'].split('/')[2] : '(final)');
      row.firstHopACAO = h0['access-control-allow-origin'] || null;
    } catch (e) {
      row.firstHop = 'n/a';
      row.firstHopACAO = null;
    }

    // C. 浏览器真实 fetch（mode:cors，强制 CORS）
    try {
      const corsResult = await page.evaluate(async (u) => {
        const resp = await fetch(u, { method: 'GET', mode: 'cors' });
        return {
          ok: resp.ok,
          status: resp.status,
          allowOrigin: resp.headers.get('access-control-allow-origin'),
          finalHost: resp.url.split('/')[2] || null,
          contentLength: resp.headers.get('content-length'),
        };
      }, url);
      row.corsStatus = corsResult.status;
      row.corsAllowOrigin = corsResult.allowOrigin;
      row.corsFinalHost = corsResult.finalHost;
      row.corsContentLength = corsResult.contentLength;
    } catch (e) {
      row.corsStatus = 'CORS-BLOCKED';
      row.corsAllowOrigin = null;
    }

    // D. no-cors 探针：区分「网络不可达」和「CORS 被拒」
    try {
      const probe = await page.evaluate(async (u) => {
        const resp = await fetch(u, { method: 'GET', mode: 'no-cors' });
        return { ok: resp.ok, type: resp.type, status: resp.status };
      }, url);
      row.noCors = probe.type; // 成功则 opaque；网络失败则抛错
    } catch (e) {
      row.noCors = 'NETWORK-FAIL';
    }

    // E. 文件头校验：仅对 <10MB，用 Range 只读前 16 字节
    const cl = parseInt(row.contentLength, 10);
    if (row.status === 200 && Number.isFinite(cl) && cl < 10 * 1024 * 1024) {
      try {
        const resp = await page.request.get(url, { timeout: 30000, headers: { Range: 'bytes=0-15' } });
        const buf = await resp.body();
        if (buf.length >= 8 && buf[0] === 0x08) {
          row.magic = 'ONNX ✓ (proto field1=ir_version) hex=' + [...buf.subarray(0, 16)].map((b) => b.toString(16).padStart(2, '0')).join(' ');
        } else {
          row.magic = 'NOT-ONNX: ' + [...buf.subarray(0, 8)].map((b) => b.toString(16).padStart(2, '0')).join(' ');
        }
      } catch (e) {
        row.magic = 'read-error: ' + e.message.split('\n')[0];
      }
    } else if (Number.isFinite(cl) && cl >= 10 * 1024 * 1024) {
      row.magic = `skipped (${(cl / 1048576).toFixed(1)}MB > 10MB)`;
    } else {
      row.magic = 'skipped';
    }

    rows.push(row);
  }

  await browser.close();
  server.close();

  console.log('\n=== RESULT ===');
  for (const r of rows) {
    console.log(JSON.stringify(r));
  }
})();
