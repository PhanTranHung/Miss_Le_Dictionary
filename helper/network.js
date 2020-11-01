import { stringify } from "./querystring.js";

function fetchUrl(
  url,
  headers = undefined,
  method = "GET",
  data = {},
  timeout = 5000
) {
  return new Promise((reslove, reject) => {
    var xhr = new XMLHttpRequest();

    xhr.addEventListener("load", (evt) => {
      console.log("The transfer is complete.");
      reslove({
        data: xhr.responseText,
        url: xhr.responseURL,
      });
    });
    xhr.addEventListener("error", (evt) =>
      transferError(evt, "An error occurred while request the answer.")
    );
    xhr.addEventListener("abort", (evt) =>
      transferError(evt, "The transfer has been canceled by the user.")
    );
    xhr.addEventListener("timeout", (evt) => transferError(evt, "Time out!!!"));

    function transferError(evt, message) {
      console.log(message);
      reject({ message, evt });
    }

    xhr.timeout = timeout;
    xhr.open(method, url, true);

    if (!!headers)
      for (let key in headers) xhr.setRequestHeader(key, headers[key]);

    xhr.send(data);
  });
}

export function queryOxford(question) {
  question = question.trim();

  let url =
    "https://www.oxfordlearnersdictionaries.com/search/english/?q=" + question;
  return fetchUrl(url);
}

export function queryGoogle(question, from = "auto", to = "vi") {
  question = question.trim();

  // const ranInRange = (min, max, fixed = 6) =>
  //   (Math.random() * (max - min) + min).toFixed(fixed);

  let headers = {
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  };

  let query = {
    client: "gtx",
    sl: from,
    tl: to,
    hl: to,
    dj: 1,
    ie: "UTF-8",
    oe: "UTF-8",
    q: question,
    dt: ["bd", "ex", "qc", "rm", "t"],
    // tk: ranInRange(11000, 200000, Math.round(Math.random() * 7)),
  };

  let url = "https://translate.googleapis.com/translate_a/single";

  return fetchUrl(url + "?" + stringify(query), headers);
}
