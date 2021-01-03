(async (mess) => {
  console.log(mess);

  function getSelectionText() {
    var text = "";
    var activeEl = document.activeElement;
    var activeElTagName = activeEl ? activeEl.tagName.toLowerCase() : null;
    if (
      activeElTagName == "textarea" ||
      (activeElTagName == "input" &&
        /^(?:text|search|password|tel|url)$/i.test(activeEl.type) &&
        typeof activeEl.selectionStart == "number")
    ) {
      text = activeEl.value.slice(
        activeEl.selectionStart,
        activeEl.selectionEnd
      );
    } else if (window.getSelection) {
      text = window.getSelection().toString();
    }
    return text;
  }

  function getBoundingRect() {
    const ps = document.getSelection().getRangeAt(0).getBoundingClientRect();
    ps.x += window.scrollX;
    ps.y += window.scrollY;
    return ps;
  }

  function selfDestructOnFocusOut(element) {
    const selfDestruct = (e) => {
      if (!element.contains(e.target)) {
        element.remove();
        document.body.removeEventListener("mousedown", selfDestruct);
      }
    };
    document.body.addEventListener("mousedown", selfDestruct);
  }

  function createWaitingBubble() {
    const ps = getBoundingRect();
    const imgPath = chrome.runtime.getURL("common/imgs/sunny-light.svg");

    const div = document.createElement("div");
    div.innerHTML = `<div class="bb-wt-root" 
                          style="top: ${ps.y}px; left: ${ps.x + ps.width}px">
                      <div class="bb-wt-bounding">
                        <img class="bb-wt-img" src="${imgPath}" alt="finding" />
                      </div>
                    </div>`;

    selfDestructOnFocusOut(div);
    return div;
  }

  let { events, responseTypes } = await import(
    chrome.runtime.getURL("helper/variables.js")
  );

  document.body.addEventListener("mouseup", (evt) => {
    console.log(getSelectionText());

    if (getSelectionText().trim().length > 0) {
      const bb = createWaitingBubble();
      document.body.appendChild(bb);
    }
  });

  document.body.addEventListener("keyup", (e) => {
    if (e.key === "Shift" && getSelectionText().trim().length > 0) {
      const bb = createWaitingBubble();
      document.body.appendChild(bb);
    }
  });
})("Bubble assistant is ready!");
