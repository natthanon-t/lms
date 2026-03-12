export const STATUS_OPTIONS = ["inprogress", "active", "inactive"];

const toOwnerUsername = (item) => String(item?.ownerUsername ?? "").trim();

export const isItemOwner = (item, currentUserKey) =>
  Boolean(currentUserKey) && toOwnerUsername(item) === currentUserKey;

export const canManageOwnedItem = ({ item, currentUser, currentUserKey, hasManageAccess }) => {
  if (!currentUser) {
    return false;
  }
  return hasManageAccess || isItemOwner(item, currentUserKey);
};

export const canViewItemByStatus = ({ item, currentUserKey, hasManageAccess, hasViewAllAccess }) => {
  const normalizedStatus = String(item?.status ?? "active").toLowerCase();
  if (!hasManageAccess && normalizedStatus !== "active") {
    return isItemOwner(item, currentUserKey);
  }
  const visibility = String(item?.visibility ?? "public").toLowerCase();
  if (visibility === "private") {
    if (hasViewAllAccess || hasManageAccess) return true;
    if (isItemOwner(item, currentUserKey)) return true;
    const allowed = Array.isArray(item?.allowedUsernames) ? item.allowedUsernames : [];
    return Boolean(currentUserKey) && allowed.includes(currentUserKey);
  }
  return true;
};
