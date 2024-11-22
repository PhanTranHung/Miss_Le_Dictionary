import { events, responseTypes, targets } from "../helper/variables.js";
import { onceSendMessage } from "../helper/messaging.js";
import storage from "../helper/storage.js";

const sourceBtn = document.getElementById("go_to_source");
const textarea = document.getElementById("text");
const btnsubmit = document.getElementById("btn-submit");
const oxfordBox = document.getElementById("oxfordBox");
const googleBox = document.getElementById("googleBox");
const detail = document.getElementById("go-to-detail");
const oxfordContainer = document.getElementById("oxfordContainer");
const speaker_radios = [...document.querySelectorAll("#select_speaker > input")].sort((a, b) => parseInt(a.value) - parseInt(b.value));
const bubble_enable_status_radios = [...document.querySelectorAll("#toggle_bubble > input")].sort((a, b) => parseInt(a.value) - parseInt(b.value));

let currenSpeakerId = 0;
let currenBubbleEnableStatusId = 0;

textarea.addEventListener("keypress", (e) => "Enter" === e.code && main());
btnsubmit.addEventListener("click", main);
detail.addEventListener("click", () => createTab(detail.href));
sourceBtn.addEventListener("click", () => createTab(sourceBtn.href));
speaker_radios.forEach((ele) => bindingSelectSpeakerEvent(ele));
bubble_enable_status_radios.forEach((ele) => bindingBubbleEnableStatusEvent(ele));

document.body.addEventListener("keypress", (e) => {
	if (e.shiftKey && e.code === "KeyA" && !e.ctrlKey && !e.altKey && document.activeElement !== textarea) {
		e.preventDefault();
		textarea.focus();
	}
});

chrome.commands.onCommand.addListener(function (command) {
	if (command === "focus-textarea") textarea.focus();
});

async function loadLocalData() {
	const oxfordDefinitionStored = await storage.getData(responseTypes.OXFORD_DEFINITION_STORED);
	textarea.value = oxfordDefinitionStored.question;
	textarea.select();

	fillOxfordBox(oxfordDefinitionStored);

	const selectedSpeakerStored = await storage.getData(responseTypes.SELECTED_SPEAKER_STORED);
	loadSelectedSpeaker(selectedSpeakerStored);

	const bubbleEnableStatusStored = await storage.getData(responseTypes.BUBBLE_ENABLE_STATUS_STORED);
	loadBubbleEnableStatus(bubbleEnableStatusStored);
}

loadLocalData();

