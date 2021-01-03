import { events, responseTypes, storageKey } from "../helper/variables.js";
import storage from "../helper/storage.js";

const textarea = document.getElementById("text");
const btnsubmit = document.getElementById("btn-submit");
const oxfordBox = document.getElementById("oxfordBox");
const googleBox = document.getElementById("googleBox");
const detail = document.getElementById("go-to-detail");
const oxfordContainer = document.getElementById("oxfordContainer");

textarea.addEventListener("keypress", (e) => "Enter" === e.code && main());
btnsubmit.addEventListener("click", main);

document.body.addEventListener("keypress", (e) => {
	if (e.shiftKey && e.code === "KeyA" && !e.ctrlKey && !e.altKey && document.activeElement !== textarea) {
		e.preventDefault();
		textarea.focus();
	}
});

chrome.commands.onCommand.addListener(function (command) {
	if (command === "focus-textarea") textarea.focus();
});

function loadLocalData() {
	let data = storage.getData(storageKey.POPUP);
	textarea.value = data.question;
	textarea.select();

	fillOxfordBox(data);
}

loadLocalData();

function saveDataToLocal(data) {
	switch (data.type) {
		case responseTypes.ANSWER:
			data.type = responseTypes.STORED;
			return storage.setData(storageKey.POPUP, data);

		default:
			console.log("Can't save response to local storage: DATA_TYPE ", data.type);
	}
}

function main() {
	let question = textarea.value.trim();
	if (question.length <= 0) {
		textarea.value = "";
		textarea.focus();
	} else {
		const promises = [
			[events.GOOGLE_TRANSLATE, fillGoogleBox],
			[events.OXFORD_TRANSLATE, fillOxfordBox],
		].map((e) =>
			onceSendMessage(e[0], question).then((response) => {
				e[1](response);
				return response;
			}),
		);
	}
}

async function onceSendMessage(event, payload) {
	return new Promise((res, rej) => {
		try {
			chrome.runtime.sendMessage({ event, payload }, res);
		} catch (e) {
			console.error(e);
			rej(e);
		}
	});
}

function fillGoogleBox(response) {
	if (!!response.error) console.error(response);
	switch (response.type) {
		case responseTypes.INIT:
			return;

		case responseTypes.STORED:
			return;

		case responseTypes.ANSWER:
			return renderGoogleBoxContent(response.tran);

		case responseTypes.ERROR:
			console.log("An error was occur", response.message);
		default:
			console.log("Unknown response type: ", response.type);
			googleBox.innerHTML = "Error undefined";
	}
}

function fillOxfordBox(response) {
	if (!!response.error) console.error(response);
	switch (response.type) {
		case responseTypes.INIT:
			return (oxfordBox.innerHTML = response.dict);

		case responseTypes.SUGGEST:
			let title = `<div class="result-header">“${response.question}” not found</div><div class="didyoumean">Did you mean:</div>`;
			oxfordBox.innerHTML = title + response.dict;
			break;

		case responseTypes.NO_MATCH:
			oxfordBox.innerHTML = "";
			return toggleVisible(oxfordContainer, "hide");

		case responseTypes.ANSWER:
			saveDataToLocal(response);
			toggleVisible(oxfordContainer, "show");

		case responseTypes.STORED:
			oxfordBox.innerHTML = response.dict;
			break;

		case responseTypes.ERROR:
			console.log("An error was occur", response.message);
		default:
			console.log("Unknown response type: ", response.type);
			oxfordBox.innerHTML = "Error undefined";
	}

	binding(response);
}

function binding(response) {
	bindingAudioBtn();
	bindingCollapse();
	bindingClickEvent();
	bindingDetailButton(response);
}

function bindingAudioBtn() {
	let btn_speakers = document.getElementsByClassName("audio_play_button");

	for (let btn of btn_speakers) {
		let { srcMp3, srcOgg } = btn.dataset;
		btn.addEventListener("click", (evt) =>
			onceSendMessage(events.SPEAK_O, { srcMp3, srcOgg }, (respose) => {
				// console.log(respose);
			}),
		);
	}
}

function bindingCollapse() {
	[...document.getElementsByClassName("box_title"), ...document.getElementsByClassName("heading")].map((e) => {
		e.addEventListener("click", (evt) => {
			evt.target.parentElement.classList.toggle("is-active");
		});
	});
}

function bindingDetailButton(response) {
	detail.classList.add("active");
	detail.addEventListener("click", (evt) => createTab(response.url));
}

function bindingClickEvent() {
	jQuery("ul.result-list li").on("click", function (evt) {
		textarea.value = $(this).text().trim();
		main();
	});

	const btn = jQuery(".webtop > .phonetics > .phons_n_am > .pron-us")[0];

	if (!!btn) btn.click();
}

function createTab(url, active = true, cb = undefined) {
	chrome.tabs.create({ url, active }, cb);
}

function renderGoogleBoxContent(data) {
	console.log(data);
	const jdata = JSON.parse(data);
	let content = `<div class="sentences">
                  <div class="trans">
                    ${jdata.sentences.map((val) => (val.trans ? val.trans : "")).join("")}  
                  </div>
                </div>`;
	if (jdata.dict) {
		const dict = jdata.dict
			.map(
				(val) => `<div class="dict">
                    <div class="pos">${val.pos}</div>
                    <div class="terms">
                      ${val.terms.map((term) => `<span class="term">${term}</span>`).join("")}
                    </div>
                  </div>`,
			)
			.join("");
		content += `<hr />
                <div class="dicts"> 
                  ${dict}
                </div>`;
	}
	googleBox.innerHTML = content;
}

function toggleVisible(ele, type = "toggle") {
	if (type === "toggle") ele.classList.toggle("hide");
	else if (type === "hide") ele.classList.add("hide");
	else if (type === "show") ele.classList.remove("hide");
}
