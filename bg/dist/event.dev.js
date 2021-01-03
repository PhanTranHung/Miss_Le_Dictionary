"use strict";

var _network = require("../helper/network.js");

var _audio = require("../helper/audio.js");

var _variables = require("../helper/variables.js");

chrome.runtime.onMessage.addListener(function (req, sender, sendResponse) {
  switch (req.event) {
    case _variables.events.OXFORD_TRANSLATE:
      oxfordTranslate(req.payload, sendResponse);
      break;

    case _variables.events.GOOGLE_TRANSLATE:
      googleTranslate(req.payload, sendResponse);
      break;

    case _variables.events.SPEAK_O:
      processAudio(req.payload, sendResponse);
      break;
  }

  return true;
});

function processAudio(_ref, sendResponse) {
  var srcMp3 = _ref.srcMp3,
      srcOgg = _ref.srcOgg;

  if (!!srcMp3 && !!srcOgg) {
    try {
      (0, _audio.playSound)(srcMp3, srcOgg);
      sendResponse({
        message: "Success"
      });
    } catch (error) {
      sendResponse({
        error: true,
        message: "Error"
      });
      throw error;
    }
  }
}

function handleError(sendResponse, error) {
  var message = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "Error undefined";
  console.error(error);
  return sendResponse({
    type: error.type,
    message: error.messase || message
  });
}

function oxfordTranslate(question, sendResponse) {
  (0, _network.queryOxford)(question)["catch"](function (err) {
    return handleError(sendResponse, err);
  }).then(function (_ref2) {
    var html = _ref2.data,
        url = _ref2.url;
    var root = document.createElement("html");
    root.innerHTML = html;
    var response = {
      question: question,
      url: url
    };
    url = new URL(url);

    if (url.pathname.startsWith("/definition")) {
      response.dict = root.getElementsByClassName("webtop")[0].outerHTML;
      response.type = _variables.responseTypes.ANSWER;
    } else if (url.pathname.startsWith("/spellcheck")) {
      try {
        response.dict = root.getElementsByClassName("result-list")[0].outerHTML;
        response.type = _variables.responseTypes.SUGGEST;
      } catch (error) {
        response.dict = "";
        response.type = _variables.responseTypes.NO_MATCH;
      }
    } else {
      response.type = _variables.responseTypes.ERROR;
      response.message = "URL undefined";
    }

    sendResponse(response);
  })["catch"](function (err) {
    return handleError(sendResponse, err);
  });
}

function googleTranslate(question, sendResponse) {
  (0, _network.queryGoogle)(question)["catch"](function (err) {
    return handleError(sendResponse, err);
  }).then(function (_ref3) {
    var json = _ref3.data,
        url = _ref3.url;
    var response = {
      question: question,
      url: url
    };

    if (!!json && json.startsWith("{")) {
      response.tran = json;
      response.type = _variables.responseTypes.ANSWER;
    } else {
      response.type = _variables.responseTypes.ERROR;
      response.message = "Google translate: the data is not JSON or null";
    }

    sendResponse(response);
  })["catch"](function (err) {
    return handleError(sendResponse, err);
  });
}