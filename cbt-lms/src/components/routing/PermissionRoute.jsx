import { useAuth } from "../../contexts/AuthContext";

export default function PermissionRoute({ children, permission, permissions, label = "หน้านี้" }) {
  const { permissionSet } = useAuth();

  // Support single permission string or array of permissions (any match)
  const perms = permissions ?? (permission ? [permission] : []);
  const hasAccess = perms.some((p) => permissionSet.has(p));

  if (!hasAccess) {
    return (
      <section className="workspace-content">
        <header className="content-header">
          <h1>{label}</h1>
          <p>คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
        </header>
      </section>
    );
  }

  return children;
}
