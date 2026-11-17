/* =============================================================================
   QUY CHẾ (tài liệu soạn được trong tool)
   - Mỗi quy chế có nhiều phiên bản: 1 bản nháp (đang soạn) + các bản đã ban hành (bản mới nhất là bản hiện hành).
   - Nội dung = tiêu đề, lời mở đầu, danh sách mục {id, title, html}, tham số (ngày chốt, đầu mối…).
   - Trong html có thể đặt khối số liệu tự động <div data-block="..."></div> và tham số <span data-cfg="..."></span>;
     giao diện tự điền từ công thức lương & tham số, nên số liệu trong tài liệu luôn khớp Bảng tính.
   ============================================================================= */

// Tham số dùng trong văn bản (HR sửa ở trình soạn thảo)
export const POLICY_VARS = {
  hieuLuc: { label: 'Hiệu lực', def: 'theo Quyết định ban hành của Ban Giám đốc' },
  dauMoi: { label: 'Đầu mối giải đáp', def: 'Phòng Hành chính - Nhân sự' },
  ngayGiaoTarget: { label: 'Giao target chậm nhất ngày (hằng tháng)', def: '05' },
  ngayXacNhan: { label: 'Số ngày làm việc để xác nhận target', def: '02' },
  ngayChotDS: { label: 'Thời điểm chốt doanh số', def: '23:59 ngày cuối cùng của tháng' },
  ngayDoiSoat: { label: 'Gửi bảng đối soát trước ngày (tháng sau)', def: '05' },
  ngayPhanHoi: { label: 'Số ngày làm việc để phản hồi đối soát', def: '03' },
  ngayChiTra: { label: 'Ngày chi trả (tháng sau)', def: '10' },
  ngayThuHoi: { label: 'Số ngày áp dụng thu hồi hoa hồng', def: '90' },
  ngayNghiGiamTarget: { label: 'Nghỉ từ bao nhiêu ngày làm việc thì giảm target', def: '05' },
  tranChongTangPct: { label: 'Trần tổng hoa hồng / doanh thu đơn vị', def: '12%' },
  kpiYeuPct: { label: 'Ngưỡng KPI yếu (đưa vào PIP)', def: '50%' },
  thangYeu: { label: 'Số tháng liên tiếp dưới ngưỡng', def: '2' },
  spanMin: { label: 'Số nhân sự tối thiểu / Trưởng nhóm', def: '7' }
};

/* ---------------------------- Lọc HTML ----------------------------
   Chỉ giữ thẻ & thuộc tính an toàn cho văn bản; bỏ script, sự kiện on*, đường dẫn javascript:. */
const TAGS = new Set(['p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'ul', 'ol', 'li', 'h3', 'h4', 'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'div', 'span', 'blockquote', 'details', 'summary', 'hr', 'code', 'sup', 'sub', 'mark']);
const DROP_WITH_CONTENT = /<(script|style|iframe|object|embed|svg|math|template|noscript|textarea|select|button|form)[\s\S]*?<\/\1\s*>/gi;
const STRAY_LT = new RegExp(`<(?!/?(?:${[...TAGS].join('|')})[\\s>])`, 'g');
const CLASSES = new Set(['note', 'tip', 'warn', 'formula', 'boxes', 'box', 'blue', 'green', 'amber', 'steps', 'step', 'lead', 'muted', 'tbl', 'center', 'right']);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export function sanitizeHtml(html) {
  let s = String(html || '').slice(0, 200000).replace(/<!--[\s\S]*?-->/g, '').replace(DROP_WITH_CONTENT, '');
  s = s.replace(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (m, close, tag, attrs) => {
    tag = tag.toLowerCase();
    if (!TAGS.has(tag)) return '';
    if (close) return `</${tag}>`;
    const out = [];
    attrs.replace(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g, (_, name, __, v1, v2, v3) => {
      name = name.toLowerCase();
      const v = (v1 ?? v2 ?? v3 ?? '').trim();
      if (name === 'href' && tag === 'a') { if (/^(https?:|mailto:|tel:|#|\/)/i.test(v)) out.push(`href="${esc(v)}"`); }
      else if (name === 'class') { const c = v.split(/\s+/).filter((x) => CLASSES.has(x)); if (c.length) out.push(`class="${c.join(' ')}"`); }
      else if (name === 'data-block' && /^[a-z0-9_]{1,40}$/.test(v)) out.push(`data-block="${v}"`);
      else if (name === 'data-cfg' && /^[a-zA-Z0-9_]{1,40}$/.test(v)) out.push(`data-cfg="${v}"`);
      else if ((name === 'colspan' || name === 'rowspan') && /^\d{1,2}$/.test(v)) out.push(`${name}="${v}"`);
      else if (name === 'open' && tag === 'details') out.push('open');
      return '';
    });
    if (tag === 'a') out.push('target="_blank" rel="noopener"');
    return `<${tag}${out.length ? ' ' + out.join(' ') : ''}>`;
  });
  // Ký tự "<" còn sót (không phải thẻ hợp lệ vừa tạo) → chuyển thành văn bản
  return s.replace(STRAY_LT, '&lt;');
}
const clip = (v, n) => String(v ?? '').trim().slice(0, n);
export function cleanContent(c) {
  c = c || {};
  const sections = (Array.isArray(c.sections) ? c.sections : []).slice(0, 40).map((x, i) => ({
    id: /^[a-z0-9-]{1,30}$/.test(x.id || '') ? x.id : 's' + (i + 1), title: clip(x.title, 150) || `Mục ${i + 1}`, html: sanitizeHtml(x.html)
  }));
  if (!sections.length) throw new Error('Quy chế cần ít nhất 1 mục.');
  const vars = {};
  for (const k of Object.keys(POLICY_VARS)) vars[k] = clip(c.vars && c.vars[k] != null ? c.vars[k] : POLICY_VARS[k].def, 200);
  return { title: clip(c.title, 200) || 'Quy chế', intro: sanitizeHtml(c.intro), sections, vars };
}
