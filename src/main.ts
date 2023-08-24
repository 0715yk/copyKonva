import Konva from "konva";
import { Transformer } from "konva/lib/shapes/Transformer";
import { getDrawCursor, dataURItoBlob } from "./libs";

const inpainter = (function () {
  let drawingCanvas = {
    color: null as null | string,
    strokeWidth: null as null | number,
  };
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

  let canvasInfo = {
    width: null as null | number,
    height: null as null | number,
  };

  let newZoomScale = null as null | number;
  let desiredSize = {
    desiredWidth: 512 as number,
    desiredHeight: 512 as number,
  };

  let imagePromptStage = null as null | Konva.Stage;
  let imagePromptLayer = null as null | Konva.Layer;
  let imagePromptImage = null as null | Konva.Image;
  let imgUrl = "";
  return {
    addItem(id: string, imgUrl: string) {
      const img = new Image();
      img.onload = () => {
        const { desiredWidth, desiredHeight } = desiredSize;
        if (desiredWidth === null || desiredHeight === null) return;
        const { width, height } = img;
        const scaleX = desiredWidth / width;
        const scaleY = desiredHeight / height;
        const newImg = new Konva.Image({
          width,
          height,
          image: img,
          scaleX,
          scaleY,
          draggable: false,
        });

        const imagePromptStage = new Konva.Stage({
          container: id,

          width: desiredWidth,
          height: desiredHeight,
        });
        const imagePromptLayer = new Konva.Layer();
        imagePromptStage.add(imagePromptLayer);
        imagePromptLayer.add(newImg);
        imagePromptLayer.draw();
      };
      img.src = imgUrl;
    },
    toUrl(imageWidth: number, imageHeight: number) {
      if (imagePromptStage === null) return "";
      // 가상의 div element를 만들어서 새로운 konva stage에 바인딩시켜준다.
      const divElement = document.createElement("div");
      divElement.style.display = "none";
      divElement.id = "$#%-masking-container-of-inpainter-$#";
      document.body.appendChild(divElement);

      let newKonvaStage = new Konva.Stage({
        container: "$#%-masking-container-of-inpainter-$#",
        width: imageWidth,
        height: imagePromptStage.toCanvas().height,
      }) as Konva.Stage | null;
      if (!lineGroup || !newKonvaStage) return "";

      newKonvaStage.container().style.backgroundColor = "black";
      newKonvaStage.container().style.width = `${canvasInfo.width}px`;
      newKonvaStage.container().style.height = `${canvasInfo.height}px`;

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
    },
    // scaleToFit(img) {
    //   // get the scale
    //   if (!imagePromptStage) return;
    //   const newcanvas = document.createElement("canvas");
    //   const context = newcanvas.getContext("2d");
    //   const canvas = imagePromptStage?.toCanvas();
    //   var scale = Math.min(
    //     canvas.width / img.width,
    //     canvas.height / img.height
    //   );
    //   // get the top left position of the image
    //   var x = canvas.width / 2 - (img.width / 2) * scale;
    //   var y = canvas.height / 2 - (img.height / 2) * scale;
    //   context?.drawImage(img, x, y, img.width * scale, img.height * scale);
    // },

    createImagePrompt2({ id, src }: { id: string; src: string }) {
      try {
        const imageObj = new Image();

        let image = null as null | Konva.Image;

        imageObj.onload = () => {
          const { width: imageWidth, height: imageHeight } = imageObj;
          const { desiredWidth, desiredHeight } = desiredSize;
          const scale = Math.min(
            desiredWidth / imageWidth,
            desiredHeight / imageHeight
          );

          const x = desiredWidth / 2 - (imageWidth / 2) * scale;
          const y = desiredHeight / 2 - (imageHeight / 2) * scale;
          const w = imageWidth * scale;
          const h = imageHeight * scale;
          // let w: number,
          //   h: number,
          //   x = 0,
          //   y = 0;
          // if (desiredWidth === null || desiredHeight === null) return;

          // const inputRatio = desiredWidth / desiredHeight;
          // const imageRatio = imageWidth / imageHeight;
          // if (imageRatio > inputRatio) {
          //   w = (desiredHeight * imageWidth) / imageHeight;
          //   h = desiredHeight;
          //   x = (desiredWidth - w) / 2;
          // } else if (imageRatio < inputRatio) {
          //   w = desiredWidth;
          //   h = (desiredWidth * imageHeight) / imageWidth;
          //   y = (desiredHeight - h) / 2;
          // } else {
          //   w = desiredWidth;
          //   h = desiredHeight;
          // }
          // console.log(
          //   imageWidth,
          //   imageHeight,
          //   desiredWidth,
          //   desiredHeight,
          //   w,
          //   h,
          //   x,
          //   y
          // );

          if (
            imagePromptStage === null ||
            imagePromptLayer === null ||
            imagePromptImage == null ||
            lineGroup === null
          ) {
            imagePromptStage = new Konva.Stage({
              container: id,
              x,
              y,
              width: desiredWidth,
              height: desiredHeight,
            });

            imagePromptLayer = new Konva.Layer();
            imagePromptStage.add(imagePromptLayer);
            imagePromptImage = new Konva.Image({
              image: imageObj,
              x,
              y,
              width: w,
              height: h,
              draggable: false,
            });

            imagePromptLayer.add(imagePromptImage);
            image = imagePromptImage;
            lineGroup = new Konva.Group({
              name: "lineGroup",
              draggable: false,
              width: imageWidth,
              height: imageHeight,
              x: 0,
              y: 0,
            });
            imagePromptLayer.add(lineGroup);
            imagePromptStage.on("mousedown", () => {
              if (imagePromptStage === null) return;
              isPaint = true;
              const pos = this.getRelativePointerPosition(imagePromptStage);

              lastLine = new Konva.Line({
                stroke: drawingCanvas.color ?? "#FFFFFF",
                strokeWidth: drawingCanvas.strokeWidth ?? 15,
                globalCompositeOperation:
                  drawingMode === "brush" ? "source-over" : "destination-out",
                lineCap: "round",
                lineJoin: "round",
                points: [pos?.x ?? 0, pos?.y ?? 0, pos?.x ?? 0, pos?.y ?? 0],
              });

              if (lineGroup !== null) {
                lineGroup.add(lastLine);
              }
            });
            imagePromptStage.on("mousemove", (e) => {
              if (!isPaint || lastLine === null || imagePromptStage === null) {
                return;
              }

              e.evt.preventDefault();
              if (imagePromptStage !== null) {
                const pos = this.getRelativePointerPosition(imagePromptStage);

                const newPoints = lastLine
                  .points()
                  .concat([pos?.x ?? 0, pos?.y ?? 0]);
                lastLine.points(newPoints);
              }
            });
            imagePromptStage.on("mouseup", function () {
              isPaint = false;
            });
            imagePromptStage.on("mouseleave", () => {
              isPaint = false;
            });
          } else {
            imagePromptImage.image(imageObj);
            imagePromptImage.width(w);
            imagePromptImage.height(h);
            imagePromptImage.width(desiredWidth);
            imagePromptStage.height(desiredHeight);

            // lineGroup.width(w);
            // lineGroup.height(h);

            // const imgSrc = this.toUrl(imageWidth, imageHeight);

            // imgUrl = imgSrc;
            // this.canvasToDataUrl("mask");
            // const canvas = document.createElement("canvas");
            // canvas.width = desiredWidth;
            // canvas.height = desiredHeight;
            // const context = canvas.getContext("2d");

            // img.onload = () => {
            //   const { width: imageWidth, height: imageHeight } = img;
            //   const inputRatio = desiredWidth / desiredHeight;
            //   const imageRatio = imageWidth / imageHeight;

            //   let w,
            //     h,
            //     x = 0,
            //     y = 0;

            //   if (imageRatio > inputRatio) {
            //     w = (desiredHeight * imageWidth) / imageHeight;
            //     h = desiredHeight;
            //     x = (desiredWidth - w) / 2;
            //   } else if (imageRatio < inputRatio) {
            //     w = desiredWidth;
            //     h = (desiredWidth * imageHeight) / imageWidth;
            //     y = (desiredHeight - h) / 2;
            //   } else {
            //     w = desiredWidth;
            //     h = desiredHeight;
            //   }

            //   context?.drawImage(img, x, y, w, h);

            //   const resultImageUrl = canvas.toDataURL();

            //   const resultImg = new Image();
            //   resultImg.onload = () => {
            //     const newImage = new Konva.Image({
            //       image: resultImg,

            //       draggable: false,
            //     });
            //     imagePromptLayer?.add(newImage);
            //   };
            //   resultImg.src = resultImageUrl;
            // };
            // img.src = imgSrc;
          }

          // --------------------

          // if (lineGroup === null) {
          //   lineGroup = new Konva.Group({
          //     name: "lineGroup",
          //     draggable: false,
          //     width: w,
          //     height: h,
          //     x: 0,
          //     y: 0,
          //   });
          // } else {
          //   const imageLineGroupObj = lineGroup.toImage({
          //     callback(img) {
          //       const { width: imageWidth, height: imageHeight } = img;
          //       const { desiredWidth, desiredHeight } = desiredSize;
          //       let w,
          //         h,
          //         x = 0,
          //         y = 0;
          //       if (desiredWidth === null || desiredHeight === null) return;
          //       const inputRatio = desiredWidth / desiredHeight;
          //       const imageRatio = imageWidth / imageHeight;
          //       if (imageRatio > inputRatio) {
          //         w = (desiredHeight * imageWidth) / imageHeight;
          //         h = desiredHeight;
          //         x = (desiredWidth - w) / 2;
          //       } else if (imageRatio < inputRatio) {
          //         w = desiredWidth;
          //         h = (desiredWidth * imageHeight) / imageWidth;
          //         y = (desiredHeight - h) / 2;
          //       } else {
          //         w = desiredWidth;
          //         h = desiredHeight;
          //       }

          //       const lineGroupImage = new Konva.Image({
          //         image: img,
          //         width: w,
          //         height: h,
          //         x: 0,
          //         y: 0,
          //         draggable: false,
          //       });
          //       imagePromptLayer?.add(lineGroupImage);
          //     },
          //   });
          // }
          // lineGroup.width(w);
          // lineGroup.height(h);
          // lineGroup.x(x);
          // lineGroup.y(y);
          // imagePromptLayer.add(lineGroup);
          // imagePromptStage.draw();
          // drawingCanvas.color = "#FFFFFF";
          // drawingCanvas.strokeWidth = 15;

          // imagePromptStage.on("mousedown", () => {
          //   if (imagePromptStage === null) return;
          //   isPaint = true;
          //   const pos = this.getRelativePointerPosition(imagePromptStage);

          //   lastLine = new Konva.Line({
          //     stroke: drawingCanvas.color ?? "#FFFFFF",
          //     strokeWidth: drawingCanvas.strokeWidth ?? 15,
          //     globalCompositeOperation:
          //       drawingMode === "brush" ? "source-over" : "destination-out",
          //     lineCap: "round",
          //     lineJoin: "round",
          //     points: [pos?.x ?? 0, pos?.y ?? 0, pos?.x ?? 0, pos?.y ?? 0],
          //   });

          //   if (lineGroup !== null) {
          //     lineGroup.add(lastLine);
          //   }
          // });
          // imagePromptStage.on("mousemove", (e) => {
          //   if (!isPaint || lastLine === null || imagePromptStage === null) {
          //     return;
          //   }

          //   e.evt.preventDefault();
          //   if (imagePromptStage !== null) {
          //     const pos = this.getRelativePointerPosition(imagePromptStage);

          //     const newPoints = lastLine
          //       .points()
          //       .concat([pos?.x ?? 0, pos?.y ?? 0]);
          //     lastLine.points(newPoints);
          //   }
          // });
          // imagePromptStage.on("mouseup", function () {
          //   isPaint = false;
          // });
          // imagePromptStage.on("mouseleave", () => {
          //   isPaint = false;
          // });

          // -----------------
        };

        imageObj.src = src;
        return image;
      } catch (e) {
        console.error(e);
        return null;
      }
    },
    getUrl() {
      return imgUrl;
    },
    createImagePrompt({ id, src }: { id: string; src: string }) {
      try {
        const imageObj = new Image();

        let image = null as null | Konva.Image;

        imageObj.onload = () => {
          const { width: imageWidth, height: imageHeight } = imageObj;
          const { desiredWidth, desiredHeight } = desiredSize;
          let w,
            h,
            x = 0,
            y = 0;
          if (desiredWidth === null || desiredHeight === null) return;
          const inputRatio = desiredWidth / desiredHeight;
          const imageRatio = imageWidth / imageHeight;
          if (imageRatio > inputRatio) {
            w = (desiredHeight * imageWidth) / imageHeight;
            h = desiredHeight;
            x = (desiredWidth - w) / 2;
          } else if (imageRatio < inputRatio) {
            w = desiredWidth;
            h = (desiredWidth * imageHeight) / imageWidth;
            y = (desiredHeight - h) / 2;
          } else {
            w = desiredWidth;
            h = desiredHeight;
          }

          const imagePromptStage = new Konva.Stage({
            container: id,
            x,
            y,
            width: desiredWidth,
            height: desiredHeight,
          });
          const imagePromptLayer = new Konva.Layer();
          imagePromptStage.add(imagePromptLayer);

          const imagePrompImage = new Konva.Image({
            image: imageObj,
            width: w,
            height: h,
            x: 0,
            y: 0,
            draggable: false,
          });

          imagePromptLayer?.add(imagePrompImage);
          image = imagePrompImage;
          // --------------------

          if (lineGroup === null) {
            lineGroup = new Konva.Group({
              name: "lineGroup",
              draggable: false,
              width: w,
              height: h,
              x: 0,
              y: 0,
            });
          } else {
            const imageLineGroupObj = lineGroup.toImage({
              callback(img) {
                const { width: imageWidth, height: imageHeight } = img;
                const { desiredWidth, desiredHeight } = desiredSize;
                let w,
                  h,
                  x = 0,
                  y = 0;
                if (desiredWidth === null || desiredHeight === null) return;
                const inputRatio = desiredWidth / desiredHeight;
                const imageRatio = imageWidth / imageHeight;
                if (imageRatio > inputRatio) {
                  w = (desiredHeight * imageWidth) / imageHeight;
                  h = desiredHeight;
                  x = (desiredWidth - w) / 2;
                } else if (imageRatio < inputRatio) {
                  w = desiredWidth;
                  h = (desiredWidth * imageHeight) / imageWidth;
                  y = (desiredHeight - h) / 2;
                } else {
                  w = desiredWidth;
                  h = desiredHeight;
                }

                const lineGroupImage = new Konva.Image({
                  image: img,
                  width: w,
                  height: h,
                  x: 0,
                  y: 0,
                  draggable: false,
                });
                imagePromptLayer?.add(lineGroupImage);
              },
            });
          }
          lineGroup.width(w);
          lineGroup.height(h);
          lineGroup.x(x);
          lineGroup.y(y);
          imagePromptLayer.add(lineGroup);
          imagePromptStage.draw();
          drawingCanvas.color = "#FFFFFF";
          drawingCanvas.strokeWidth = 15;

          imagePromptStage.on("mousedown", () => {
            if (imagePromptStage === null) return;
            isPaint = true;
            const pos = this.getRelativePointerPosition(imagePromptStage);

            lastLine = new Konva.Line({
              stroke: drawingCanvas.color ?? "#FFFFFF",
              strokeWidth: drawingCanvas.strokeWidth ?? 15,
              globalCompositeOperation:
                drawingMode === "brush" ? "source-over" : "destination-out",
              lineCap: "round",
              lineJoin: "round",
              points: [pos?.x ?? 0, pos?.y ?? 0, pos?.x ?? 0, pos?.y ?? 0],
            });

            if (lineGroup !== null) {
              lineGroup.add(lastLine);
            }
          });
          imagePromptStage.on("mousemove", (e) => {
            if (!isPaint || lastLine === null || imagePromptStage === null) {
              return;
            }

            e.evt.preventDefault();
            if (imagePromptStage !== null) {
              const pos = this.getRelativePointerPosition(imagePromptStage);

              const newPoints = lastLine
                .points()
                .concat([pos?.x ?? 0, pos?.y ?? 0]);
              lastLine.points(newPoints);
            }
          });
          imagePromptStage.on("mouseup", function () {
            isPaint = false;
          });
          imagePromptStage.on("mouseleave", () => {
            isPaint = false;
          });

          // -----------------
        };
        imageObj.src = src;
        return image;
      } catch (e) {
        console.error(e);
        return null;
      }
    },
    /**
     * 이미지 레이어에 하나 이상의 이미지가 올라가 있는 상태에만 작동하는 함수입니다.
     * 모든 이미지에는 transformer(resizing, rotating 기능) 기능이 포함되는데, 이미지가 아닌 다른 부분을 눌렀을 때 잠시 모든 Transformer를 detach 해주는 함수입니다.
     * Konva.Stage가 아닌 영역에서 onClick 이벤트를 걸어서 해당 메서드를 써주면 좀 더 자연스러운 UX를 만들 수 있습니다.
     *
     * @alpha
     * @param
     * @returns 
     *
     * @example
     * ```typescript
    import inpainter from "konva-image-maker";

    document.body.addEventListener("click", function (e: MouseEvent) {
      if (e.target !== null) {
        const target = e.target as HTMLElement;

        if (target.parentElement.parentElement !== document.getElementById("app")) {
          inpainter.detachAllTransformer();
        }
      }
    });
     * ```
     */
    detachAllTransformer() {
      if (trImageArr !== null && imageLayer !== null) {
        trImageArr.forEach((tr) => {
          tr?.detach();
        });
        imageLayer.draw();
      }
    },
    /**
     * KonvaJS의 base가 되는 Stage(=Base Canvas)를 생성 및 리턴합니다. 관련 기능을 실행하기 위해 가장 먼저 실행해야 하는 함수입니다. 
     * 해당 모듈에는 하나의 Ca
     * 개발자가 작업을 할 때에 이 Stage 리턴값을 가지고 해야할 작업은 특별히 없습니다(직접 접근하기 보다는 모듈에서 제공하는 함수를 쓸 것을 권장합니다).
     * 만약 null 이 나왔을 경우(모듈 자체에 에러가 있는 경우) 분기처리를 하여 에러 처리를 하기 위한 용도로 리턴값을 만들어놨습니다.
     *
     * @alpha
     * @param canvasInfo - 생성할 Stage(Canvas)와 관련된 정보를 넣어줍니다. 
     * @returns 정상적으로 canvas가 생성됐다면 Konva.Stage 객체가 리턴되고, 아닌 경우 null이 리턴됩니다.
     *
     * @example
     * ```typescript
      import inpainter from "konva-image-maker";

      const stage = inpainter.createBaseKonvaStage({
        id: "app",
        width: 900,
        height: 700,
        backgroundColor: "skyblue",
      });
     * ```
     */
    createBaseKonvaStage({
      id,
      width,
      height,
      backgroundColor,
      zoomMinRatio = 0.04,
      zoomMaxRatio = 150,
    }: {
      id: string;
      width: number;
      height: number;
      backgroundColor: string;
      zoomMinRatio?: number;
      zoomMaxRatio?: number;
    }) {
      try {
        canvasInfo.width = width;
        canvasInfo.height = height;
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
          }
        });

        const scaleBy = 1.2;

        konvaStage.on("wheel", (e) => {
          if (konvaStage !== null) {
            e.evt.preventDefault();
            const oldScale = konvaStage.scaleX();

            const center = {
              x: konvaStage.width() / 2,
              y: konvaStage.height() / 2,
            };

            const relatedTo = {
              x: (center.x - konvaStage.x()) / oldScale,
              y: (center.y - konvaStage.y()) / oldScale,
            };

            const newScale =
              e.evt.deltaY > 0 ? oldScale * scaleBy : oldScale / scaleBy;

            if (newScale > zoomMaxRatio || newScale < zoomMinRatio) {
              return;
            }
            konvaStage.scale({
              x: newScale,
              y: newScale,
            });

            const newPos = {
              x: center.x - relatedTo.x * newScale,
              y: center.y - relatedTo.y * newScale,
            };

            konvaStage.position(newPos);
            konvaStage.batchDraw();
            newZoomScale = newScale;
          }
        });

        return konvaStage;
      } catch (e) {
        console.error(e);
        return null;
      }
    },
    /**
     * imgNode
     *
     * @alpha
     * @param imgNode - 파라미터로 넣어준 Konva.Image node를 제외한 모든 Image Node의 Transformer를 제거하고, 파라미터로 넣어준 노드에만 Transformer를 적용합니다(`addImageLayer`를 통해 Konva.Image node를 return 받을 수 있습니다).
     * @returns
     */
    detachTransformer(imgNode: Konva.Shape) {
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

    /**
     * 이미지를 업로드할 때 사용하는 메서드 입니다. 이미지를 업로드하는 로직을 작성해놓은 다음에 src 정보를 string 형태로 파라미터로 넣어주면 해당 src의 이미지가 Konva.Stage에 그려집니다.
     *
     * @alpha
     * @param src - Konva.Stage에 그려줄 이미지 src 값을 넣어줍니다.
     * @returns 정상적으로 image layer가 생성됐다면 Konva.Image 객체가 리턴되고, 아닌 경우 null이 리턴됩니다.
     *
     * @example
     * ```typescript
    const imageInputElement = document.querySelector(
      "#imageInput"
    ) as HTMLInputElement;
    const uploadBtnElement = document.querySelector(
      "#uploadBtn"
    ) as uploadBtnElement;

    if (uploadBtnElement !== null && imageInputElement !== null) {
      uploadBtnElement.addEventListener("click", function () {
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
     * ```
     */
    addImageLayer(src: string) {
      const uniqueId = imageId++ + "";
      if (konvaStage !== null) {
        try {
          if (imageLayer === null) {
            imageLayer = new Konva.Layer();
            konvaStage.add(imageLayer);
          }

          const imageObj = new Image();
          imageObj.src = src;

          let result = null;
          let image = null as null | Konva.Image;
          imageObj.onload = () => {
            if (konvaStage === null || imageLayer === null) return;
            const { width, height } = imageObj;

            image = new Konva.Image({
              image: imageObj,
              width: width,
              height: height,
              x: 0,
              y: 0,
              draggable: true,
              id: uniqueId,
            });

            const trImageGroup = new Konva.Group({
              name: "trImageGroup",
            });

            const tr = new Konva.Transformer({ id: uniqueId });
            trImageArr.push(tr);
            trImageGroup.add(image, tr);
            imageLayer.add(trImageGroup);

            if (drawingLayer !== null) drawingLayer?.moveToTop();

            this.detachTransformer(image);

            image.on("mousedown touchstart", (e) => {
              e.cancelBubble = true;
              if (imageLayer !== null && image !== null) {
                this.detachTransformer(image);
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
            selectedImage = trImageGroup;
            result = image;
          };

          return result;
        } catch (e) {
          return null;
        }
      } else {
        return null;
      }
    },
    /**
     * 현재 선택된 이미지 노드를 한 레벨 앞으로 이동시킵니다.
     *
     * @alpha
     * @param
     * @returns 
     *
     * @example
     * ```typescript
    import inpainter from "konva-image-maker";

    const bringForwardBtnElement = document.querySelector(
      "#bringForwardBtn"
    ) as HTMLButtonElement;

    bringForwardBtnElement.addEventListener("click", function () {
      inpainter.bringForward();
    });
     * ```
     */
    bringForward() {
      if (selectedImage !== null) {
        selectedImage.moveUp();
      }
    },
    /**
     * 현재 선택된 이미지 노드를 맨 위로 이동시킵니다.
     *
     * @alpha
     * @param
     * @returns 
     *
     * @example
     * ```typescript
    import inpainter from "konva-image-maker";

    const bringToFrontBtnElement = document.querySelector(
      "#bringToFrontBtn"
    ) as HTMLButtonElement;

    bringToFrontBtnElement.addEventListener("click", function () {
      inpainter.bringToFront();
    });
     * ```
     */
    bringToFront() {
      if (selectedImage !== null) {
        selectedImage.moveToTop();
      }
    },
    /**
     * 현재 선택된 이미지 노드를 한 맨 뒤로 이동시킵니다.
     *
     * @alpha
     * @param
     * @returns 
     *
     * @example
     * ```typescript
    import inpainter from "konva-image-maker";

    const bringToBackBtnElement = document.querySelector(
      "#sendToBackBtn"
    ) as HTMLButtonElement;

    bringToBackBtnElement.addEventListener("click", function () {
      inpainter.bringBack();
    });
     * ```
     */
    bringBack() {
      if (selectedImage !== null) {
        selectedImage.moveToBottom();
      }
    },
    /**
     * 현재 선택된 이미지 노드를 한 레벨 뒤로 이동시킵니다.
     *
     * @alpha
     * @param
     * @returns 
     *
     * @example
     * ```typescript
    import inpainter from "konva-image-maker";

    const sendBackwardBtnElement = document.querySelector(
      "#sendBackwardBtn"
    ) as HTMLButtonElement;

    sendBackwardBtnElement.addEventListener("click", function () {
      inpainter.bringToBackward();
    });
     * ```
     */
    bringToBackward() {
      if (selectedImage !== null) {
        selectedImage.moveDown();
      }
    },
    /**
     * 현재 선택된 이미지 노드를 제거합니다.
     *
     * @alpha
     * @param
     * @returns 
     *
     * @example
     * ```typescript
    import inpainter from "konva-image-maker";

    const canvasBtn2Element = document.querySelector(
      "#canvasBtn2"
    ) as HTMLButtonElement;

    canvasBtn2Element.addEventListener("click", function () {
      inpainter.deleteImage();
    });
     * ```
     */
    deleteImage() {
      if (selectedImage !== null) {
        selectedImage.destroy();
      }
    },
    /**
     * 마스킹 모드가 켜져있는지 아닌지를 리턴해주는 함수입니다.
     *
     * @alpha
     * @param
     * @returns 현재 masking 모드가 on 상태인지 off 상태인지를 리턴합니다(true/false)
     *
     */
    isDrawingModeOn() {
      return drawingModeOn;
    },
    getRelativePointerPosition(node: Konva.Stage) {
      // the function will return pointer position relative to the passed node
      const transform = node.getAbsoluteTransform().copy();
      // to detect relative position we need to invert transform
      transform.invert();

      // get pointer (say mouse or touch) position
      const pos = node.getStage().getPointerPosition();

      // now we find a relative point
      if (pos !== null) {
        return transform.point(pos);
      } else {
        return null;
      }
    },
    /**
     * masking canvas를 생성하는 함수입니다. 'createBaseKonvaStage' 메서드와 마찬가지로 사용하고자 했을 때, 초기에 생성을 해주고 시작해줘야 합니다.
     * 두번 실행할 시에는 기존의 Layer에 덮어씌워 집니다(= 2개 이상 생성이 불가능합니다).
     *
     * @alpha
     * @param canvasInfo - 초기 color 정보 및 strokeWidth 정보를 입력해줍니다.
     * @returns 정상적으로 생성 성공시 drawning Konva Layer가 리턴되고, 실패시 null 이 리턴됩니다.
     *
     * @example
     * ```typescript
    import inpainter from "konva-image-maker";

    inpainter.createDrawingCanvas({ color: "#ffffff", strokeWidth: 60 });
     * ```
     */
    createDrawingCanvas({
      color,
      strokeWidth,
    }: {
      color: string;
      strokeWidth: number;
    }) {
      try {
        if (konvaStage === null) return null;
        if (drawingLayer === null) {
          drawingLayer = new Konva.Layer();
          konvaStage.add(drawingLayer);
        }

        if (lineGroup === null && drawingLayer !== null) {
          lineGroup = new Konva.Group({ name: "lineGroup", draggable: false });
          drawingLayer.add(lineGroup);
        }

        drawingCanvas.color = color;
        drawingCanvas.strokeWidth = strokeWidth;
        konvaStage.on("mousedown", () => {
          if (konvaStage === null || !drawingModeOn) return;
          isPaint = true;
          const pos = this.getRelativePointerPosition(konvaStage);

          lastLine = new Konva.Line({
            stroke: drawingCanvas.color ?? color,
            strokeWidth: drawingCanvas.strokeWidth ?? strokeWidth,
            globalCompositeOperation:
              drawingMode === "brush" ? "source-over" : "destination-out",
            lineCap: "round",
            lineJoin: "round",
            points: [pos?.x ?? 0, pos?.y ?? 0, pos?.x ?? 0, pos?.y ?? 0],
          });

          if (lineGroup !== null) {
            lineGroup.add(lastLine);
          }
        });

        konvaStage.on("mouseup", function () {
          isPaint = false;
        });
        konvaStage.on("mouseleave", () => {
          isPaint = false;
        });

        konvaStage.on("mousemove", (e) => {
          if (!isPaint || lastLine === null || konvaStage === null) {
            return;
          }

          e.evt.preventDefault();
          if (konvaStage !== null) {
            const pos = this.getRelativePointerPosition(konvaStage);

            const newPoints = lastLine
              .points()
              .concat([pos?.x ?? 0, pos?.y ?? 0]);
            lastLine.points(newPoints);
          }
        });

        return drawingLayer;
      } catch (e) {
        console.error(e);
        return null;
      }
    },
    /**
     * 마스킹 모드를 on/off 해주는 함수 입니다.
     *
     * @alpha
     * @param
     * @returns 현재 masking 모드가 on 상태인지 off 상태인지를 리턴합니다(true/false)
     *
     * @example
     * ```typescript
    import inpainter from "konva-image-maker";

    const maskingBtnElement = document.querySelector(
      "#maskingBtn"
    ) as HTMLButtonElement;

    maskingBtnElement.addEventListener("click", function () {
      const nowModeOn = inpainter.activateDrawingMode();
      if (nowModeOn) {
        maskingBtnElement.style.background = "green";
        maskingBtnElement.textContent = "masking mode status : on";
      } else {
        maskingBtnElement.style.background = "red";
        maskingBtnElement.textContent = "masking mode status : off";
      }
    });
     * ```
     */
    activateDrawingMode() {
      if (!drawingModeOn && konvaStage !== null) {
        imageLayer?.listening(false);
        lineGroup?.show();
        drawingLayer?.moveToTop();
        this.detachAllTransformer();
        if (drawingCanvas.strokeWidth !== null && drawingCanvas.color !== null)
          konvaStage.container().style.cursor = getDrawCursor(
            drawingCanvas.strokeWidth,
            drawingMode === "eraser" ? "#044B94" : drawingCanvas.color
          );
      } else {
        if (
          drawingCanvas.strokeWidth !== null &&
          drawingCanvas.color !== null &&
          konvaStage !== null
        )
          konvaStage.container().style.cursor = "default";
        imageLayer?.listening(true);
        lineGroup?.hide();
      }

      drawingModeOn = !drawingModeOn;

      return drawingModeOn;
    },
    /**
     * masking mode 중에 brush 모드로 그릴지, eraser 모드로 지울지를 선택하는 함수입니다. 
     * 파라미터에 'brush', 'eraser' 값을 넣어줌으로써 사용할 수 있습니다.
     *
     * @alpha
     * @param mode - brush 모드를 할지, eraser 모드를 할지 선택하여 입력(두 개의 모드만 지원하며 다른 파라미터를 넣으면 동작하지 않습니다).
     * @returns 
     *
     * @example
     * ```typescript
    import inpainter from "konva-image-maker";

    const select = document.querySelector("#selection");

    if (select !== null) {
      select.addEventListener("change", function (e) {
        const mode = (e.target as HTMLTextAreaElement).value;
        inpainter.setDrawingMode(mode);
      });
    }
     * ```
     */
    setDrawingMode(mode: string) {
      drawingMode = mode;

      if (mode === "eraser") {
        if (
          konvaStage !== null &&
          drawingCanvas.color !== null &&
          drawingCanvas.strokeWidth !== null &&
          drawingModeOn
        ) {
          konvaStage.container().style.cursor = getDrawCursor(
            drawingCanvas.strokeWidth,
            "#044B94"
          );
        }
      } else if (mode === "brush") {
        if (
          konvaStage !== null &&
          drawingCanvas.color !== null &&
          drawingCanvas.strokeWidth !== null &&
          drawingModeOn
        ) {
          konvaStage.container().style.cursor = getDrawCursor(
            drawingCanvas.strokeWidth,
            drawingCanvas.color
          );
        }
      }
    },
    /**
     * masking mode의 brush 크기인 stroke width를 조절하는 함수입니다.
     * 파라미터에 width값을(number type) 넣어줌으로써 사용할 수 있습니다.
     *
     * @alpha
     * @param width - stroke width를 넣어줍니다.
     * @returns 
     *
     * @example
     * ```typescript
    import inpainter from "konva-image-maker";

    const pixelInput = document.querySelector("#pixelInput") as HTMLInputElement;
    
    pixelInput.addEventListener("change", function () {
      inpainter.setStrokeWidth(parseInt(pixelInput.value));
    });
     * ```
     */
    setStrokeWidth(width: number) {
      drawingCanvas.strokeWidth = width;
      if (
        konvaStage !== null &&
        drawingCanvas.color !== null &&
        drawingModeOn
      ) {
        konvaStage.container().style.cursor = getDrawCursor(
          width,
          drawingMode === "eraser" ? "#044B94" : drawingCanvas.color
        );
      }
    },
    /**
     * masking mode의 brush color를 조절하는 함수입니다(지우개 컬러는 조절 불가).
     * 파라미터에 color(string type) 넣어줌으로써 사용할 수 있습니다.
     *
     * @alpha
     * @param color - color 값을 넣어줍니다.
     * @returns 
     *
     * @example
     * ```typescript
    import inpainter from "konva-image-maker";

    const colorSelect = document.querySelector("#colorSelection");

    if (colorSelect !== null) {
      colorSelect.addEventListener("change", function (e) {
        const color = (e.target as HTMLTextAreaElement).value;
        inpainter.setStrokeColor(color);
      });
    }
     * ```
     */
    setStrokeColor(color: string) {
      drawingCanvas.color = color;

      if (
        konvaStage !== null &&
        drawingCanvas.strokeWidth !== null &&
        drawingModeOn
      ) {
        konvaStage.container().style.cursor = getDrawCursor(
          drawingCanvas.strokeWidth,
          drawingMode === "eraser" ? "#044B94" : color
        );
      }
    },
    /**
     * image layer or masking layer를 선택하여 파라미터에 입력해주면 이를 바탕으로 실제 Konva Layer를 url 형식의(string) 데이터로 리턴합니다.
     * 파라미터에 image or mask(string type) 타입을 정해서 넣어줌으로써 사용할 수 있습니다.
     *
     * @alpha
     * @param type - "image" or "mask" (다른 parameter는 동작하지 않고 ""를 리턴합니다.)
     * @returns 정상적으로 리턴되면 dataURL 값이 string으로 리턴되고, 실패시엔 "" 가 리턴됩니다.
     *
     * @example
     * ```typescript
    import inpainter from "konva-image-maker";

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
     * ```
     */
    canvasToDataUrl(type: string) {
      if (type === "image") {
        if (imageLayer !== null && konvaStage !== null) {
          if (selectedImage !== null) {
            if (selectedImage.children) {
              const tr = selectedImage.children[1] as Transformer;
              const image = selectedImage.children[0] as Konva.Image;
              tr.detach();

              const divElement = document.createElement("div");
              divElement.style.display = "none";
              divElement.id = "$#%-image-container-of-inpainter-$#";
              document.body.appendChild(divElement);

              let newKonvaStage = new Konva.Stage({
                container: "$#%-image-container-of-inpainter-$#",
                width: konvaStage.toCanvas().width,
                height: konvaStage.toCanvas().height,
              }) as Konva.Stage | null;
              if (!newKonvaStage) return "";

              newKonvaStage.container().style.backgroundColor = "black";
              newKonvaStage.container().style.width = `${canvasInfo.width}px`;
              newKonvaStage.container().style.height = `${canvasInfo.height}px`;

              // 새로 만든 Konva Stage에 마스킹한 부분을 레이어로 쌓고, canvas로 컨버팅해준다.

              newKonvaStage.add(imageLayer.clone());
              const imageCanvas = newKonvaStage.toCanvas();

              newKonvaStage = null;
              divElement.remove();

              const pngURL = imageCanvas.toDataURL();
              tr.nodes([image]);
              return pngURL;
            } else {
              return "";
            }
          } else {
            const divElement = document.createElement("div");
            divElement.style.display = "none";
            divElement.id = "$#%-image-container-of-inpainter-$#";
            document.body.appendChild(divElement);

            let newKonvaStage = new Konva.Stage({
              container: "$#%-image-container-of-inpainter-$#",
              width: konvaStage.toCanvas().width,
              height: konvaStage.toCanvas().height,
            }) as Konva.Stage | null;
            if (!newKonvaStage) return "";

            newKonvaStage.container().style.backgroundColor = "black";
            newKonvaStage.container().style.width = `${canvasInfo.width}px`;
            newKonvaStage.container().style.height = `${canvasInfo.height}px`;

            // 새로 만든 Konva Stage에 마스킹한 부분을 레이어로 쌓고, canvas로 컨버팅해준다.
            newKonvaStage.add(imageLayer.clone());
            const imageCanvas = newKonvaStage.toCanvas();

            newKonvaStage = null;
            divElement.remove();

            const pngURL = imageCanvas.toDataURL();
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
        newKonvaStage.container().style.width = `${canvasInfo.width}px`;
        newKonvaStage.container().style.height = `${canvasInfo.height}px`;

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
    /**
     * image layer 를 blob 데이터 형태로 반환합니다.
     *
     * @alpha
     * @param 
     * @returns 정상적으로 리턴되면 blob 데이터가 리턴되고, 실패시엔 null이 리턴됩니다.
     *
     * @example
     * ```typescript
    import inpainter from "konva-image-maker";

    const getBlobBtnElement = document.querySelector(
      "#getBlobBtn"
    ) as HTMLButtonElement;

    getBlobBtnElement.addEventListener("click", function () {
      const response = inpainter.imageCanvasToBlob();
      console.log(response);
    });
     * ```
     */
    imageCanvasToBlob(): null | Blob {
      const dataURI = this.canvasToDataUrl("image");
      if (dataURI === "") return null;

      const blob = dataURItoBlob(dataURI);
      return blob;
    },
    /**
     * masking layer 를 blob 데이터 형태로 반환합니다.
     *
     * @alpha
     * @param 
     * @returns 정상적으로 리턴되면 blob 데이터가 리턴되고, 실패시엔 null이 리턴됩니다.
     *
     * @example
     * ```typescript
    import inpainter from "konva-image-maker";

    const getMaskingBlobBtnElement = document.querySelector(
      "#getMaskingBlobBtn"
    ) as HTMLButtonElement;

    getMaskingBlobBtnElement.addEventListener("click", function () {
      const response = inpainter.drawingCanvasToBlob();
      console.log(response);
    });
     * ```
     */
    drawingCanvasToBlob(): null | Blob {
      const dataURI = this.canvasToDataUrl("mask");
      if (dataURI === "") return null;
      const blob = dataURItoBlob(dataURI);
      return blob;
    },
    /**
     * 현재 zoom의 배율을 리턴합니다.
     *
     * @alpha
     * @param 
     * @returns 정상적으로 리턴되면 배율 데이터가 리턴되고, 실패시엔 null이 리턴됩니다.
     *
     * @example
     * ```typescript
    import inpainter from "konva-image-maker";

    const spanElement = document.querySelector("#zoom");
    document.body.addEventListener("wheel", function () {
      if (spanElement !== null) {
        spanElement.textContent = String(inpainter.getZoomScale() ?? 0);
      }
    });
     * ```
     */
    getZoomScale() {
      return newZoomScale;
    },
    resizeAndCenterCrop(base64: string) {
      return new Promise(async (resolve) => {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        const image = new Image();
        const { desiredWidth: width, desiredHeight: height } = desiredSize;
        if (width !== null && height !== null) {
          canvas.width = width;
          canvas.height = height;

          image.onload = () => {
            if (context !== null) {
              const { width: imageWidth, height: imageHeight } = image;
              const inputRatio = width / height;
              const imageRatio = imageWidth / imageHeight;

              let w,
                h,
                x = 0,
                y = 0;

              if (imageRatio > inputRatio) {
                w = (height * imageWidth) / imageHeight;
                h = height;
                x = (width - w) / 2;
              } else if (imageRatio < inputRatio) {
                w = width;
                h = (width * imageHeight) / imageWidth;
                y = (height - h) / 2;
              } else {
                w = width;
                h = height;
              }

              context.drawImage(image, x, y, w, h);

              resolve(canvas.toDataURL("image/png"));
            }

            image.src = base64;
          };
        }
      });
    },
    centerCropDrawingCanvas(width: number, height: number) {
      desiredSize.desiredWidth = width;
      desiredSize.desiredHeight = height;
    },
    // resetZoomScale() {
    //   newZoomScale = new
    // },
  };
})();

export default inpainter;

// else {
//   const dataURL = drawingLayer.toCanvas().toDataURL();
//   const imageObj = new Image();

//   imageObj.onload = () => {
//     const { width: imageWidth, height: imageHeight } = imageObj;
//     const inputRatio = desiredWidth / desiredHeight;
//     const imageRatio = imageWidth / imageHeight;

//     let w,
//       h,
//       x = 0,
//       y = 0;

//     if (imageRatio > inputRatio) {
//       w = (imageHeight * imageWidth) / imageHeight;
//       h = imageHeight;
//       x = (desiredWidth - w) / 2;
//     } else if (imageRatio < inputRatio) {
//       w = desiredWidth;
//       h = (desiredWidth * imageHeight) / imageWidth;
//       y = (imageHeight - h) / 2;
//     } else {
//       w = desiredWidth;
//       h = imageHeight;
//     }

//     const imagePromptImage = new Konva.Image({
//       image: imageObj,
//       width: w,
//       height: h,
//       x: 0,
//       y: 0,
//     });
//     drawingLayer?.width(desiredWidth);
//     drawingLayer?.height(desiredHeight);
//     drawingLayer?.destroyChildren();
//     drawingLayer?.add(imagePromptImage);
//   };

//   imageObj.src = dataURL;
//   imagePromptStage.add(drawingLayer);
// }
