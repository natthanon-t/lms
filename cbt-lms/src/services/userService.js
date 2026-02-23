export const withUpdatedUserName = (users, username, name) => ({
  ...users,
  [username]: {
    ...users[username],
    name,
  },
});

export const validateAndChangePassword = (users, username, currentPassword, nextPassword) => {
  const current = users?.[username];
  if (!current) {
    return { success: false, message: "ไม่พบผู้ใช้", nextUsers: users };
  }
  if (current.password !== currentPassword) {
    return { success: false, message: "รหัสผ่านปัจจุบันไม่ถูกต้อง", nextUsers: users };
  }

  const nextUsers = {
    ...users,
    [username]: {
      ...users[username],
      password: nextPassword,
    },
  };
  return { success: true, message: "เปลี่ยนรหัสผ่านเรียบร้อย", nextUsers };
};

export const withResetUserPassword = (users, username, defaultPassword) => {
  if (!users?.[username]) {
    return users;
  }
  return {
    ...users,
    [username]: {
      ...users[username],
      password: defaultPassword,
    },
  };
};

export const withUpdatedUserRole = (users, username, role) => ({
  ...users,
  [username]: {
    ...users[username],
    role,
  },
});

export const withUpdatedUserStatus = (users, username, status) => ({
  ...users,
  [username]: {
    ...users[username],
    status,
  },
});

export const validateAndCreateUser = ({
  users,
  name,
  username,
  role,
  status,
  password,
  fallbackPassword,
}) => {
  const normalizedName = String(name ?? "").trim();
  const normalizedUsername = String(username ?? "").trim().toLowerCase();
  const normalizedRole = String(role ?? "").trim() || "ผู้ใช้งาน";
  const normalizedStatus = String(status ?? "").trim() || "active";
  const normalizedPassword = String(password ?? "").trim() || String(fallbackPassword ?? "").trim();

  if (!normalizedName || !normalizedUsername || !normalizedPassword) {
    return { success: false, message: "กรอกชื่อ, username และรหัสผ่านให้ครบ", nextUsers: users };
  }
  if (users?.[normalizedUsername]) {
    return { success: false, message: "username นี้มีในระบบแล้ว", nextUsers: users };
  }

  const nextUsers = {
    ...users,
    [normalizedUsername]: {
      name: normalizedName,
      password: normalizedPassword,
      role: normalizedRole,
      status: normalizedStatus,
    },
  };

  return { success: true, message: `เพิ่มผู้ใช้ ${normalizedUsername} เรียบร้อย`, nextUsers };
};
