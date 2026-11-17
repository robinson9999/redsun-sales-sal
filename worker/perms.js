/* =============================================================================
   PHÂN QUYỀN TRUY CẬP
   - Mỗi tài khoản thuộc một NHÓM QUYỀN (users.app_role = id nhóm).
   - Nhóm quyền = ma trận Xem / Thêm / Sửa / Xóa cho từng mục + PHẠM VI DỮ LIỆU:
       all  = toàn công ty, team = bản thân + cấp dưới (trực tiếp & gián tiếp), self = chỉ bản thân.
   - 3 nhóm gốc: admin (toàn quyền, không sửa được), manager, staff (sửa được).
   ============================================================================= */

export const ACTIONS = { view: 'Xem', add: 'Thêm', edit: 'Sửa', delete: 'Xóa' };
export const SCOPES = { all: 'Toàn công ty', team: 'Bản thân & cấp dưới', self: 'Chỉ bản thân' };

// Mục trên tool → các hành động áp dụng (kèm diễn giải hiện trên màn hình phân quyền)
export const MODULES = {
  policy:   { name: 'Quy chế lương thưởng', acts: { view: 'Đọc quy chế' } },
  calc:     { name: 'Bảng tính thu nhập', acts: { view: 'Dùng bảng tính (của mình; theo phạm vi: của cấp dưới)' } },
  kpi:      { name: 'KPI của bạn', acts: { view: 'Xem KPI & ước tính thu nhập của mình' } },
  survey:   { name: 'Phiếu khảo sát', acts: { view: 'Xem phiếu (theo phạm vi)', add: 'Lập phiếu mới', edit: 'Sửa / gửi lại phiếu', delete: 'Xóa phiếu' } },
  proposal: { name: 'Proposal', acts: { view: 'Xem, trình chiếu, xuất PDF', add: 'Gửi proposal cho khách', delete: 'Thu hồi đường dẫn đã gửi' } },
  docs:     { name: 'Tài liệu nội bộ', acts: { view: 'Đọc tài liệu', add: 'Đăng tài liệu', edit: 'Sửa tài liệu, xem thống kê lượt xem', delete: 'Xóa tài liệu' } },
  assign:   { name: 'Giao KPI', acts: { view: 'Xem KPI đã giao (theo phạm vi)', add: 'Giao KPI', edit: 'Giao lại / sửa KPI', delete: 'Xóa KPI đã giao' } },
  staff:    { name: 'Nhân viên', acts: { view: 'Xem danh sách (theo phạm vi)', add: 'Thêm / nhập nhân viên', edit: 'Sửa thông tin, cấp lại mật khẩu', delete: 'Khóa tài khoản' } },
  org:      { name: 'Phòng ban, chức danh & công thức lương', acts: { view: 'Xem', add: 'Thêm', edit: 'Sửa', delete: 'Xóa' } },
  perm:     { name: 'Phân quyền', acts: { view: 'Xem nhóm quyền', add: 'Tạo nhóm quyền', edit: 'Sửa nhóm quyền, đổi nhóm của nhân viên', delete: 'Xóa nhóm quyền' } },
  settings: { name: 'Cài đặt hệ thống', acts: { view: 'Xem cài đặt', edit: 'Sửa cài đặt, gửi email thử' } }
};

const ALL = Object.fromEntries(Object.entries(MODULES).map(([k, m]) => [k, Object.keys(m.acts)]));
export const BUILTIN_GROUPS = {
  admin: { name: 'Admin', scope: 'all', sort: 0, perms: ALL,
    description: 'Toàn quyền trên hệ thống. Nhóm này không sửa được để luôn có người quản trị.' },
  manager: { name: 'Quản lý', scope: 'team', sort: 1,
    description: 'Xem & giao KPI cho cấp dưới, xem danh sách nhân viên dưới quyền.',
    perms: { policy: ['view'], calc: ['view'], kpi: ['view'], survey: ['view', 'add', 'edit', 'delete'], proposal: ['view', 'add', 'delete'],
      docs: ['view'], assign: ['view', 'add', 'edit', 'delete'], staff: ['view'] } },
  staff: { name: 'Nhân viên', scope: 'self', sort: 2,
    description: 'Chỉ xem và thao tác dữ liệu của bản thân.',
    perms: { policy: ['view'], calc: ['view'], kpi: ['view'], survey: ['view', 'add', 'edit', 'delete'], proposal: ['view', 'add', 'delete'], docs: ['view'] } }
};

// Chuẩn hóa ma trận quyền: chỉ giữ mục/hành động hợp lệ; có Thêm/Sửa/Xóa thì tự có Xem
export function cleanPerms(p) {
  const out = {};
  for (const [k, m] of Object.entries(MODULES)) {
    const acts = Array.isArray(p && p[k]) ? p[k].filter((a) => a in m.acts) : [];
    if (acts.length && !acts.includes('view') && 'view' in m.acts) acts.unshift('view');
    if (acts.length) out[k] = [...new Set(acts)].sort((a, b) => Object.keys(ACTIONS).indexOf(a) - Object.keys(ACTIONS).indexOf(b));
  }
  return out;
}
export const permsMeta = () => ({ actions: ACTIONS, scopes: SCOPES, modules: MODULES });
