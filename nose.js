// Camera and floating choices
const video = document.querySelector("#camera-preview");
const stage = document.querySelector("#camera-stage");
const dot = document.querySelector("#nose-dot");
const choices = document.querySelector("#nose-choices");
const question = document.querySelector("#round-question");
const options = document.querySelector("#round-options");
const cameraStatus = document.querySelector("#camera-status");

// Caregiver result
const message = document.querySelector("#caregiver-message");
const shareButton = document.querySelector("#share-result");
const shareStatus = document.querySelector("#share-status");

const rounds = [
  {
    name: "Runny nose",
    prompt: "Is your nose runny?",
    yes: { face: "👃", detail: "💧", motion: "dripping", label: "Runny nose" },
    no: { face: "👃", label: "Dry nose" }
  },
  {
    name: "Stuffy nose",
    prompt: "Does your nose feel blocked?",
    yes: { face: "👃", detail: "🧱", label: "Blocked nose" },
    no: { face: "👃", detail: "💨", motion: "flowing", label: "Air flows easily" }
  },
  {
    name: "Itchy nose",
    prompt: "Does your nose feel itchy?",
    yes: { face: "👃", detail: "👆", motion: "scratching", label: "Itchy nose" },
    no: { face: "😊", label: "Comfortable nose" }
  }
];

const unsurePicture = { face: "🤷", label: "I’m not sure" };

let answers = [];
let caregiverText = "";
let combinations;

let trackerPromise;
let animationFrame;
let previousFrame = -1;
let nosePosition;

async function loadTracker() {
  const base = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
  const { FaceLandmarker, FilesetResolver } = await import(`${base}/+esm`);
  const files = await FilesetResolver.forVisionTasks(`${base}/wasm`);

  return FaceLandmarker.createFromOptions(files, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
    },
    runningMode: "VIDEO",
    numFaces: 1
  });
}

function placeChoices() {
  if (choices.hidden || !nosePosition || choices.matches(":hover")) return;

  // The preview is mirrored, so reverse the horizontal coordinate.
  const x = (1 - nosePosition.x) * stage.clientWidth;
  const y = nosePosition.y * stage.clientHeight;
  const width = choices.offsetWidth;
  const height = choices.offsetHeight;

  const below = y + 26;
  const above = y - height - 26;
  const top = below + height <= stage.clientHeight ? below : above;

  // Keep all three choices inside the camera picture.
  choices.style.left =
    `${Math.max(0, Math.min(x - width / 2, stage.clientWidth - width))}px`;
  choices.style.top =
    `${Math.max(0, Math.min(top, stage.clientHeight - height))}px`;
}

function followNose(tracker) {
  if (video.hidden || !video.srcObject) {
    dot.hidden = true;
    choices.hidden = true;
    return;
  }

  if (video.readyState >= 2 && video.currentTime !== previousFrame) {
    previousFrame = video.currentTime;
    const result = tracker.detectForVideo(video, performance.now());
    nosePosition = result.faceLandmarks[0]?.[1];

    dot.hidden = !nosePosition;

    if (nosePosition) {
      dot.style.left = `${(1 - nosePosition.x) * 100}%`;
      dot.style.top = `${nosePosition.y * 100}%`;
      placeChoices();
    }
  }

  animationFrame = requestAnimationFrame(() => followNose(tracker));
}

video.addEventListener("playing", async () => {
  cameraStatus.textContent = "Loading the nose tracker…";

  try {
    trackerPromise ??= loadTracker();
    const tracker = await trackerPromise;
    if (video.hidden || !video.srcObject) return;

    cancelAnimationFrame(animationFrame);
    previousFrame = -1;
    cameraStatus.textContent = "Look at the camera and click the dot on your nose.";
    followNose(tracker);
  } catch {
    trackerPromise = undefined;
    cameraStatus.textContent =
      "Couldn’t start nose tracking. Check your internet connection and reopen the camera.";
  }
});

video.addEventListener("emptied", () => {
  cancelAnimationFrame(animationFrame);
  nosePosition = undefined;
  dot.hidden = true;
  choices.hidden = true;
});

function makeChoiceButton(picture, answer) {
  const button = document.createElement("button");
  button.type = "button";
  button.title = picture.label;
  button.setAttribute("aria-label", picture.label);

  const icon = document.createElement("span");
  icon.className = "symptom-icon";
  icon.textContent = picture.face;
  icon.setAttribute("aria-hidden", "true");

  if (picture.detail) {
    const detail = document.createElement("span");
    detail.className = "symptom-detail";
    if (picture.motion) detail.classList.add(picture.motion);
    detail.textContent = picture.detail;
    icon.append(detail);
  }

  button.append(icon);
  button.addEventListener("click", async () => {
    answers.push(answer);

    if (answers.length < rounds.length) {
      showRound();
      return;
    }

    choices.hidden = true;
    dot.disabled = true;
    try {
      await finishRound([...answers]);
    } finally {
      dot.disabled = false;
    }
  });

  return button;
}

function showRound() {
  const round = rounds[answers.length];
  question.textContent = round.prompt;

  // Keep Yes, No, and Unsure in the same order every round.
  options.replaceChildren(
    makeChoiceButton(round.yes, "Yes"),
    makeChoiceButton(round.no, "No"),
    makeChoiceButton(unsurePicture, "Unsure")
  );

  choices.hidden = false;
  placeChoices();
}

dot.addEventListener("click", () => {
  if (!choices.hidden || dot.disabled) return;

  answers = [];
  caregiverText = "";
  message.textContent = "";
  shareStatus.textContent = "";
  shareButton.hidden = true;
  showRound();
});

async function finishRound(picks) {
  const lines = rounds.map((round, index) => `${round.name}: ${picks[index]}`);
  caregiverText = ["Child’s nose check-in", ...lines].join("\n");

  try {
    if (!combinations) {
      const response = await fetch("./data/nose_combinations.json");
      if (!response.ok) throw new Error("Dataset unavailable");
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error("Invalid dataset");
      combinations = data;
    }

    const [runny, stuffy, itchy] = picks;
    const match = combinations.find(row =>
      row.runny === runny && row.stuffy === stuffy && row.itchy === itchy
    );

    if (match?.result) {
     caregiverText = `Child’s nose check-in\n${match.result}`;    } else {
      shareStatus.textContent = "Showing the answers. This combination has no summary yet.";
    }
  } catch {
    shareStatus.textContent = "Showing the answers. The dataset could not be loaded.";
  }

  message.style.whiteSpace = "pre-line";
  message.textContent = caregiverText;
  shareButton.hidden = false;
}

shareButton.addEventListener("click", async () => {
  if (!caregiverText) return;

  try {
    if (navigator.share) {
      await navigator.share({
        title: "Nose check-in",
        text: caregiverText
      });
    } else {
      await navigator.clipboard.writeText(caregiverText);
      shareStatus.textContent = "Copied. Paste the result into a message to your caregiver.";
    }
  } catch (error) {
    if (error.name !== "AbortError") {
      shareStatus.textContent = "You can select and copy the result above.";
    }
  }
});