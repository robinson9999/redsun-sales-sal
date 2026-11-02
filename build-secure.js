#!/usr/bin/env node
/* =============================================================================
   REDSUN – Công cụ đóng gói trang Quy chế lương thưởng có đăng nhập
   -----------------------------------------------------------------------------
   Cách dùng (cần Node.js 18 trở lên, không cần cài thêm thư viện):

     node build-secure.js --src quy-che.html --accounts tai-khoan.csv --out ban-phat-hanh

   Đầu vào:
     --src       Trang quy chế gốc (bản chưa bảo mật).
     --accounts  Danh sách tài khoản, CSV UTF-8 gồm các cột:
                 tai_khoan,ho_ten,chuc_danh,mat_khau
                 Để trống cột mat_khau thì công cụ tự tạo mật khẩu mặc định ngẫu nhiên.
     --out       Thư mục kết quả (mặc định: ban-phat-hanh).

   Đầu ra:
     index.html                 Trang đăng nhập + nội dung đã mã hóa. Đưa file này lên máy chủ/ổ chia sẻ.
     danh-sach-mat-khau.csv     Tài khoản + mật khẩu mặc định để HR gửi riêng cho từng người.
                                KHÔNG đưa file này lên máy chủ.

   Cơ chế: nội dung trang được mã hóa AES-256-GCM bằng một khóa chính ngẫu nhiên.
   Khóa chính được "gói" riêng cho từng tài khoản bằng khóa sinh từ mật khẩu
   (PBKDF2-SHA256, 310.000 vòng). Không có mật khẩu đúng thì không đọc được nội dung,
   kể cả khi xem mã nguồn. Mỗi lần chạy lại, khóa chính được tạo mới, nên file cũ và
   file mới độc lập với nhau.
   ============================================================================= */
'use strict';
const fs = require('fs');
const path = require('path');
const { webcrypto } = require('crypto');
const subtle = webcrypto.subtle;

const ITERATIONS = 310000;
const PW_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

/* ---------- Tham số dòng lệnh ---------- */
function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const SRC = arg('src');
const ACC = arg('accounts');
const OUT = arg('out', 'ban-phat-hanh');
if (!SRC || !ACC) {
  console.error('Thiếu tham số. Ví dụ: node build-secure.js --src quy-che.html --accounts tai-khoan.csv --out ban-phat-hanh');
  process.exit(1);
}

/* ---------- Tiện ích ---------- */
const b64 = (buf) => Buffer.from(buf).toString('base64');
const enc = new TextEncoder();
const normUser = (u) => String(u || '').trim().toLowerCase();

function randomPassword() {
  // 8 ký tự dạng xxxx-xxxx, có chữ hoa, chữ thường và số; bỏ ký tự dễ nhầm (0/O, 1/l/I)
  for (;;) {
    const bytes = webcrypto.getRandomValues(new Uint8Array(8));
    const s = Array.from(bytes, (b) => PW_ALPHABET[b % PW_ALPHABET.length]).join('');
    if (/[A-Z]/.test(s) && /[a-z]/.test(s) && /[2-9]/.test(s)) return s.slice(0, 4) + '-' + s.slice(4);
  }
}

function parseCSV(text) {
  text = text.replace(/^﻿/, '');
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((v) => v.trim() !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((v) => v.trim() !== '')) rows.push(row);
  const head = rows.shift().map((h) => h.trim().toLowerCase());
  return rows.map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()])));
}
const csvCell = (v) => /[",\n]/.test(v) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v);

async function userId(username) {
  const h = await subtle.digest('SHA-256', enc.encode('redsun|' + normUser(username)));
  return Buffer.from(h).toString('hex').slice(0, 32);
}
async function kekFromPassword(password, salt) {
  const base = await subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
}

/* ---------- Chương trình chính ---------- */
(async () => {
  const page = fs.readFileSync(SRC, 'utf8');
  const accounts = parseCSV(fs.readFileSync(ACC, 'utf8'));
  if (!accounts.length) throw new Error('File tài khoản không có dòng nào.');

  // 1. Mã hóa nội dung trang bằng khóa chính
  const masterRaw = webcrypto.getRandomValues(new Uint8Array(32));
  const masterKey = await subtle.importKey('raw', masterRaw, 'AES-GCM', false, ['encrypt']);
  const pageIv = webcrypto.getRandomValues(new Uint8Array(12));
  const pageCt = await subtle.encrypt({ name: 'AES-GCM', iv: pageIv }, masterKey, enc.encode(page));

  // 2. Gói khóa chính cho từng tài khoản
  const seen = new Set();
  const users = {};
  const issued = [];
  for (const a of accounts) {
    const u = normUser(a.tai_khoan);
    if (!u) continue;
    if (seen.has(u)) throw new Error('Trùng tài khoản: ' + u);
    seen.add(u);
    let pw = a.mat_khau;
    const generated = !pw;
    if (generated) pw = randomPassword();
    if (pw.length < 8) console.warn(`⚠ Mật khẩu của "${u}" ngắn hơn 8 ký tự, nên đặt dài hơn.`);
    const salt = webcrypto.getRandomValues(new Uint8Array(16));
    const iv = webcrypto.getRandomValues(new Uint8Array(12));
    const kek = await kekFromPassword(pw, salt);
    const payload = enc.encode(JSON.stringify({ k: b64(masterRaw), n: a.ho_ten || u }));
    const wrapped = await subtle.encrypt({ name: 'AES-GCM', iv }, kek, payload);
    users[await userId(u)] = [b64(salt), b64(iv), b64(wrapped)];
    issued.push({ u, name: a.ho_ten || '', role: a.chuc_danh || '', pw, generated });
  }

  // 3. Ghép trang đăng nhập
  const tpl = fs.readFileSync(path.join(__dirname, 'login-template.html'), 'utf8');
  const logoMatch = page.match(/\.rs-logo\{background:url\((data:image\/[^)]+)\)/);
  const data = { v: 1, it: ITERATIONS, iv: b64(pageIv), ct: b64(pageCt), u: users };
  const out = tpl
    .replace('/*__LOGO__*/', logoMatch ? logoMatch[1] : '')
    .replace('"__DATA__"', JSON.stringify(data))
    .replace('__BUILD__', new Date().toISOString().slice(0, 10));
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'index.html'), out);

  // 4. Danh sách mật khẩu cho HR (UTF-8 có BOM để Excel đọc đúng tiếng Việt)
  const lines = ['tai_khoan,ho_ten,chuc_danh,mat_khau,ghi_chu'];
  for (const r of issued) lines.push([r.u, r.name, r.role, r.pw, r.generated ? 'Mật khẩu mặc định tự tạo' : 'Mật khẩu do HR đặt'].map(csvCell).join(','));
  fs.writeFileSync(path.join(OUT, 'danh-sach-mat-khau.csv'), '﻿' + lines.join('\r\n'));

  console.log(`✔ Đã tạo ${issued.length} tài khoản.`);
  console.log(`  • ${path.join(OUT, 'index.html')}  → đưa lên máy chủ`);
  console.log(`  • ${path.join(OUT, 'danh-sach-mat-khau.csv')}  → HR giữ, gửi riêng từng người, KHÔNG đưa lên máy chủ`);
})().catch((e) => { console.error('✖ Lỗi:', e.message); process.exit(1); });
