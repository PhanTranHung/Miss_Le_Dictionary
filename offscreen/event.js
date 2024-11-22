import { events } from "../helper/variables.js";
import { playSound } from "../helper/audio.js";

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
	switch (req.event) {
		case events.SPEAK_O:
			processAudio(req.payload, sendResponse);
			break;
	}
	return true;
});

function processAudio({ srcMp3, srcOgg }, sendResponse) {
	if (!!srcMp3 && !!srcOgg) {
		try {
			playSound(srcMp3, srcOgg);
			sendResponse({ message: "Success" });
		} catch (error) {
			sendResponse({ error: true, message: "Error" });
			throw error;
		}
	}
}