async function saveDataToLocal(data) {
	switch (data.type) {
		case responseTypes.OXFORD_DEFINITION_STORED:
		case responseTypes.SELECTED_SPEAKER_STORED:
		case responseTypes.BUBBLE_ENABLE_STATUS_STORED:
			return await storage.setData(data.type, data);
		default:
			console.error("Can't save response to local storage: DATA_TYPE ", data.type);
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

function fillGoogleBox(response) {
	if (!!response.error) console.error(response);
	switch (response.type) {
		case responseTypes.INIT:
			return;

		case responseTypes.GOOGLE_ANSWER:
			return renderGoogleBoxContent(response.tran);

		case responseTypes.ERROR:
			console.error("An error was occur", response.message);
		default:
			console.error("Unknown response type: ", response.type);
			googleBox.innerHTML = "Error undefined";
	}
}

function fillOxfordBox(response) {
	let root;

	const fill = (text) => {
		oxfordBox.innerHTML = text;
	};

	const getOuterHTMLByQuery = (query) => {
		if (!root) {
			root = document.createElement("html");
			root.innerHTML = response.dict;
		}

		const node = root.querySelector(query);
		if (!node) throw "Get outer HTML not found";
		return node.outerHTML;
	};

	if (!!response.error) {
		fill("An error was occur");
		console.error(response);
	}

	switch (response.type) {
		case responseTypes.SUGGEST:
			const suggestHTML = getOuterHTMLByQuery(".result-list");
			const title = `<div class="result-header">“${response.question}” not found</div><div class="didyoumean">Did you mean:</div>`;
			return fill(title + suggestHTML);

		case responseTypes.NO_MATCH:
			oxfordBox.innerHTML = "";
			return toggleVisible(oxfordContainer, "hide");

		case responseTypes.OXFORD_DEFINITION:
			try {
				const pronunciationHTMl = getOuterHTMLByQuery(".webtop");
				const definitionHTML = getOuterHTMLByQuery(".entry[htag='section'] > .senses_multiple, .sense_single");

				const boxContentHTML = pronunciationHTMl + definitionHTML;
				saveDataToLocal({ ...response, dict: boxContentHTML, type: responseTypes.OXFORD_DEFINITION_STORED });

				fill(boxContentHTML);
				toggleVisible(oxfordContainer, "show");
			} catch (error) {
				fill(error);
				console.error(error);
			}
			break;

		case responseTypes.OXFORD_DEFINITION_STORED:
			return fill(response.dict);

		case responseTypes.URL_UNDEFINED:
			fill("No definition");

		case responseTypes.ERROR:
			fill("An error was occur");
			console.error(error);
			break;

		default:
			console.error("Unknown response type: ", response.type);
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
		btn.addEventListener("click", (evt) => {
			onceSendMessage(events.SPEAK_O, { srcMp3, srcOgg }, targets.OFFSCREEN).then((respose) => {
				// console.log(respose);
			});
		});
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
	detail.href = response.url;
}

function bindingClickEvent() {
	jQuery("ul.result-list li").on("click", function (evt) {
		textarea.value = $(this).text().trim();
		main();
	});

	const activeSpeakerBtns = jQuery(".webtop > .phonetics > div > .sound:not(.sound ~ .sound)");
	// Add the disabled speaker btn
	console.log(activeSpeakerBtns);

	const allSpeakerBtns = [undefined, ...activeSpeakerBtns];
	console.log(allSpeakerBtns);
	const selectedSpeakerBtn = allSpeakerBtns[currenSpeakerId];
	console.log(allSpeakerBtns);
	if (!!selectedSpeakerBtn) selectedSpeakerBtn.click();
}

function createTab(url, active = true, cb = undefined) {
	chrome.tabs.create({ url, active }, cb);
}

function renderGoogleBoxContent(data) {
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
	if (type === "hide") ele.classList.add("hide");
	if (type === "show") ele.classList.remove("hide");
}

function bindingSelectSpeakerEvent(ele) {
	ele.labels.forEach((label) => {
		label.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			const currentId = parseInt(ele.value);
			// Change to the next speaker
			const speakerId = (currentId + 1) % speaker_radios.length;
			console.log(speakerId);
			const response = { speakerId, type: responseTypes.SELECTED_SPEAKER };
			loadSelectedSpeaker(response);
		});
	});
}

function loadSelectedSpeaker(response) {
	switch (response.type) {
		case responseTypes.SELECTED_SPEAKER:
			speaker_radios[response.speakerId].checked = true;
			saveDataToLocal({ ...response, type: responseTypes.SELECTED_SPEAKER_STORED });
			currenSpeakerId = response.speakerId;
			break;

		case responseTypes.SELECTED_SPEAKER_STORED:
			speaker_radios[response.speakerId].checked = true;
			currenSpeakerId = response.speakerId;
			break;

		default:
			break;
	}
}

function bindingBubbleEnableStatusEvent(ele) {
	ele.labels.forEach((label) => {
		label.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			const currentId = parseInt(ele.value);
			// Change to the next bubble
			const bubbleStatusId = (currentId + 1) % bubble_enable_status_radios.length;
			console.log(bubbleStatusId);
			const response = { bubbleStatusId: bubbleStatusId, type: responseTypes.BUBBLE_ENABLE_STATUS };
			loadBubbleEnableStatus(response);
		});
	});
}

function loadBubbleEnableStatus(response) {
	switch (response.type) {
		case responseTypes.BUBBLE_ENABLE_STATUS:
			bubble_enable_status_radios[response.bubbleStatusId].checked = true;
			saveDataToLocal({ ...response, type: responseTypes.BUBBLE_ENABLE_STATUS_STORED });
			currenBubbleEnableStatusId = response.bubbleStatusId;
			break;

		case responseTypes.BUBBLE_ENABLE_STATUS_STORED:
			bubble_enable_status_radios[response.bubbleStatusId].checked = true;
			currenBubbleEnableStatusId = response.bubbleStatusId;
			break;

		default:
			break;
	}
}
