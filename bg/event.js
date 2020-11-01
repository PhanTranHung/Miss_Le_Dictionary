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

function oxfordTranslate(question, sendResponse) {
  queryOxford(question)
    .catch((err) => {
      throw err;
    })
    .then(({ data: html, url }) => {
      let root = document.createElement("html");
      root.innerHTML = html;

      let response = { question, url };

      url = new URL(url);

      if (url.pathname.startsWith("/definition")) {
        response.dict = root.getElementsByClassName("webtop")[0].outerHTML;
        response.type = responseTypes.ANSWER_O;
      } else if (url.pathname.startsWith("/spellcheck")) {
        try {
          response.dict = root.getElementsByClassName(
            "result-list"
          )[0].outerHTML;
          response.type = responseTypes.SUGGEST_O;
        } catch (error) {
          response.dict = "";
          response.type = responseTypes.NO_MATCH_O;
        }
      } else {
        response.type = responseTypes.ERROR_O;
        response.message = "URL undefined";
      }
      sendResponse(response);
    })
    .catch((err) => {
      throw err;
    });
}

function googleTranslate(question, sendResponse) {
  queryGoogle(question)
    .catch((err) => {
      throw err;
    })
    .then(({ data: json, url }) => {
      let response = { question, url };

      if (!!json) {
        response.tran = json;
        response.type = responseTypes.ANSWER_G;
      } else {
        response.type = responseTypes.ERROR_G;
        response.message = "Data null: Google translate";
      }
      sendResponse(response);
    })
    .catch((err) => {
      throw err;
    });
}
