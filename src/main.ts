import { fabric } from "fabric";
import Konva from "konva";
import { Group } from "konva/lib/Group";
import { Shape, ShapeConfig } from "konva/lib/Shape";
import { Stage } from "konva/lib/Stage";
import { Transformer } from "konva/lib/shapes/Transformer";

const inpainter = (function () {
  let imageStackCanvas = null as null | fabric.Canvas;
  let drawingCanvas = {
    context: null as null | CanvasRenderingContext2D,
    canvas: null as null | HTMLCanvasElement,
    color: null as null | string,
    strokeWidth: null as null | number,
  };
  let zoomSize = 1;
  let selectedImage = null as null | Konva.Group;
  let konvaStage = null as null | Konva.Stage;
  let imageLayer = null as null | Konva.Layer;

  let trImageArr: Transformer[] = [];
  let drawingLayer = null as null | Konva.Layer;
  let drawingModeOn = false;
  let drawingMode = "brush";

  let isPaint = false;
  let lineGroup = null as null | Konva.Group;
  let lastLine = null as null | Konva.Line;
  let imageId = 0;

  let undoStack = [] as { stage: string; src: string; name: string }[];

  let redoStack = [] as string[];

  return {
    regenerageImageLayer(src: string) {
      if (konvaStage !== null && imageLayer !== null) {
        const imageObj = new Image();
        imageObj.src = src;

        imageObj.onload = function () {
          if (konvaStage === null || imageLayer === null) return;
          const image = new Konva.Image({
            image: imageObj,
            width: imageObj.width,
            height: imageObj.height,
            x: 0,
            y: 0,
            draggable: true,
            id: `${imageId}`,
          });

          const trImageGroup = new Konva.Group({
            name: "trImageGroup",
          });

          // const tr = addNewTransformerFunction(image);
          // trImageGroup.add(image, tr);
          // imageGroup.add(trImageGroup);
          // imageLayer.add(imageGroup);
          // konvaStage.add(imageLayer);

          // if (drawingLayer !== null) drawingLayer?.moveToTop();
          // image.on("mousedown touchstart", function (e) {
          //   e.cancelBubble = true;
          //   if (imageLayer !== null) {
          //     detachTransformer(image);
          //     selectedImage = trImageGroup;
          //     imageLayer.draw();
          //   }
          // });

          // image.on("mouseover", function () {
          //   document.body.style.cursor = "pointer";
          // });

          // image.on("mouseout", function () {
          //   document.body.style.cursor = "default";
          // });
        };
      }
    },
    saveState(object: string, src: string) {
      if (konvaStage !== null) {
        undoStack.push({ stage: konvaStage.toJSON(), name: object, src: src });
      }
    },
    undo() {
      if (undoStack.length > 0) {
        const state = undoStack.pop();
        if (state !== undefined) {
          // redoStack.push(state);
          const lastAction = undoStack[undoStack.length - 1];
          const stage = Konva.Node.create(lastAction.stage, "app");
          if (stage.children.length !== 0) {
            stage.children.forEach((el: Konva.Layer) => {
              const copyChildren = el.children?.slice();
              el.destroyChildren();
              copyChildren?.forEach((_image) => {
                this.regenerageImageLayer(lastAction.src);
              });
            });
          }
        }
      }
    },
    redo() {
      if (redoStack.length > 0) {
        const state = redoStack.pop();
        if (state !== undefined) {
        }
      }
    },

    detachAllTransformer() {
      if (trImageArr !== null) {
        trImageArr.forEach((tr) => {
          tr?.detach();
        });
      }
    },
    createBaseKonvaStage({
      id,
      width,
      height,
      backgroundColor,
    }: {
      id: string;
      width: number;
      height: number;
      backgroundColor: string;
    }) {
      try {
        konvaStage = new Konva.Stage({
          container: id,
          width,
          height,
        });
        konvaStage.container().style.backgroundColor = backgroundColor;
        konvaStage.container().style.width = `${width}px`;
        konvaStage.container().style.height = `${height}px`;
        konvaStage.container().style.border = "1px solid black";

        konvaStage.on("mousedown", (e) => {
          if (e.target.getClassName() === "Stage" && imageLayer !== null) {
            this.detachAllTransformer();
            selectedImage = null;
            imageLayer.draw();
          }
        });
        const scaleBy = 1.01;
        konvaStage.on("wheel", (e) => {
          // stop default scrolling
          e.evt.preventDefault();
          if (konvaStage === null) return;
          const oldScale = konvaStage.scaleX();
          const pointer = konvaStage.getPointerPosition();
          if (pointer === null) return;
          const mousePointTo = {
            x: (pointer.x - konvaStage.x()) / oldScale,
            y: (pointer.y - konvaStage.y()) / oldScale,
          };

          // how to scale? Zoom in? Or zoom out?
          let direction = e.evt.deltaY > 0 ? 1 : -1;

          // when we zoom on trackpad, e.evt.ctrlKey is true
          // in that case lets revert direction
          if (e.evt.ctrlKey) {
            direction = -direction;
          }

          const newScale =
            direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

          konvaStage.scale({ x: newScale, y: newScale });

          const newPos = {
            x: pointer.x - mousePointTo.x * newScale,
            y: pointer.y - mousePointTo.y * newScale,
          };
          konvaStage.position(newPos);
        });
        this.saveState("none", "none");
        return konvaStage;
      } catch (e) {
        console.error(e);
        return null;
      }
    },
    addNewTransformerNode(node: Konva.Node, id: string) {
      const tr = new Konva.Transformer({ id });
      tr.nodes([node]);
      trImageArr.push(tr);
      tr.detach();
      return tr;
    },
    detachTransformer(imgNode: Konva.Shape | Stage) {
      if (trImageArr !== null) {
        trImageArr.forEach((tr) => {
          if (tr.id() !== imgNode.id()) {
            tr.detach();
          } else {
            tr.nodes([imgNode]);
          }
        });
      }
    },
    getUniqueId(): string {
      return imageId++ + "";
    },

    addImageLayer(src: string) {
      const imageId = this.getUniqueId();
      const addNewTransformerFunction = this.addNewTransformerNode;
      const detachTransformer = this.detachTransformer;
      if (konvaStage !== null) {
        if (imageLayer === null) {
          imageLayer = new Konva.Layer();
          konvaStage.add(imageLayer);
        }

        const imageObj = new Image();
        imageObj.src = src;
        const saveState = this.saveState;
        imageObj.onload = function () {
          if (konvaStage === null || imageLayer === null) return;

          const image = new Konva.Image({
            image: imageObj,
            width: imageObj.width,
            height: imageObj.height,
            x: 0,
            y: 0,
            draggable: true,
            id: imageId,
          });

          const trImageGroup = new Konva.Group({
            name: "trImageGroup",
          });

          const tr = addNewTransformerFunction(image, imageId);
          trImageGroup.add(image, tr);

          imageLayer.add(trImageGroup);

          if (drawingLayer !== null) drawingLayer?.moveToTop();
          image.on("mousedown touchstart", function (e) {
            e.cancelBubble = true;
            if (imageLayer !== null) {
              detachTransformer(image);
              selectedImage = trImageGroup;
              imageLayer.draw();
            }
          });

          image.on("mouseover", function () {
            document.body.style.cursor = "pointer";
          });

          image.on("mouseout", function () {
            document.body.style.cursor = "default";
          });
          saveState(image.name(), src);
        };
      }
    },
    bringForward() {
      if (selectedImage !== null) {
        selectedImage.moveUp();
      }
    },
    bringToFront() {
      if (selectedImage !== null) {
        selectedImage.moveToTop();
      }
    },
    bringBack() {
      if (selectedImage !== null) {
        selectedImage.moveToBottom();
      }
    },
    bringToBackward() {
      if (selectedImage !== null) {
        selectedImage.moveDown();
      }
    },
    deleteImage() {
      if (selectedImage !== null) {
        selectedImage.destroy();
      }
    },
    isDrawingModeOn() {
      return drawingModeOn;
    },

    createDrawingCanvas({
      color,
      strokeWidth,
    }: {
      color: string;
      strokeWidth: number;
    }) {
      if (lineGroup === null) {
        lineGroup = new Konva.Group({ name: "lineGroup", draggable: false });
      }
      if (konvaStage === null) return;
      drawingLayer = new Konva.Layer();
      konvaStage.add(drawingLayer);
      konvaStage.on("mousedown", function () {
        if (konvaStage === null || !drawingModeOn) return;
        isPaint = true;
        const pos = konvaStage.getPointerPosition();

        lastLine = new Konva.Line({
          stroke: drawingCanvas.color ?? color,
          strokeWidth: drawingCanvas.strokeWidth ?? strokeWidth,
          globalCompositeOperation:
            drawingMode === "brush" ? "source-over" : "destination-out",
          lineCap: "round",
          lineJoin: "round",
          points: [pos?.x ?? 0, pos?.y ?? 0, pos?.x ?? 0, pos?.y ?? 0],
        });

        if (lineGroup !== null && drawingLayer !== null) {
          lineGroup.add(lastLine);
          drawingLayer.add(lineGroup);
        }
      });

      konvaStage.on("mouseup", function () {
        isPaint = false;
      });

      // and core function - drawing
      konvaStage.on("mousemove", function (e) {
        if (!isPaint || lastLine === null || konvaStage === null) {
          return;
        }

        // prevent scrolling on touch devices
        e.evt.preventDefault();

        const pos = konvaStage.getPointerPosition();

        const newPoints = lastLine.points().concat([pos?.x ?? 0, pos?.y ?? 0]);
        lastLine.points(newPoints);
      });
    },
    activateDrawingMode() {
      if (!drawingModeOn) {
        imageLayer?.listening(false);
        lineGroup?.show();
        drawingLayer?.moveToTop();
        this.detachAllTransformer();
      } else {
        imageLayer?.listening(true);
        lineGroup?.hide();
      }

      drawingModeOn = !drawingModeOn;
    },
    setDrawingMode(mode: string) {
      drawingMode = mode;
    },
    setStrokeWidth(width: number) {
      drawingCanvas.strokeWidth = width;
    },
    setStrokeColor(color: string) {
      drawingCanvas.color = color;
    },
    canvasToDataUrl(type: string) {
      if (type === "image") {
        if (imageLayer !== null && konvaStage !== null) {
          if (selectedImage !== null) {
            if (selectedImage.children) {
              const tr = selectedImage.children[1] as Transformer;
              const image = selectedImage.children[0] as Konva.Image;
              tr.detach();

              const pngURL = imageLayer.toDataURL();
              tr.nodes([image]);
              return pngURL;
            } else {
              return "";
            }
          } else {
            const pngURL = imageLayer.toDataURL();
            return pngURL;
          }
        } else {
          return "";
        }
      } else if (type === "mask") {
        if (konvaStage === null) return "";
        // 가상의 div element를 만들어서 새로운 konva stage에 바인딩시켜준다.
        const divElement = document.createElement("div");
        divElement.style.display = "none";
        divElement.id = "$#%-masking-container-of-inpainter-$#";
        document.body.appendChild(divElement);

        let newKonvaStage = new Konva.Stage({
          container: "$#%-masking-container-of-inpainter-$#",
          width: konvaStage.toCanvas().width,
          height: konvaStage.toCanvas().height,
        }) as Konva.Stage | null;
        if (!lineGroup || !newKonvaStage) return "";

        newKonvaStage.container().style.backgroundColor = "black";
        newKonvaStage.container().style.width = `${900}px`;
        newKonvaStage.container().style.height = `${700}px`;

        // 새로 만든 Konva Stage에 마스킹한 부분을 레이어로 쌓고, canvas로 컨버팅해준다.
        const layer = new Konva.Layer();
        layer.add(lineGroup.clone());
        newKonvaStage.add(layer);
        const drawingCanvas = newKonvaStage.toCanvas();

        newKonvaStage = null;
        divElement.remove();

        // 캔버스로 컨버팅을 마쳤으면 anti-aliasing을 모든 색을 흰색, 검정색 조합으로 바꿔주는 방향으로 해결한다.
        if (drawingCanvas !== undefined) {
          const context = drawingCanvas.getContext("2d");
          if (context !== null) {
            context.globalCompositeOperation = "destination-over";
            context.fillStyle = "black";
            context.fillRect(0, 0, drawingCanvas.width, drawingCanvas.height);
            context.drawImage(drawingCanvas, 0, 0);

            const imgData = context.getImageData(
              0,
              0,
              drawingCanvas.width,
              drawingCanvas.height
            );

            for (let i = 0; i < imgData.data.length; i += 4) {
              const count =
                imgData.data[i] + imgData.data[i + 1] + imgData.data[i + 2];
              let colour = 0;
              if (count > 383) colour = 255;

              imgData.data[i] = colour;
              imgData.data[i + 1] = colour;
              imgData.data[i + 2] = colour;
              imgData.data[i + 3] = 255;
            }

            context.putImageData(imgData, 0, 0);
            const pngURL = drawingCanvas.toDataURL();

            return pngURL;
          } else {
            return "";
          }
        } else {
          return "";
        }
      } else {
        return "";
      }
    },
    dataURItoBlob(dataURI: string) {
      const byteString = window.atob(dataURI.split(",")[1]);
      const mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }

      const bb = new Blob([ab], { type: mimeString });
      return bb;
    },
    imageCanvasToBlob(): null | Blob {
      const dataURI = this.canvasToDataUrl("image");
      if (dataURI === "") return null;

      const blob = this.dataURItoBlob(dataURI);
      return blob;
    },
    drawingCanvasToBlob(): null | Blob {
      const dataURI = this.canvasToDataUrl("mask");
      if (dataURI === "") return null;
      const blob = this.dataURItoBlob(dataURI);
      return blob;
    },
    controlZoom(flag: string) {
      if (imageStackCanvas && drawingCanvas.context) {
        if (flag === "+") {
          zoomSize += 0.06;
          imageStackCanvas.setZoom(zoomSize);
          drawingCanvas.context.scale(zoomSize, zoomSize);
        } else if (flag === "-") {
          zoomSize -= 0.06;
          imageStackCanvas.setZoom(zoomSize);
          drawingCanvas.context.scale(zoomSize, zoomSize);
        }
      }
    },
  };
})();

export default inpainter;

// - zoom in & zoom out
// - 마우스 커서 동그랗게
// - 어느 순간부터 brush 커서 위치와 실제로 stroke가 그어지는 지점이 안맞음
// - masking 껐다 켰다 할 때 z-indexing
// - 이미지 transformer 껐다 켰다하기

// 1. bounding box style customizing 가능한지 + grid & dot를 캔버스에 그릴 수 있는지(그 그리드에 object가 들어맞는? 마그네틱 기능? - 우선순위 낮긴함)
// 2. zoom in/out
// 3. undo / redo
// 4. inifinity canvas
