#!/usr/bin/env node
/* Tạo tools/quan-tri-tai-khoan.html: công cụ quản trị tài khoản chạy trên trình duyệt,
   đóng gói sẵn nội dung src/quy-che.html và giao diện login-template.html.
   Chạy lại lệnh này mỗi khi sửa src/quy-che.html:  node tools/build-admin-tool.js */
'use strict';
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const LS = String.fromCharCode(0x2028), PS = String.fromCharCode(0x2029);
const safe = s => JSON.stringify(s).replace(/<\//g, '<\\/').split(LS).join('\\u2028').split(PS).join('\\u2029');
const src = fs.readFileSync(path.join(root, 'src/quy-che.html'), 'utf8');
const login = fs.readFileSync(path.join(root, 'login-template.html'), 'utf8');
const logo = (src.match(/\.rs-logo\{background:url\((data:image\/[^)]+)\)/) || [])[1] || '';
const out = fs.readFileSync(path.join(__dirname, 'admin-template.html'), 'utf8')
  .replace('/*__LOGO__*/', () => logo)
  .replace('"__LOGIN_TEMPLATE__"', () => safe(login))
  .replace('"__SOURCE_HTML__"', () => safe(src))
  .replace('__SOURCE_DATE__', () => new Date().toISOString().slice(0, 10));
fs.writeFileSync(path.join(__dirname, 'quan-tri-tai-khoan.html'), out);
console.log('✔ Đã tạo tools/quan-tri-tai-khoan.html');
