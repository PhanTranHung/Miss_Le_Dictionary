import { queryOxford } from "../helper/network.js";
import { playSound } from "../helper/audio.js";
import { events, responseTypes } from "../helper/variables.js";

chrome.runtime.onInstalled.addListener(function (details) {
  console.log("Extension is installed", details);
});

chrome.runtime.onMessage.addListener(function (req, sender, sendResponse) {
  switch (req.event) {
    case events.TRANSLATE:
      translate(req.payload, sendResponse);
      break;
    case events.SPEAK:
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

function translate(question, sendResponse) {
  queryOxford(question)
    .catch((err) => sendResponse({ error: true, err }))
    .then(({ html, url }) => {
      let root = document.createElement("html");
      root.innerHTML = html;

      let response = { question, url };

      url = new URL(url);

      if (url.pathname.startsWith("/definition")) {
        response.dict = root.getElementsByClassName("webtop")[0].outerHTML;
        response.type = responseTypes.ANSWER;
      } else if (url.pathname.startsWith("/spellcheck")) {
        response.dict = root.getElementsByClassName("result-list")[0].outerHTML;
        response.type = responseTypes.SUGGEST;
      } else {
        response.type = responseTypes.ERROR;
        response.message = "URL undefined";
      }
      sendResponse(response);
    })
    .catch((err) => sendResponse({ error: true, err }));
}
