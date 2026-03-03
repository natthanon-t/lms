const loginDatesKey = (username) => `login_dates_${username}`;

export const getLoginDates = (username) => {
  if (!username) return [];
  try {
    return JSON.parse(localStorage.getItem(loginDatesKey(username)) ?? "[]");
  } catch {
    return [];
  }
};

export const recordLoginDate = (username) => {
  if (!username) return;
  const today = new Date().toISOString().slice(0, 10);
  const dates = getLoginDates(username);
  if (!dates.includes(today)) {
    dates.push(today);
    localStorage.setItem(loginDatesKey(username), JSON.stringify(dates));
  }
};
