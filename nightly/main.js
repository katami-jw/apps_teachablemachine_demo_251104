const webcamWidthS = 120;
const webcamHeightS = 120;
const webcamWidthM = 170;
const webcamHeightM = 170
const webcamWidthL = 200;
const webcamHeightL = 200;
const webcamWidthXL = 400;
const webcamHeightXL = 400;

let webcamWidth = webcamWidthL;
let webcamHeight = webcamHeightL;

let model, webcam, labelContainer, maxPredictions;

let one_click_flag = true;
let modelURL, metadataURL;

let pictureData = new Array();
let audioData = new Array();

let modelChangeFlag = false;
let webcamScreensizeChangeFlag = false;

async function onChangeCameraRec() {
    if (document.getElementById("change-camera-rec").checked) {
        setChangeCameraRecLabel(true);

        Promise.all([setupCam(webcamWidth, webcamHeight)]).then(() => {
            webcam.play();
            stopLoopFlag = false;
            window.requestAnimationFrame(loop);
            document.getElementById("webcam-container").style.filter = "grayscale(0%)";
        });

    } else {
        setChangeCameraRecLabel(false);
        await pauseVideo();
        await webcam.stop();
        document.getElementById("webcam-container").style.filter = "grayscale(100%)";
    }
}

function getRadioboxValue(name) {
    let elements = document.getElementsByName(name);
    let len = elements.length;
    let checkValue = '';

    for (let i = 0; i < len; i++) {
        if (elements.item(i).checked) {
            checkValue = elements.item(i).value;
        }
    }

    return checkValue;
}

function setWebcamScreenSize() {
    const radioboxValue = getRadioboxValue("webcam-screensize");
    switch (radioboxValue) {
        case "CamSizeSmall":
            webcamWidth = webcamWidthS;
            webcamHeight = webcamHeightS;
            break;
        case "CamSizeMedium":
            webcamWidth = webcamWidthM;
            webcamHeight = webcamHeightM;
            break;
        case "CamSizeBig":
            webcamWidth = webcamWidthL;
            webcamHeight = webcamHeightL;
            break;
        case "CamSizeXLarge":
            webcamWidth = webcamWidthXL;
            webcamHeight = webcamHeightXL;
            break;
    }
}

function hideProgressBar() {
    const hideProgressBarValue = getRadioboxValue("hide-progressbar");
    switch (hideProgressBarValue) {
        case "hide-progressbar-true":
            labelContainer.hidden = true;
            break;
        case "hide-progressbar-false":
            labelContainer.hidden = false;
            break;
    }
}

// 初回のみ実行される。
async function defaultModelLoad() {
    //model = await tmImage.loadFromFiles(modelObj, weightsObj, metadataObj);
    model = await tmImage.load(
        "./assets/default_model/model.json",
        "./assets/default_model/metadata.json")

    maxPredictions = model.getTotalClasses();
    classes = model.getClassLabels()

    audioData[0] = "./assets/無音.mp3";
    audioData[1] = "./assets/中パンチ.mp3";
    audioData[2] = "./assets/「やあ」.mp3";

    pictureData[0] = "./assets/kotetsuPAR516692025_TP_V.jpg";
    pictureData[1] = "./assets/OZPA88_winner20130707170749_TP_V.jpg";
    pictureData[2] = "./assets/SAKI037-_MKT50981517_TP_V.jpg"

    labelContainer = document.getElementById("label-container");
    for (let i = 0; i < maxPredictions; i++) { // and class labels
        $('<audio id="sound_' + i + '" preload="auto"><source src="' + audioData[i] + '" type="audio/mp3"></audio>').appendTo('#audio-list')
        document.getElementById('sound_' + i).load();
    }
}
Promise.all([defaultModelLoad()]).then();

async function setupCam(width, height) {
    try {
        webcam.stop();
    } catch {
        console.warn("webcamが初期化されていません。");
    }

    // Convenience function to setup a webcam
    const flip = true; // whether to flip the webcam
    webcam = new tmImage.Webcam(width, height, flip); // width, height, flip
    await webcam.setup(); // request access to the webcam

    try {
        const childCanvas = document.getElementById("webcam-container").getElementsByTagName('canvas');
        childCanvas[0].remove();
    } catch (e) {
        console.warn("初回起動につきWebcam取得失敗:" + e);
    }

    document.getElementById("webcam-container").appendChild(webcam.canvas);
    document.getElementById("label-container").style.top = `${height}px`;

    await webcam.play();
    window.requestAnimationFrame(loop);

    document.getElementById("change-camera-rec").disabled = false;
}
setWebcamScreenSize();
Promise.all([setupCam(webcamWidth, webcamHeight)]).then(() => {
    document.getElementById("change-camera-rec").checked = true;
    setChangeCameraRecLabel(true);
    document.getElementById('preloader').remove();
});

