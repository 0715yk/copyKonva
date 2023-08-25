// import inpainter from "konva-image-maker";

import inpainter from "./main";

// inpainter.createBaseKonvaStage({
//   id: "app",
//   width: 900,
//   height: 700,
//   backgroundColor: "skyblue",
// });

// inpainter.createDrawingCanvas({ color: "#ffffff", strokeWidth: 60 });

if (true) {
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
            // inpainter.addImageLayer(e.target.result as string);
            inpainter.createImagePrompt2({
              id: "app",
              src: e.target.result as string,
            });
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
    // const url = inpainter.canvasToDataUrl("image");
    const url = inpainter.getUrl();
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
    // const url = inpainter.canvasToDataUrl("mask");
    const url = inpainter.getUrl2();
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

const spanElement = document.querySelector("#zoom");
document.body.addEventListener("wheel", function () {
  if (spanElement !== null) {
    spanElement.textContent = String(inpainter.getZoomScale() ?? 0);
  }
});

const imageSizeSelect = document.getElementById("image_size_select");
imageSizeSelect?.addEventListener("change", function (e) {
  const size = (e.target as HTMLTextAreaElement).value;
  const [x, y] = size.split("_");
  inpainter.centerCropDrawingCanvas(parseInt(x), parseInt(y));
});

// Konva.Image.fromURL(
//   'https://konvajs.org/assets/darth-vader.jpg',
//   (img) => {
//     img.setAttrs({
//       width: 300,
//       height: 100,
//       x: 80,
//       y: 100,
//       name: 'image',
//       draggable: true,
//     });
//     layer.add(img);
//     // apply default left-top crop
//     applyCrop('center-middle');

//     const tr = new Konva.Transformer({
//       nodes: [img],
//       keepRatio: false,
//       boundBoxFunc: (oldBox, newBox) => {
//         if (newBox.width < 10 || newBox.height < 10) {
//           return oldBox;
//         }
//         return newBox;
//       },
//     });

//     layer.add(tr);

//     img.on('transform', () => {
//       // reset scale on transform
//       img.setAttrs({
//         scaleX: 1,
//         scaleY: 1,
//         width: img.width() * img.scaleX(),
//         height: img.height() * img.scaleY(),
//       });
//       applyCrop(img.getAttr('lastCropUsed'));
//     });
//   }
// );

// document.querySelector('#clip').onchange = (e) => {
//   applyCrop(e.target.value);
// };
