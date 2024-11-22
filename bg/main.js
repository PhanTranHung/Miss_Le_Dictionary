import { responseTypes } from "../helper/variables.js";
import storage from "../helper/storage.js";
import { enableOffscreen } from "../helper/enable-offscreen.js";

chrome.runtime.onInstalled.addListener(function (details) {
	console.log("Extension is installed", details);

	storage.setData(responseTypes.TRANSLATE_LANG_STORED, { from: "en", to: "vi", type: responseTypes.TRANSLATE_LANG_STORED });
	storage.setData(responseTypes.SELECTED_SPEAKER_STORED, { speakerId: 2, type: responseTypes.SELECTED_SPEAKER_STORED });
	storage.setData(responseTypes.BUBBLE_ENABLE_STATUS_STORED, { bubbleStatusId: 1, type: responseTypes.BUBBLE_ENABLE_STATUS_STORED });
	storage.setData(responseTypes.OXFORD_DEFINITION_STORED, {
		question: "hello",
		dict: `<h3>Thank you for using Miss Le Dictionary</h3><div>Press <code><b>Ctrl/⌘ + Shift + S</b></code> to open extension</div><br/>
      <div>You can <b>see more</b> or <b>change</b> the keyboard shortcuts in this link: <i style="color: blue;">chrome://extensions/shortcuts</i></div>`,
		url: undefined,
		type: responseTypes.OXFORD_DEFINITION_STORED,
	});
});

enableOffscreen();
