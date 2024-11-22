export const getData = async (key) => {
	return chrome.storage.local
		.get(key)
		.then((items) => items[key] || "")
		.then((value) => {
			try {
				return JSON.parse(value);
			} catch (error) {
				return value;
			}
		})
		.catch((err) => {
			console.error(err);
		});
};

export const setData = async (key, value) => {
	if (typeof value === "object") value = JSON.stringify(value);
	return chrome.storage.local.set({ [key]: value });
};

export const watchData = async (key, handler) => {
	const callback = (changed) => {
		const changedOfKey = changed[key];
		if (changedOfKey === undefined) return;
		const { newValue, oldValue } = changedOfKey;
		const parsed = [newValue, oldValue].map((value) => {
			try {
				return JSON.parse(value);
			} catch (error) {
				return value;
			}
		});
		handler(...parsed);
	};
	chrome.storage.local.onChanged.addListener(callback);
};

export default {
	getData,
	setData,
	watchData,
};
