import { stringify } from "./querystring.js";

async function fetchUrl(url, headers = undefined, method = "GET", data, timeout = 5000) {
	return fetch(url, { method, headers, body: data ? JSON.stringify(data) : undefined, redirect: "follow" })
		.then((resp) => resp.text().then((text) => ({ data: text, url: resp.url })))
		.catch((err) => ({ message: err?.message, type: "error", err }));
}

export function queryOxford(question) {
	question = question.trim();

	let url = "https://www.oxfordlearnersdictionaries.com/search/english/?q=" + question;
	return fetchUrl(url);
}

export function queryGoogle(question, from = "en", to = "vi") {
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
