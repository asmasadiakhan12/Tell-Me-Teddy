const cameraButton = document.querySelector("#camera-toggle");
const preview = document.querySelector("#camera-preview");
const cameraStatus = document.querySelector("#camera-status");

function stopCamera() {
  const stream = preview.srcObject;

  if (stream) {
    for (const track of stream.getTracks()) {
      track.stop();
    }
  }

  preview.srcObject = null;
  preview.hidden = true;
  cameraButton.textContent = "📷 Say hi";
  cameraStatus.textContent = "";
}

cameraButton.addEventListener("click", async () => {
  if (preview.srcObject) {
    stopCamera();
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    cameraStatus.textContent = "Open this page on localhost or HTTPS to use the camera.";
    return;
  }

  cameraButton.disabled = true;
  cameraStatus.textContent = "Opening the camera…";

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false
    });

    preview.srcObject = stream;
    preview.hidden = false;
    await preview.play();
    cameraButton.textContent = "Turn camera off";
  } catch (error) {
    stopCamera();

    if (error.name === "NotAllowedError") {
      cameraStatus.textContent =
        "Camera access is blocked. Allow camera access for this page, then click Say hi again.";
    } else if (error.name === "NotFoundError") {
      cameraStatus.textContent = "No camera was found. Connect a camera and try again.";
    } else {
      cameraStatus.textContent = `Couldn’t open the camera (${error.name}).`;
    }
  } finally {
    cameraButton.disabled = false;
  }
});

window.addEventListener("pagehide", stopCamera);