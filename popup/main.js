import { events, responseTypes } from "../helper/variables.js";

const textarea = document.getElementById("text");
const btnsubmit = document.getElementById("btn-submit");
const fieldcontent = document.getElementById("field-content");
const detail = document.getElementById("go-to-detail");

textarea.addEventListener("keypress", (e) => "Enter" === e.code && main());
btnsubmit.addEventListener("click", main);

function main() {
  let question = textarea.value.trim();
  if (question.length <= 0) {
    textarea.value = "";
    textarea.focus();
  } else
    onceSendMessage(events.TRANSLATE, question, (response) => {
      fillUI(response);
    });
}

function onceSendMessage(event, payload, cb) {
  chrome.runtime.sendMessage({ event, payload }, cb);
}

function fillUI(response) {
  switch (response.type) {
    case responseTypes.SUGGEST:
      let title = `<div class="result-header">“${response.question}” not found</div><div class="didyoumean">Did you mean:</div>`;
      fieldcontent.innerHTML = title + response.dict;
      break;

    case responseTypes.INIT:
      return (fieldcontent.innerHTML = response.dict);

    case responseTypes.ANSWER:
      fieldcontent.innerHTML = response.dict;
      break;

    case responseTypes.ERROR:
      console.log("An error was occur", response.message);
    default:
      console.log("Unknown response type");
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
      onceSendMessage("speak", { srcMp3, srcOgg }, (respose) => {
        console.log(respose);
      })
    );
  }
}

function bindingCollapse() {
  [
    ...document.getElementsByClassName("box_title"),
    ...document.getElementsByClassName("heading"),
  ].map((e) => {
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
}

function createTab(url, active = true, cb = undefined) {
  chrome.tabs.create({ url, active }, cb);
}
