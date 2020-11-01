import { responseTypes, storageKey } from "../helper/variables.js";
import storage from "../helper/storage.js";

chrome.runtime.onInstalled.addListener(function (details) {
  console.log("Extension is installed", details);

  storage.setData(storageKey.TRANSLATE, { from: "en", to: "vi" });
  storage.setData(storageKey.POPUP, {
    question: "hello",
    dict: `<h3>Thank you for using Miss Le Dictionary</h3><div>Press <code><b>Ctrl + Shift + A</b></code> to open extension</div><br/>
      <div>You can change the keyboard shortcuts in this link: <i style="color: blue;">chrome://extensions/shortcuts</i></div>`,
    url: undefined,
    type: responseTypes.INIT,
  });
});
