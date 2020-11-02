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

function loadLocalData() {
  let data = storage.getData(storageKey.POPUP);
  textarea.value = data.question;
  textarea.select();

  fillOxfordBox(data);
}

loadLocalData();

function saveDataToLocal(data) {
  switch (data.type) {
    case responseTypes.ANSWER_O:
      data.type = responseTypes.STORED;
      return storage.setData(storageKey.POPUP, data);

    default:
      console.log(
        "Can't save response to local storage: DATA_TYPE ",
        data.type
      );
  }
}

function main() {
  let question = textarea.value.trim();
  if (question.length <= 0) {
    textarea.value = "";
    textarea.focus();
  } else {
    onceSendMessage(events.GOOGLE_TRANSLATE, question, (response) => {
      fillGoogleBox(response);
    });
    onceSendMessage(events.OXFORD_TRANSLATE, question, (response) => {
      fillOxfordBox(response);
      saveDataToLocal(response);
    });
  }
}

function onceSendMessage(event, payload, cb) {
  chrome.runtime.sendMessage({ event, payload }, cb);
}

function fillGoogleBox(response) {
  if (!!response.error) throw response.err;
  switch (response.type) {
    case responseTypes.INIT:
      return;

    case responseTypes.STORED:
      return;

    case responseTypes.ANSWER_G:
      return renderGoogleBoxContent(response.tran);

    case responseTypes.ERROR_G:
      console.log("An error was occur", response.message);

    default:
      console.log("Unknown response type");
  }
}

function fillOxfordBox(response) {
  if (!!response.error) throw response.err;
  switch (response.type) {
    case responseTypes.INIT:
      return (oxfordBox.innerHTML = response.dict);

    case responseTypes.SUGGEST_O:
      let title = `<div class="result-header">“${response.question}” not found</div><div class="didyoumean">Did you mean:</div>`;
      oxfordBox.innerHTML = title + response.dict;
      break;

    case responseTypes.NO_MATCH_O:
      oxfordBox.innerHTML = "";
      return toggleVisible(oxfordContainer, "hide");

    case responseTypes.ANSWER_O:
      toggleVisible(oxfordContainer, "show");
    case responseTypes.STORED:
      oxfordBox.innerHTML = response.dict;
      break;

    case responseTypes.ERROR_O:
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
      onceSendMessage(events.SPEAK_O, { srcMp3, srcOgg }, (respose) => {
        // console.log(respose);
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
                      <div class="trans">${jdata.sentences
                        .map((val) => (val.trans ? val.trans : ""))
                        .join("")}</div>
                    </div>`;
  if (jdata.dict) {
    const dict = jdata.dict
      .map(
        (val) => `<div class="dict">
                  <div class="pos">${val.pos}</div>
                  <div class="terms">
                    ${val.terms
                      .map((term) => `<span class="term">${term}</span>`)
                      .join("")}
                  </div>
                </div>`
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
