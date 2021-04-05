(async (mess) => {
	console.log(mess);
	let selection;

	let { events, responseTypes } = await import(chrome.runtime.getURL("helper/variables.js"));

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

	const getOuterHTMLByQuery = (html, query) => {
		const root = document.createElement("html");
		root.innerHTML = html;

		try {
			return root.querySelector(query).outerHTML;
		} catch (error) {
			return { isError: true, error };
		}
	};

	function getSelectionText() {
		var text = "";
		var activeEl = document.activeElement;
		var activeElTagName = activeEl ? activeEl.tagName.toLowerCase() : null;
		if (
			activeElTagName == "textarea" ||
			(activeElTagName == "input" && /^(?:text|search|password|tel|url)$/i.test(activeEl.type) && typeof activeEl.selectionStart == "number")
		) {
			// IE
			text = activeEl.value.slice(activeEl.selectionStart, activeEl.selectionEnd);
		} else if (selection) {
			// modern browsers
			text = selection.toString();
		}
		return text;
	}

	function getBoundingRect() {
		const ps = selection.getRangeAt(0).getBoundingClientRect();
		console.log(ps);
		ps.x += window.scrollX;
		ps.y += window.scrollY;
		return ps;
	}

	function createResultBubble([oxf, gogl]) {
		const pronouncePart = getOuterHTMLByQuery(oxf.dict, ".webtop");
		const gData = JSON.parse(gogl.tran);
		debugger;
		const ps = getBoundingRect();
		const div = document.createElement("div");
		div.innerHTML = `<div class="bb-res-root" style="top: ${ps.y}px; left: ${ps.x + ps.width}px">
										<div class="bb-res-container">
											<div class="bb-res-card">
												<div class="bb-res-card-title">${pronouncePart}</div>
												<hr class="horizontal-bar" />
												<div class="bb-res-content">
													<div class="bb-res-text-bold">${gData.sentences[0].trans}</div>
													<div class="bb-res-pt-2">
													${
														gData.dict
															? gData.dict
																	.map(
																		(type) =>
																			`<div class="bb-res-type">${type.pos}</div>
																<ul class="bb-res-list-item">
																	${type.terms.map((term) => `<li class="bb-res-item">${term}</li>`).join("")}
																</ul>`,
																	)
																	.join("")
															: ""
													}
													</div>
												</div>
											</div>
										</div>
									</div>`;
		div.querySelectorAll(".audio_play_button").forEach((btn) => {
			let { srcMp3, srcOgg } = btn.dataset;
			btn.addEventListener("click", (evt) =>
				onceSendMessage(events.SPEAK_O, { srcMp3, srcOgg }, (response) => {
					// console.log(response);
				}),
			);
		});
		return div;
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

		// selfDestructOnFocusOut(div, "mousedown");
		return div;
	}

	function attachElementToDOM(element) {
		document.body.appendChild(element);
	}

	function createTranslateBubble() {
		const ps = getBoundingRect();
		const imgPath = chrome.runtime.getURL("common/imgs/translate.png");

		const div = document.createElement("div");
		div.innerHTML = `<div class="bb-trans-root" 
                          style="top: ${ps.y}px; left: ${ps.x + ps.width}px">
                      <div class="bb-trans-bounding">
                        <img class="bb-wt-img" src="${imgPath}" alt="finding" />
                      </div>
										</div>`;
		return div;
	}

	function startListening() {
		let bubble = { translate: false, waiting: false, result: false, prevStage: "", curStage: "" };
		let textSelected;

		function selectTextListener(e) {
			selection = window.getSelection();
			textSelected = getSelectionText(selection).trim();

			if (textSelected.length > 0) {
				console.log(textSelected);
				document.body.removeEventListener("mouseup", selectTextListener);
				bubble.translate = createTranslateBubble();
				bubble.curStage = "translate";
				attachElementToDOM(bubble.translate);
			}
		}

		function translate(text, cb) {
			const oxfTrans = onceSendMessage(events.OXFORD_TRANSLATE, text);
			const goglTrans = onceSendMessage(events.GOOGLE_TRANSLATE, text);

			const promise = Promise.all([oxfTrans, goglTrans])
				.then((response) => {
					const [oxfResult, goglResult] = response;
					console.log(response);
					if (bubble.curStage === "waiting") {
						bubble.result = createResultBubble(response);
						attachElementToDOM(bubble.result);
						if (cb) cb(response);
					}
				})
				.catch(console.error);
		}

		document.body.addEventListener("mousedown", (e) => {
			const target = e.target;
			// const prevBubble = bubble[bubble.prevStage];
			const curBubble = bubble[bubble.curStage];

			console.log("current stage", bubble.curStage);
			switch (bubble.curStage) {
				case "":
					document.body.addEventListener("mouseup", selectTextListener);
					break;

				case "translate":
					if (curBubble.contains(target)) {
						bubble.waiting = createWaitingBubble();
						bubble.curStage = "waiting";
						attachElementToDOM(bubble.waiting);

						translate(textSelected, (res) => {
							bubble.curStage = "result";
							bubble.waiting.remove();
						});
					} else bubble.curStage = "";
					curBubble.remove();
					break;

				case "waiting":
					if (!curBubble.contains(target)) {
						curBubble.remove();
						bubble.curStage = "";
					}
					break;

				case "result":
					if (!curBubble.contains(target)) {
						curBubble.remove();
						bubble.curStage = "";
					}
					break;

				default:
					bubble.translate.remove();
					bubble.waiting.remove();
					bubble.result.remove();
					break;
			}

			// if (prevBubble && prevBubble.isConnected) {
			// 	if (!prevBubble.contains(target)) {
			// 		console.log("remove e");
			// 		prevBubble.remove();
			// 		// bubble = undefined;
			// 	}
			// }
		});

		document.body.addEventListener("mouseup", selectTextListener);
	}

	startListening();
})("Bubble assistant is ready!");
