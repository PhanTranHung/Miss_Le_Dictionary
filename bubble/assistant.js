(async (mess) => {
	let selection;

	const bubbles = [];

	const { events, targets } = await import(chrome.runtime.getURL("helper/variables.js"));
	const { onceSendMessage } = await import(chrome.runtime.getURL("helper/messaging.js"));

	function selfDestroyOnFocusOut(node, cb) {
		const handleDestroy = (e) => {
			if (!node.contains(e.target)) {
				node.remove();
				document.removeEventListener("mousedown", handleDestroy);
			}
		};

		document.addEventListener("mousedown", handleDestroy);
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
		ps.x += window.scrollX;
		ps.y += window.scrollY;
		return ps;
	}

	function createResultBubble([oxf, gogl]) {
		const pronouncePart = getOuterHTMLByQuery(oxf.dict, ".webtop");
		const gData = JSON.parse(gogl.tran);
		const ps = getBoundingRect();
		const div = document.createElement("div");

		div.innerHTML = `<div tabindex="-1" class="bb-res-root" style="top: ${ps.y}px; left: ${ps.x + ps.width}px">
										<div class="bb-res-container">
											<div class="bb-res-card">
												<div class="bb-res-card-title">${pronouncePart?.isError ? `<div class="bb-res-error">Oxford: Not found</div>` : pronouncePart}</div>
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
				onceSendMessage(events.SPEAK_O, { srcMp3, srcOgg }, targets.OFFSCREEN).then((response) => {
					// console.log(response);
				}),
			);
		});

		attachElementToDOM(div);
		return div;
	}

	function createWaitingBubble() {
		const ps = getBoundingRect();
		const imgPath = chrome.runtime.getURL("common/imgs/sunny-light.svg");

		const div = document.createElement("div");
		div.innerHTML = `
		<div tabindex="-1" class="bb-wt-root" style="top: ${ps.y}px; left: ${ps.x + ps.width}px">
			<div class="bb-wt-bounding">
				<img class="bb-wt-img" src="${imgPath}" alt="finding" />
			</div>
		</div>
		`;

		attachElementToDOM(div);
		return div;
	}

	function createTranslateBubble() {
		const ps = getBoundingRect();
		const imgPath = chrome.runtime.getURL("common/imgs/translate.png");

		const div = document.createElement("div");
		div.innerHTML = `
		<div tabindex="-1" class="bb-trans-root" style="top: ${ps.y}px; left: ${ps.x + ps.width}px">
			<div class="bb-trans-bounding">
				<img class="bb-wt-img" src="${imgPath}" alt="finding" />
			</div>
		</div>`;

		attachElementToDOM(div);
		return div;
	}

	function attachElementToDOM(element) {
		document.body.appendChild(element);
		// element.focus();
		// element.addEventListener("focusout", (e) => element.remove());
		selfDestroyOnFocusOut(element);
	}

	function translate(text) {
		const oxfTrans = onceSendMessage(events.OXFORD_TRANSLATE, text, targets.BG);
		const goglTrans = onceSendMessage(events.GOOGLE_TRANSLATE, text, targets.BG);

		return Promise.all([oxfTrans, goglTrans]);
	}

	function listen() {
		function selectTextListener(e) {
			selection = window.getSelection();
			const textSelected = getSelectionText(selection).trim();

			if (textSelected.length > 0) {
				const bubbleTranslate = createTranslateBubble(textSelected);
				bubbleTranslate.addEventListener("click", (e) => {
					bubbleTranslate.remove();
					const waitingBubble = createWaitingBubble();
					translate(textSelected)
						.then((response) => {
							// const [oxfResult, goglResult] = response;
							waitingBubble.remove();
							createResultBubble(response);
						})
						.catch(console.error);
				});
			}
		}

		function clearBubbles(e) {
			bubbles.map((bubble) => {
				if (!bubble.contains(e.target)) bubble.remove();
			});
		}

		document.body.addEventListener("mouseup", selectTextListener);
		document.body.addEventListener("mousedown", clearBubbles);

		return function clearListener() {
			document.body.removeEventListener("mouseup", selectTextListener);
			document.body.removeEventListener("mousedown", clearBubbles);
		};
	}

	listen();

	function startListening() {
		let bubble = { translate: false, waiting: false, result: false, prevStage: "", curStage: "" };
		let textSelected;

		function selectTextListener(e) {
			selection = window.getSelection();
			textSelected = getSelectionText(selection).trim();

			if (textSelected.length > 0) {
				document.body.removeEventListener("mouseup", selectTextListener);
				bubble.translate = createTranslateBubble(textSelected);
				bubble.curStage = "translate";
				attachElementToDOM(bubble.translate);
			}
		}

		function translate(text, cb) {
			const oxfTrans = onceSendMessage(events.OXFORD_TRANSLATE, text, targets.BG);
			const goglTrans = onceSendMessage(events.GOOGLE_TRANSLATE, text, targets.BG);

			const promise = Promise.all([oxfTrans, goglTrans])
				.then((response) => {
					const [oxfResult, goglResult] = response;
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

	// startListening();
})("Miss Le dictionary: Bubble translate is ready!");
