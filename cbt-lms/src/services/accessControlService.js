const toOwnerUsername = (item) => String(item?.ownerUsername ?? "").trim();

export const isItemOwner = (item, currentUserKey) =>
  Boolean(currentUserKey) && toOwnerUsername(item) === currentUserKey;

export const canManageOwnedItem = ({ item, currentUser, currentUserKey, isAdmin }) => {
  if (!currentUser) {
    return false;
  }
  return isAdmin || isItemOwner(item, currentUserKey);
};

export const canViewItemByStatus = ({ item, currentUserKey, isAdmin }) => {
  const normalizedStatus = String(item?.status ?? "active").toLowerCase();
  return isAdmin || normalizedStatus === "active" || isItemOwner(item, currentUserKey);
};

