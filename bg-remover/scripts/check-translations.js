// 翻译完整性校验：所有语言必须与 zh.json 结构完全一致
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const LOCALES_DIR = path.join(__dirname, '..', 'i18n', 'locales');
const zhPath = path.join(LOCALES_DIR, 'zh.json');
const zh = JSON.parse(fs.readFileSync(zhPath, 'utf8'));

// 递归展开为 flat key -> 类型标记
function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (Array.isArray(v)) {
      out[key] = `ARRAY(${v.length})`;
    } else if (typeof v === 'object' && v !== null) {
      flatten(v, key, out);
    } else {
      out[key] = 'STRING';
    }
  }
  return out;
}

const zhFlat = flatten(zh);
const zhKeys = Object.keys(zhFlat);

let failed = false;

// 检查所有语言文件
const files = fs.readdirSync(LOCALES_DIR).filter(f => f.endsWith('.json'));
for (const file of files) {
  const code = file.replace('.json', '');
  const lang = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, file), 'utf8'));
  const flat = flatten(lang);
  const keys = Object.keys(flat);

  const missing = zhKeys.filter(k => !keys.includes(k));
  const extra = keys.filter(k => !zhKeys.includes(k));
  const typeMismatch = zhKeys.filter(k => keys.includes(k) && flat[k] !== zhFlat[k]);

  const issues = [];
  if (missing.length) issues.push(`缺少 key: ${missing.join(', ')}`);
  if (extra.length) issues.push(`多余 key: ${extra.join(', ')}`);
  if (typeMismatch.length) issues.push(`结构不一致: ${typeMismatch.join(', ')}`);

  // 检查占位符括号是否匹配（{count} 等）
  const placeholderIssues = [];
  for (const k of keys) {
    if (flat[k] === 'STRING') {
      const val = getValue(lang, k);
      const opens = (val.match(/\{/g) || []).length;
      const closes = (val.match(/\}/g) || []).length;
      if (opens !== closes) placeholderIssues.push(`${k} 占位符括号不匹配: ${val}`);
      // 检查占位符在 zh 中存在但翻译中缺失
      const zhVal = getValue(zh, k);
      const zhPh = (zhVal.match(/\{(\w+)\}/g) || []).map(x => x.replace(/[{}]/g, ''));
      const enPh = (val.match(/\{(\w+)\}/g) || []).map(x => x.replace(/[{}]/g, ''));
      const lostPh = zhPh.filter(p => !enPh.includes(p));
      if (lostPh.length) placeholderIssues.push(`${k} 丢失占位符 {${lostPh.join(', ')}}: ${val}`);
    }
  }

  const status = issues.length === 0 && placeholderIssues.length === 0 ? 'OK' : 'FAIL';
  if (status === 'FAIL') failed = true;
  console.log(`${status} | ${code} | ${keys.length}/${zhKeys.length} keys`);
  issues.forEach(i => console.log(`   ✗ ${i}`));
  placeholderIssues.forEach(i => console.log(`   ✗ ${i}`));
}

function getValue(obj, dotted) {
  return dotted.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}

process.exit(failed ? 1 : 0);
