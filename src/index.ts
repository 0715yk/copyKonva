import inpainter from "konva-image-maker";

// import inpainter from "./main";

const result = inpainter.createBaseKonvaStage({
  id: "app",
  width: 900,
  height: 700,
  backgroundColor: "skyblue",
});

inpainter.createDrawingCanvas({ color: "#ffffff", strokeWidth: 60 });

if (result !== null) {
  const imageInputElement = document.querySelector(
    "#imageInput"
  ) as HTMLInputElement;
  const canvasBtnElement = document.querySelector(
    "#canvasBtn"
  ) as HTMLButtonElement;

  if (canvasBtnElement !== null && imageInputElement !== null) {
    canvasBtnElement.addEventListener("click", function () {
      if (imageInputElement.files !== null) {
        const file = imageInputElement.files[0];
        const reader = new FileReader();
        const img = new Image() as HTMLImageElement;

        reader.readAsDataURL(file);
        reader.onload = (e) => {
          if (img !== null && e?.target !== null) {
            inpainter.addImageLayer(e.target.result as string);
          }
        };
      }
    });
  }

  const mergeBtnElement = document.querySelector(
    "#mergeBtn"
  ) as HTMLButtonElement;

  mergeBtnElement.addEventListener("click", function () {
    const mergedImageElement = document.querySelector(
      "#merged_image"
    ) as HTMLImageElement;
    const url = inpainter.canvasToDataUrl("image");
    mergedImageElement.src = url;
    mergedImageElement.style.border = "1px solid black";
  });

  const bringToFrontBtnElement = document.querySelector(
    "#bringToFrontBtn"
  ) as HTMLButtonElement;

  bringToFrontBtnElement.addEventListener("click", function () {
    inpainter.bringToFront();
  });

  const bringForwardBtnElement = document.querySelector(
    "#bringForwardBtn"
  ) as HTMLButtonElement;

  bringForwardBtnElement.addEventListener("click", function () {
    inpainter.bringForward();
  });
  const bringToBackBtnElement = document.querySelector(
    "#sendToBackBtn"
  ) as HTMLButtonElement;

  bringToBackBtnElement.addEventListener("click", function () {
    inpainter.bringBack();
  });

  const sendBackwardBtnElement = document.querySelector(
    "#sendBackwardBtn"
  ) as HTMLButtonElement;

  sendBackwardBtnElement.addEventListener("click", function () {
    inpainter.bringToBackward();
  });

  const getBlobBtnElement = document.querySelector(
    "#getBlobBtn"
  ) as HTMLButtonElement;

  getBlobBtnElement.addEventListener("click", function () {
    const response = inpainter.imageCanvasToBlob();
    console.log(response);
  });

  const getMaskingBlobBtnElement = document.querySelector(
    "#getMaskingBlobBtn"
  ) as HTMLButtonElement;

  getMaskingBlobBtnElement.addEventListener("click", function () {
    const response = inpainter.drawingCanvasToBlob();
    console.log(response);
  });

  const maskingBtnElement = document.querySelector(
    "#maskingBtn"
  ) as HTMLButtonElement;

  maskingBtnElement.addEventListener("click", function () {
    const nowMode = inpainter.activateDrawingMode();
    if (nowMode) {
      maskingBtnElement.style.background = "green";
      maskingBtnElement.textContent = "masking mode status : on";
    } else {
      maskingBtnElement.style.background = "red";
      maskingBtnElement.textContent = "masking mode status : off";
    }
  });

  const pixelInput = document.querySelector("#pixelInput") as HTMLInputElement;
  pixelInput.addEventListener("change", function () {
    inpainter.setStrokeWidth(parseInt(pixelInput.value));
  });

  const mergeMaskingBtnElement = document.querySelector(
    "#mergeMaskingBtn"
  ) as HTMLButtonElement;

  mergeMaskingBtnElement.addEventListener("click", function () {
    const mergedImageElement = document.querySelector(
      "#merged_masked_image"
    ) as HTMLImageElement;
    const url = inpainter.canvasToDataUrl("mask");
    mergedImageElement.src = url;
    mergedImageElement.style.border = "1px solid black";
  });

  // Drawing functions

  const select = document.querySelector("#selection");

  if (select !== null) {
    select.addEventListener("change", function (e) {
      const mode = (e.target as HTMLTextAreaElement).value;
      inpainter.setDrawingMode(mode);
    });
  }

  const canvasBtn2Element = document.querySelector(
    "#canvasBtn2"
  ) as HTMLButtonElement;

  canvasBtn2Element.addEventListener("click", function () {
    inpainter.deleteImage();
  });
}
const colorSelect = document.querySelector("#colorSelection");

if (colorSelect !== null) {
  colorSelect.addEventListener("change", function (e) {
    const color = (e.target as HTMLTextAreaElement).value;
    inpainter.setStrokeColor(color);
  });
}
