export async function onceSendMessage(event, payload, target) {
	return new Promise((res, rej) => {
		try {
			chrome.runtime.sendMessage({ event, payload, target }, res);
		} catch (e) {
			console.error(e);
			rej(e);
		}
	});
}