async function startPredict() {

    if (!document.getElementById("change-camera-rec").checked) {
        return;
    }

    if (!webcamScreensizeChangeFlag) {
        webcam.play();
        stopLoopFlag = false;
        window.requestAnimationFrame(loop);
    } else {
        //await webcam.setup(); // request access to the webcam
        Promise.all([setupCam(webcamWidth, webcamHeight)]).then(() => {
            webcam.play();
            stopLoopFlag = false;
            window.requestAnimationFrame(loop);
        });
        webcamScreensizeChangeFlag = false;
    }
}
//Promise.all([startPredict()]).then();

async function pauseVideo() {
    stopLoopFlag = true;
    await webcam.pause();
}

async function startSetting() {
    await pauseVideo();
    webcamScreensizeChangeFlag = false;
}

let stopLoopFlag = false;
async function loop() {
    if (!stopLoopFlag) {
        webcam.update(); // update the webcam frame
        await predict();
        window.requestAnimationFrame(loop);
    }
}

// run the webcam image through the image model
let tmpAnswer = NaN;
let predictCounter = 0;
let gAnswer = 0;
async function predict() {
    // predict can take in an image, video or canvas html element
    const prediction = await model.predict(webcam.canvas);
    let answer = 0;

    let maxLengthPredictionLabel = 0;
    for (let i = 0; i < maxPredictions; i++) {
        const predictionLabel = prediction[i].className;
        if (maxLengthPredictionLabel < predictionLabel.length) {
            maxLengthPredictionLabel = predictionLabel.length;
        }
    }

    let addProgressHTMLStr = "";
    for (let i = 0; i < maxPredictions; i++) {
        const predictNum = (prediction[i].probability.toFixed(2) * 100).toFixed(0);
        const predictionLabel = prediction[i].className;
        // prediction[i].className.length < 9 ? prediction[i].className : prediction[i].className.substr( 0, 8 ) + '...';

        addProgressHTMLStr += `
                <div class="row gx-0 gy-0 pb-2">
                    <div class="col-5 ps-1 text-start text-white text-nowrap text-truncate text-justify flex-fill" style="max-width: 7em !important;width: ${maxLengthPredictionLabel}em">
                        <span id="prediction-result-${i}">${predictionLabel}</span>
                    </div>
                    <div class="col-7 cssProgress fs-4 flex-fill">
                        <div class="progress3" style="width:100%">
                            <div class="cssProgress-bar cssProgress-primary" data-percent="${predictNum}" style="transition: none 0s ease 0s; width: ${predictNum}%;position: relative;">
                                <span class="cssProgress-label-nohidden pe-2 ps-1" style="color: #FFFFFF;position: absolute;text-align: right;">${predictNum}%</span>
                            </div>
                        </div>
                    </div>
                </div>
        `

        if (prediction[answer].probability < prediction[i].probability) {
            answer = i;
        }
    }


    labelContainer.innerHTML = `
            <div class="container-fluid pt-2">
                ${addProgressHTMLStr}
            </div>
        `


    // note: 直後に切り替わらないようにする
    if (tmpAnswer !== answer) {
        predictCounter = predictCounter + 1;
    } else {
        predictCounter = 0;
    }

    // 切り替わり直後のみ変更
    if (predictCounter > 5) {
        $(function () {
            $('.hero-background').css({
                backgroundImage: 'url("' + pictureData[answer] + '")'
            });
        });

        if (!isNaN(tmpAnswer)) {
            document.getElementById('sound_' + tmpAnswer).pause();
        }
        document.getElementById('sound_' + answer).currentTime = 0;
        document.getElementById('sound_' + answer).play();
        tmpAnswer = answer;
    }

    gAnswer = answer;
}

