import { queryOxford, queryGoogle } from "../helper/network.js";
import { playSound } from "../helper/audio.js";
import { events, responseTypes } from "../helper/variables.js";

chrome.runtime.onMessage.addListener(function (req, sender, sendResponse) {
  switch (req.event) {
    case events.OXFORD_TRANSLATE:
      oxfordTranslate(req.payload, sendResponse);
      break;
    case events.GOOGLE_TRANSLATE:
      googleTranslate(req.payload, sendResponse);
      break;
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

function handleError(sendResponse, error, message = "Error undefined") {
  console.error(error);
  return sendResponse({ type: error.type, message: error.messase || message });
}

function oxfordTranslate(question, sendResponse) {
  queryOxford(question)
    .catch((err) => handleError(sendResponse, err))
    .then(({ data: html, url }) => {
      let root = document.createElement("html");
      root.innerHTML = html;

      let response = { question, url };

      url = new URL(url);

      if (url.pathname.startsWith("/definition")) {
        response.dict = root.getElementsByClassName("webtop")[0].outerHTML;
        response.type = responseTypes.ANSWER;
      } else if (url.pathname.startsWith("/spellcheck")) {
        try {
          response.dict = root.getElementsByClassName(
            "result-list"
          )[0].outerHTML;
          response.type = responseTypes.SUGGEST;
        } catch (error) {
          response.dict = "";
          response.type = responseTypes.NO_MATCH;
        }
      } else {
        response.type = responseTypes.ERROR;
        response.message = "URL undefined";
      }
      sendResponse(response);
    })
    .catch((err) => handleError(sendResponse, err));
}

function googleTranslate(question, sendResponse) {
  queryGoogle(question)
    .catch((err) => handleError(sendResponse, err))
    .then(({ data: json, url }) => {
      let response = { question, url };

      if (!!json) {
        response.tran = json;
        response.type = responseTypes.ANSWER;
      } else {
        response.type = responseTypes.ERROR;
        response.message = "Data null: Google translate";
      }
      sendResponse(response);
    })
    .catch((err) => handleError(sendResponse, err));
}
