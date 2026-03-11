export const avatarStorageKey = (username) => `profile_avatar_${username}`;

export const getAvatarColor = (username) => {
  let hash = 0;
  const str = String(username || "");
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash) % 360}, 55%, 48%)`;
};

export const getInitials = (name, username) => {
  const text = String(name || username || "?").trim();
  const words = text.split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return text.slice(0, 2).toUpperCase();
};
