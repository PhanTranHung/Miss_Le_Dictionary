export const getData = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch (error) {
    return localStorage.getItem(key);
  }
};

export const setData = (key, value) => {
  if (typeof value === "object")
    localStorage.setItem(key, JSON.stringify(value));
  else localStorage.setItem(key, value);
};

export default {
  getData,
  setData,
};