let bufModel;
function handleFile(f) {
    let modelBlob;
    let metadataBlob;
    let weightsBlob;

    Promise.all([JSZip.loadAsync(f)
        .then(function (zip) {
            Promise.all([zip.file("model.json").async('blob')]).then(function (blob) {
                modelBlob = blob;
            })

            Promise.all([zip.file("metadata.json").async('blob')]).then(function (blob) {
                metadataBlob = blob;
            })

            Promise.all([zip.file("weights.bin").async('blob')]).then(function (blob) {
                weightsBlob = blob;
            }).then(function (data) {
                async function load() {

                    const modelObj = new File(modelBlob, "model.json");
                    const weightsObj = new File(weightsBlob, "weights.bin")
                    const metadataObj = new File(metadataBlob, "metadata.json")

                    bufModel = await tmImage.loadFromFiles(modelObj, weightsObj, metadataObj);

                    maxPredictions = bufModel.getTotalClasses();
                    classes = bufModel.getClassLabels();


                    initResource();

                    let manyForm = document.getElementById("many-form");
                    manyForm.innerHTML = ""

                    for (let i = 0; i < maxPredictions; i++) {
                        $('<h4 class="pt-4 text-secondary">' + classes[i] + '</h4>').appendTo('#many-form');

                        $('<div class="input-group pt-2"><label class="input-group-text bg-white border-0 text-secondary" for="picture_input_' + i + '"><i class="px-1 bi bi-image-fill"></i>画像</label><input type="file" class="form-control rounded" id="picture_input_' + i + '" accept=".png,.jpg,.jpeg"></div>').appendTo('#many-form');

                        $('<div class="input-group pt-2"><label class="input-group-text bg-white border-0 text-secondary" for="audio_input_' + i + '"><i class="px-1 bi bi-volume-up-fill"></i>音声</label><input type="file" class="form-control rounded" id="audio_input_' + i + '" accept=".mp3,.m4a,.aac,.wav,.flac"></div>').appendTo('#many-form');
                    }

                    // 動的にファイルを作ってしまった都合、thisでfiles読めない。注意
                    for (let i = 0; i < maxPredictions; i++) {
                        $("#many-form").on("click", '#picture_input_' + i, async function (evt) {
                            evt.target.value = '';
                        })

                        $('#many-form').on('change', '#picture_input_' + i, (e) => {
                            const fileList = e.target.files;
                            if (fileList.length == 0) {
                                return;
                            }

                            const file = fileList[0];
                            const reader = new FileReader();

                            reader.onload = (e) => {
                                pictureData[i] = e.target.result;
                                setFirstPicture();
                            };
                            reader.readAsDataURL(file);

                            modelChangeFlag = true;
                        })

                        $("#many-form").on("click", '#audio_input_' + i, async function (evt) {
                            evt.target.value = '';
                        })

                        $('#many-form').on('change', '#audio_input_' + i, (e) => {
                            const fileList = e.target.files;
                            if (fileList.length == 0) {
                                return;
                            }

                            const file = fileList[0];
                            const reader = new FileReader();

                            reader.onload = (e) => {
                                audioData[i] = e.target.result;
                                const sound_src = document.getElementById('sound_src_' + i);
                                sound_src.src = audioData[i];
                                document.getElementById('sound_' + i).load();
                            };
                            reader.readAsDataURL(file);
                            modelChangeFlag = true;
                        })
                    }

                };
                Promise.all([load()]).then();
            })

        })]).then();
}

$("#model_input").on("click", async function (evt) {
    evt.target.value = '';
})

$("#model_input").on("change", async function (evt) {
    var files = evt.target.files;
    if (files.length == 0) {
        return;
    }

    handleFile(files[0]);
    modelChangeFlag = true;
})

let webcamScreensizeSetFlag = false;
let radio_btns = document.querySelectorAll(`input[type='radio'][name='webcam-screensize']`);
for (let target of radio_btns) {
    target.addEventListener(`change`, () => {
        webcamScreensizeSetFlag = true;

        if (webcamScreensizeSetFlag) {
            webcamScreensizeChangeFlag = true;
            webcamScreensizeSetFlag = false;
            setWebcamScreenSize();
        }
    });
}


let radio_progressbar_hide_btns = document.querySelectorAll(`input[type='radio'][name='hide-progressbar']`);
for (let target of radio_progressbar_hide_btns) {
    target.addEventListener(`change`, () => {
        hideProgressBar();
    });
}


function setFirstPicture() {
    let firstPicture = 0
    if (gAnswer < maxPredictions) {
        firstPicture = gAnswer;
    }
    $('.hero-background').css({
        backgroundImage: 'url("' + pictureData[firstPicture] + '")'
    });
}

function initResource() {
    let audio_list = document.getElementById("audio-list");
    audio_list.innerHTML = "";

    labelContainer = document.getElementById("label-container");
    labelContainer.innerHTML = "";

    pictureData = new Array(maxPredictions);
    audioData = new Array(maxPredictions);

    labelContainer = document.getElementById("label-container");
    for (let i = 0; i < maxPredictions; i++) { // and class labels
        pictureData[i] = "./assets/画像未設定.png";
        audioData[i] = "./assets/無音.mp3";

        $('<audio id="sound_' + i + '" preload="auto"><source id="sound_src_' + i + '" src="' + audioData[i] + '" type="audio/mp3"></audio>').appendTo('#audio-list')
        document.getElementById('sound_' + i).load();
    }
    model = bufModel

    setFirstPicture();
}

function setChangeCameraRecLabel(onFlag) {
    let changeCameraRecLabel = document.getElementById("change-camera-rec-label");
    if (onFlag) {
        changeCameraRecLabel.innerText = "オン";
    } else {
        changeCameraRecLabel.innerText = "オフ";
    }
}