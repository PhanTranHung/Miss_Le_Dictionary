// This script make sure offscreen is running
const OFFSCREEN_PATH = "../offscreen/index.html";
export async function enableOffscreen(reasons = ["AUDIO_PLAYBACK"]) {
	const hasOffscreen = (await chrome.offscreen.hasDocument()) || (await hasOffscreenDocument(OFFSCREEN_PATH));
	if (hasOffscreen) return;
	await setupOffscreenDocument(OFFSCREEN_PATH, reasons);
}

let creating; // A global promise to avoid concurrency issues
async function setupOffscreenDocument(path, reasons) {
	// Check all windows controlled by the service worker to see if one
	// of them is the offscreen document with the given path
	const offscreenUrl = chrome.runtime.getURL(path);
	const existingContexts = await chrome.runtime.getContexts({
		contextTypes: ["OFFSCREEN_DOCUMENT"],
		documentUrls: [offscreenUrl],
	});

	if (existingContexts.length > 0) {
		return;
	}

	// create offscreen document
	if (creating) {
		await creating;
	} else {
		creating = chrome.offscreen.createDocument({
			url: path,
			reasons,
			justification: "Play audio",
		});
		await creating;
		creating = null;
	}
}

async function hasOffscreenDocument(path) {
	if ("getContexts" in chrome.runtime) {
		const contexts = await chrome.runtime.getContexts({
			contextTypes: ["OFFSCREEN_DOCUMENT"],
			documentUrls: [path],
		});
		return Boolean(contexts.length);
	} else {
		const matchedClients = await clients.matchAll();
		return await matchedClients.some((client) => {
			client.url.includes(chrome.runtime.id);
		});
	}
}
