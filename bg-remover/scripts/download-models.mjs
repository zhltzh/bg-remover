#!/usr/bin/env node
// ============================================
// 模型 + WASM 自托管下载脚本（Node 版，跨平台）
// 下载与 types.ts 中 sizeBytes 精确匹配的 @rmbg 分片文件到 public/models/
// 并把 onnxruntime-web 的 WASM 文件复制到 public/wasm/
// 用途：构建前自动执行（prebuild/pregenerate），避免浏览器运行时从慢速 CDN 拉取
// 用法：node scripts/download-models.mjs
// ============================================
import { createWriteStream } from 'node:fs'
import { access, mkdir, readdir, stat, copyFile, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const MODELS_DIR = join(ROOT, 'public', 'models')
const WASM_DIR = join(ROOT, 'public', 'wasm')

// 下载源优先级：unpkg（实测最快）> cdn.jsdelivr.net > fastly > gcore
const SOURCES = [
  'https://unpkg.com',
  'https://cdn.jsdelivr.net/npm',
  'https://fastly.jsdelivr.net/npm',
  'https://gcore.jsdelivr.net/npm',
]

// 单个文件下载，带多源回退
async function fetchFile(rel, out) {
  for (const base of SOURCES) {
    const url = `${base}/${rel}`
    try {
      const res = await fetch(url, { redirect: 'follow' })
      if (!res.ok) continue
      const buf = Buffer.from(await res.arrayBuffer())
      await mkdir(dirname(out), { recursive: true })
      await writeFileAtomic(out, buf)
      console.log(`  \u2713 ${rel}  <- ${url}`)
      return true
    } catch {
      // 尝试下一个源
    }
  }
  console.error(`  \u2717 全部源失败: ${rel}`)
  return false
}

import { writeFile as writeFileCb } from 'node:fs'
import { promisify } from 'node:util'
const writeFile = promisify(writeFileCb)
async function writeFileAtomic(out, buf) {
  await writeFile(out, buf)
}

// ===== 模型分片定义（与 types.ts 的 sizeBytes 精确一致） =====
const GROUPS = {
  '@rmbg/model-briaai': {
    dir: 'bria',
    shards: {
      'briaai-1.onnx': 9437184,
      'briaai-2.onnx': 9437184,
      'briaai-3.onnx': 9437184,
      'briaai-4.onnx': 9437184,
      'briaai-5.onnx': 6654490,
    },
  },
  '@rmbg/model-modnet': {
    dir: 'modnet',
    shards: {
      'modnet-1.onnx': 9437184,
      'modnet-2.onnx': 9437184,
      'modnet-3.onnx': 7014272,
    },
  },
  '@rmbg/model-u2netp': {
    dir: 'u2netp',
    shards: {
      'u2netp.onnx': 4574861,
    },
  },
}

async function fileSize(path) {
  try {
    return (await stat(path)).size
  } catch {
    return -1
  }
}

// 下载一组分片
async function downloadGroup(pkg, group) {
  const target = join(MODELS_DIR, group.dir)
  await mkdir(target, { recursive: true })
  console.log(`\u{1F4E6} 下载 ${pkg} -> ${target}`)
  for (const [file, expect] of Object.entries(group.shards)) {
    const out = join(target, file)
    if ((await fileSize(out)) === expect) {
      console.log(`  \u23ED 已存在: ${file}`)
      continue
    }
    const ok = await fetchFile(`${pkg}@0.0.1/${file}`, out)
    if (!ok) process.exit(1)
    const actual = await fileSize(out)
    if (actual !== expect) {
      console.error(`  \u2717 大小不匹配 ${file}: 期望 ${expect} 实际 ${actual}`)
      await import('node:fs/promises').then(m => m.rm(out, { force: true }))
      process.exit(1)
    }
  }
  console.log(`  \u2714 ${pkg} 完成`)
}

// ===== WASM 自托管 =====
// 注意：onnxruntime-web 的 npm 包中部分 .wasm 文件可能因安装/网络损坏（曾实测 jsep.wasm
// 从 node_modules 复制后无法通过 WebAssembly.Module 编译），因此这里一律从 CDN 下载并
// 做编译级校验，保证 public/wasm 中的文件完整可用。
const WASM_NEEDED = [
  'ort-wasm-simd-threaded.mjs',
  'ort-wasm-simd-threaded.wasm',
  'ort-wasm-simd-threaded.jsep.mjs',
  'ort-wasm-simd-threaded.jsep.wasm',
  'ort-wasm-simd-threaded.jspi.mjs',
  'ort-wasm-simd-threaded.jspi.wasm',
  'ort-wasm-simd-threaded.asyncify.mjs',
  'ort-wasm-simd-threaded.asyncify.wasm',
]

async function isCompilableWasm(buf) {
  if (!isWasmMagic(buf)) return false
  try {
    new WebAssembly.Module(buf)
    return true
  } catch {
    return false
  }
}

function isWasmMagic(buf) {
  if (buf.byteLength < 8) return false
  return buf[0] === 0x00 && buf[1] === 0x61 && buf[2] === 0x73 && buf[3] === 0x6d
}

// JSPI 是实验性提案，Node 默认无法实例化编译，但浏览器按需启用。
// 这类文件只校验文件头与体积，避免把合法下载当成损坏文件。
function isJspiVariant(name) {
  return name.includes('.jspi.')
}

async function isValidWasmFile(name, path) {
  const size = await fileSize(path)
  if (size <= 0) return false
  const buf = await readFile(path)
  if (!isWasmMagic(buf)) return false
  if (await isCompilableWasm(buf)) return true
  return isJspiVariant(name) && buf.byteLength > 1024 * 1024
}

async function copyWasm() {
  console.log('')
  console.log(`\u2699\uFE0F 复制 onnxruntime-web WASM -> ${WASM_DIR}`)
  await mkdir(WASM_DIR, { recursive: true })
  for (const f of WASM_NEEDED) {
    const out = join(WASM_DIR, f)
    const isWasm = f.endsWith('.wasm')
    if (!isWasm) {
      // mjs 加载器：node_modules 中已验证存在，直接复制
      const src = join(ROOT, 'node_modules', 'onnxruntime-web', 'dist', f)
      try {
        await access(src)
        await copyFile(src, out)
        console.log(`  \u2713 ${f} (本地复制)`)
        continue
      } catch {
        // 本地缺失则从 CDN 补
      }
    } else if (await isValidWasmFile(f, out)) {
      console.log(`  \u2713 ${f} (已存在且校验通过, ${await fileSize(out)} bytes)`)
      continue
    }
    const ok = await fetchFile(`onnxruntime-web@1.27.0/dist/${f}`, out)
    if (!ok) process.exit(1)
    if (isWasm) {
      if (!(await isValidWasmFile(f, out))) {
        console.error(`  \u2717 ${f} 下载后校验失败`)
        await import('node:fs/promises').then(m => m.rm(out, { force: true }))
        process.exit(1)
      }
      const size = await fileSize(out)
      if (isJspiVariant(f) && !(await isCompilableWasm(await readFile(out)))) {
        console.log(`  \u2714 ${f} 文件头校验通过（JSPI 需浏览器开启后才能编译, ${size} bytes）`)
      } else {
        console.log(`  \u2714 ${f} 编译校验通过 (${size} bytes)`)
      }
    }
  }
}

// ===== 汇总校验（与 types.ts 的 sizeBytes 一致） =====
async function verify() {
  console.log('')
  console.log('\u{1F50D} 汇总校验:')
  const expected = {
    bria: 44403226,
    modnet: 25888640,
    u2netp: 4574861,
  }
  for (const [dir, total] of Object.entries(expected)) {
    const files = await readdir(join(MODELS_DIR, dir))
    let sum = 0
    for (const f of files) {
      if (f.endsWith('.onnx')) sum += await fileSize(join(MODELS_DIR, dir, f))
    }
    const ok = sum === total
    console.log(`  ${dir} = ${sum}  (期望 ${total}) ${ok ? '\u2714' : '\u2717'}`)
    if (!ok) process.exit(1)
  }
  console.log('  \u2714 全部模型大小校验通过')
}

async function main() {
  console.log(`\u{1F4E5} 模型自托管目录: ${MODELS_DIR}`)
  console.log('')
  for (const [pkg, group] of Object.entries(GROUPS)) {
    await downloadGroup(pkg, group)
  }
  await verify()
  await copyWasm()
  console.log('')
  console.log('\u2705 全部完成！')
  console.log(`  模型: ${MODELS_DIR}`)
  console.log(`  WASM: ${WASM_DIR}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
