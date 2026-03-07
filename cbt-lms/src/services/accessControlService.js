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

export const canViewItemByStatus = ({ item, currentUserKey, hasManageAccess }) => {
  const normalizedStatus = String(item?.status ?? "active").toLowerCase();
  return hasManageAccess || normalizedStatus === "active" || isItemOwner(item, currentUserKey);
};
