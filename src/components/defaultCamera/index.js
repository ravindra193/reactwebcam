import React, { useEffect, useState, useRef, useContext } from "react";
import { Container, Row, Col } from "reactstrap";
import AWS, { IoTSecureTunneling } from "aws-sdk";
import Amplify, { Auth, Storage } from "aws-amplify";
import Webcam from "react-webcam";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs";
import "../assets/style.css";
import jsonData from "./data.json";
import suggestionsJson from "./suggestions.json";
import Keyboard from "react-simple-keyboard";
import "react-simple-keyboard/build/css/index.css";
import Predictionary from "predictionary";
import Footer from "./footer";
import PollySpeaking from "./pollySpeaking";
import { TurnedIn } from "@material-ui/icons";
import Button from "@material-ui/core/Button";

import styled from "styled-components";
import awsconfig from "../../aws-exports.ts";

Amplify.configure({
  Auth: {
    identityPoolId: awsconfig.aws_cognito_identity_pool_id, //REQUIRED - Amazon Cognito Identity Pool ID
    region: awsconfig.aws_cognito_region, // REQUIRED - Amazon Cognito Region
    userPoolId: awsconfig.aws_user_pools_id, //OPTIONAL - Amazon Cognito User Pool ID
    userPoolWebClientId: awsconfig.aws_user_pools_web_client_id, //OPTIONAL - Amazon Cognito Web Client ID
  },
  Storage: {
    
      bucket: awsconfig.aws_user_files_s3_bucket, //REQUIRED -  Amazon S3 bucket name
      region: awsconfig.aws_cognito_region, //OPTIONAL -  Amazon service region
      identityPoolId: awsconfig.aws_cognito_identity_pool_id,
    },
});
// AWS.config.update({
//   accessKeyId: '302426983597',
//   secretAccessKey: 'vhkshjdtys1!Q'
// })

// const config = {
//   bucketName: awsConfigs.aws_user_files_s3_bucket,
//   albumName: 'sentences',
//   region: awsConfigs.aws_cognito_region,
//     accessKeyId: '302426983597',
//   secretAccessKey: 'vhkshjdtys1!Q'
// }

const WrapperInput = styled.div`
  width: 514px;
  height: 200px;
  /* background: #ddd; */
  position: absolute;
  top: 15px;
  left: 50%;
  transform: translate(-50%, 0);
  z-index: 999;
  .inputData {
    width: 100%;
  }

  @media only screen and (max-width: 768px) {
    width: 150px;
  }

  @media only screen and (max-width: 500px) {
    width: 100px;
  }
`;

const optionsKeyBoard = ["normal keyboard", "dasher keyboard"];

const DefaultCamera = (props) => {
  const [data, setData] = useState([]);
  const [detectedObject, setDetectedObject] = useState();
  const [senetnce, setSentence] = useState();
  const [confirmSpeak, setConfirmSpeak] = useState(false);
  const [keyboardFalg, setKeyboardFlag] = useState(false);
  // const [keyboardFalg, sremoveKeyboardFlag] = useState(false);
  const [selectedOption, setSelectopOption] = useState(optionsKeyBoard[1]);
  // console.log(`selectedOption>>>`,selectedOption)
  const [input, setInput] = useState();
  const [layout, setLayout] = useState("default");
  const [starter, setStarter] = useState(false);
  const keyboard = useRef();
  const [suggestions, setSuggestions] = useState();
  const [parent, setParent] = useState(false);
  const [text, setText] = useState({
    OutputFormat: "mp3",
    SampleRate: "16000",
    Text: "",
    TextType: "text",
    VoiceId: "Matthew",
  });
  
  var presentences;
  let sentenceList = [];

  const screenwidth = window.screen.width;
  const screenheight = window.screen.height;
  useEffect(() => {
    const video = document.getElementById("video");
    // function readTextFile(file)
    // {
    //     var rawFile = new XMLHttpRequest();
    //     rawFile.open("GET", file, false);
    //     rawFile.onreadystatechange = function ()
    //     {
    //         if(rawFile.readyState === 4)
    //         {
    //             if(rawFile.status === 200 || rawFile.status == 0)
    //             {
    //               sentenceList.push(rawFile.responseText);
    //               // setSentence(sentenceList);
    //               getList();
    //               console.log("123123")
    //               console.log(typeof(JSON.stringify(rawFile.responseText)));
    //             }
    //         }
    //     }
    //     rawFile.send(null);
    // }
    // Storage.put( "user-sentence.json", [{"person":"where are you going to?"}], {
    //   level: "private",
    // })
    //   .then((result) => console.log(result))
    //   .catch((err) => console.log(err))

    // Storage.get("user-sentence.json", { level: "private" })
    // .then(result => 
    //   readTextFile(result)
    // )
    // .catch(err => console.log(err));

    
    const webCamPromise = navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: screenwidth,
          height: screenheight,
        },
      })
      .then((stream) => {
        video.srcObject = stream;
        return new Promise((resolve, reject) => {
          video.onloadedmetadata = () => {
            video.play();
            resolve();
          };
        });
      })
      .catch(() => {
        alert("No camera Detected. Enable camera and refresh the page");
      });
    const modelPromise = cocoSsd.load();
    Promise.all([modelPromise, webCamPromise])
      .then((values) => {
        detectFrame(video, values[0]);
      })
      .catch(() => {
        alert("Video not loaded. Refresh the page");
      });
  }, []);

  const readTextFile = (file) => {
      var rawFile = new XMLHttpRequest();
      rawFile.open("GET", file, false);
      rawFile.onreadystatechange = function ()
      {
          if(rawFile.readyState === 4)
          {
              if(rawFile.status === 200 || rawFile.status == 0)
              {
                sentenceList.push(rawFile.responseText);
                getList();
                console.log("123123")
                console.log(typeof(JSON.stringify(rawFile.responseText)));
              }
          }
      }
      rawFile.send(null);
  }

  const getFileList = async () => {
    // let fileList = [];
    let data = Storage.list('sen_') // for listing ALL files without prefix, pass '' instead
    .then(result => {
      return result;
    }).catch(err => console.log(err));
    return data;
  }

  const getSentenceData = async () => {
    let fileList = await getFileList();
    let list = []; 
    fileList.map((r) => {
      list.push(r.key);
    })

    for (let i = 0 ; i < list.length; i++) {
      await Storage.get(`${list[i]}`, { level: "public" })
      .then(result => 
        readTextFile(result)
      ).catch(err => console.log(err));
    }
    
  }
  
  const onChange = (input) => {
    console.log("onChange: ", input);
    //console.log("input before",input );
    setInput(input);
    console.log("Input changed", input);
    keyboard.current.setInput(input);
    let predictionary = Predictionary.instance();
    predictionary.addWords(suggestionsJson);
    let suggestions = predictionary.predict(input);
    // console.log("suggestions>>", suggestions);
    setSuggestions(suggestions);
  };

  // const [temp, settemp] = useState('')

  const handleSuggestions = (suggestion, index) => {
    console.log("suggestion ", suggestion, "  index ", index);
    // console.log("input text", input);
    // console.log("input lenght", input.length)
    const lastSpaceCharacterIndex = input.lastIndexOf(" ");
    const substring = input.substring(0, lastSpaceCharacterIndex + 1);
    //  console.log("Substring after truncation...", substring);
    setInput(substring + `${suggestion}` + " ");
    keyboard.current.setInput(substring + `${suggestion}` + " ");
  };
  const handleShift = () => {
    const newLayoutName = layout === "default" ? "shift" : "default";
    setLayout(newLayoutName);
  };
  const onKeyPress = (button) => {
    console.log("Button pressed", button);

    /**
     * If you want to handle the shift and caps lock buttons
     */
    if (button === "{shift}" || button === "{lock}") handleShift();
  };

  const onChangeInput = (event) => {
    const input = event.target.value;
    setInput(input);
  };
  const detectFrame = (video, model) => {
    model.detect(video).then((predictions) => {
      renderPredictions(predictions);
      requestAnimationFrame(() => {
        detectFrame(video, model);
      });
    });
  };
  const renderPredictions = (predictions) => {
    setData(predictions);
    const c = document.getElementById("canvas");
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    // Font options.
    const font = "16px sans-serif";
    ctx.font = font;
    ctx.textBaseline = "top";
    predictions.forEach((prediction) => {
      const x = prediction.bbox[0];
      const y = prediction.bbox[1];
      const width = prediction.bbox[2];
      const height = prediction.bbox[3];
      // Draw the bounding box.
      ctx.strokeStyle = "#00FFFF";
      ctx.lineWidth = 4;
      ctx.strokeRect(x + 30, y, width, height);
      // Draw the label background.
      ctx.fillStyle = "#00FFFF";
      const textWidth = ctx.measureText(prediction.class).width;
      const textHeight = parseInt(font, 10); // base 10
      ctx.fillRect(x + 30, y, textWidth + 4, textHeight + 4);
    });
    predictions.forEach((prediction) => {
      const x = prediction.bbox[0];
      const y = prediction.bbox[1];
      // Draw the text last to ensure it's on top.
      ctx.fillStyle = "#000000";
      ctx.fillText(prediction.class, x + 30, y);
    });
  };

  const handleObject = (e) => {
    console.log("clicked");
    setDetectedObject(e.target.value);
    // findSentences(e.target.value);
    getSentenceData();
    // getList();
    setStarter(true);
  };
  
  const getList = () => {
    setSentence(sentenceList);
  }

  const findSentences = (value) => {
    console.log('value')
    let result = presentences && presentences.length && presentences.map((j) => (j.name === value ? j.value : ""));
  
    // console.log("sdfsdf");
    // console.log(typeof(presentences));
    // console.log(presentences)
    setSentence(result);
  };
  const handleKeyboard = () => {
    setKeyboardFlag(true);
  };
  const handleBack = () => {
    setStarter(false);
  };
  const speakText = () => {
    connect();

    // Create the Polly service object and presigner object
    const finalData = { ...text, Text: input };
    console.log("Final Polly Data", finalData);

    if (finalData.Text !== "") {
      let filename = `sen_${Date.now()}.json`;
      Storage.put(filename, finalData.Text, {
        level: "public",
      })
        .then((result) => console.log(result))
        .catch((err) => console.log(err));
    }

    var polly = new AWS.Polly({ apiVersion: "2016-06-10" });
    var signer = new AWS.Polly.Presigner(finalData, polly);

    // Create presigned URL of synthesized speech file
    signer.getSynthesizeSpeechUrl(finalData, function (error, url) {
      if (error) {
        // document.getElementById("result").innerHTML = error;
        console.log("error polly speak ", error);
      } else {
        setParent(true);

        pollyaudioplay(url).then(function () {
          setParent(false);
          setKeyboardFlag(false);
          setStarter(false);
          setSuggestions(false);
        });
      }
    });
  };
  const pollyaudioplay = (audiosource) => {
    return new Promise(function (resolve, reject) {
      document.getElementById("audioSource").src = audiosource;
      document.getElementById("audioPlayback").load();
      document.getElementById("audioPlayback").play();
      document.getElementById("audioPlayback").onerror = reject;
      document.getElementById("audioPlayback").onended = resolve;
    });
  };
  const connect = () => {
    // Initialize the Amazon Cognito credentials provider
    AWS.config.region = "us-east-1"; // Region
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
      IdentityPoolId: "us-east-1:47c46f2d-f5b1-4857-9d20-27b64cf32b2c",
    });
  };
  const handleConfirmSpeak = () => {
    setConfirmSpeak(true);
  };
  const handleGoBack = () => {
    setConfirmSpeak(false);
  };
  const handleClear = () => {
    setInput("");
    keyboard.current.setInput("");
  };
  const handleSentence = (sentence) => {
    console.log("pridictSentence", sentence[0]);
    setKeyboardFlag(true);
    setConfirmSpeak(true);
    setInput(`${sentence[0]}`);
    // keyboard.current.setInput(`${sentence[0]}`);
  };
  // useEffect(()=>{
  //   console.log("input in useeffect",input);
  //   speakText();
  // },);
  return (
    <>
      {parent && <PollySpeaking audioText={input != "" ? { input } : ""} />}
      <Container style={{ display: parent && "none" }} fluid={true}>
        <Row>
          {keyboardFalg ? (
            <>
              <Col
                style={{
                  padding: "0px",
                  marginTop: "0px",
                  maxWidth: "400px",
                }}
              >
                {/* <input
                  value={input}
                  placeholder={"Tap on the virtual keyboard to start"}
                  onChange={onChangeInput}
                  className="inputData"
                /> */}
                {confirmSpeak ? (
                  <>
                    <Col md={12} style={{ padding: "0px", marginTop: "0px" }}>
                      <h1 className="sentence-checker">
                        Is this Sentence Correct?
                      </h1>
                      {input && <p className="pollyText">{input}</p>}
                      <Row>
                        <Col md={6} style={{ padding: "0px" }}>
                          <div className="speak-now" onClick={speakText}>
                            Yes-Speak
                          </div>
                        </Col>
                        <Col md={6} style={{ paddingLeft: "0px" }}>
                          <div className="back-btn" onClick={handleGoBack}>
                            {" "}
                            No-Go Back{" "}
                          </div>
                        </Col>
                      </Row>
                      <br />
                      <Row>
                        <Col ms={12}>
                          <audio
                            id="audioPlayback"
                            controls
                            style={{ display: "none" }}
                          >
                            <source id="audioSource" type="audio/mp3" src="" />
                          </audio>
                        </Col>
                      </Row>
                    </Col>
                  </>
                ) : (
                  <>
                    <h5>Suggested:</h5>
                    {suggestions &&
                      suggestions.map((suggestion, index) => {
                        console.log(`suggestions>>`, suggestions);
                        return (
                          <>
                            <span
                              className="suggestions"
                              key={index}
                              onClick={() =>
                                handleSuggestions(suggestion, index)
                              }
                            >
                              {" "}
                              {suggestion}{" "}
                            </span>
                          </>
                        );
                      })}
                    <br />
                    {selectedOption !== "normal keyboard" && (
                      <Keyboard
                        keyboardRef={(r) => (keyboard.current = r)}
                        layoutName={layout}
                        onChange={onChange}
                        onKeyPress={onKeyPress}
                      />
                    )}
                    <Row>
                      <Col md={6} style={{ padding: "0px" }}>
                        <div className="speak-btn" onClick={handleConfirmSpeak}>
                          {" "}
                          Speak{" "}
                        </div>
                      </Col>
                      <Col md={6} style={{ paddingLeft: "0px" }}>
                        <div className="clear-btn" onClick={handleClear}>
                          {" "}
                          Clear{" "}
                        </div>
                      </Col>
                    </Row>
                  </>
                )}
              </Col>
            </>
          ) : (
            <>
              {starter && (
                <>
                  <Col
                    md={2}
                    style={{
                      padding: "0px",
                      marginTop: "0px",
                      float: "right",
                    }}
                  >
                    <h1 className="sentence-stater">Sentence Starters</h1>
                    {senetnce ? senetnce.map((s) => {
                      return(
                        <p
                        className="demo-text"
                        id="demo-text"
                        onClick={() => handleSentence(senetnce)}
                      >
                        {s}
                      </p>
                      )
                    }) : (
                      <p className="demo-text">No Sentence</p>
                    )}
                    <div className="btn-wrapper" onClick={handleKeyboard}>
                      Start New Sentence
                    </div>
                    <div className="btn-wrapper-black" onClick={handleBack}>
                      Exit Writing App
                    </div>
                  </Col>
                </>
              )}
            </>
          )}

          <Col style={{ padding: "0px", margin: "0px" }}>
            <video id="video" width={screenwidth} height={screenheight} />
            {keyboardFalg === true &&
              confirmSpeak === false &&
              selectedOption !== "normal keyboard" && (
                <input
                  value={input}
                  placeholder={"Tap on the virtual keyboard to start"}
                  // onChange={onChangeInput}
                  className="inputData"
                />
              )}
            {keyboardFalg === true &&
              confirmSpeak === false &&
              selectedOption === "normal keyboard" && (
                <WrapperInput>
                  <input
                    value={input}
                    placeholder={"Tap on the virtual keyboard to ..."}
                    onChange={onChangeInput}
                    className="inputData"
                  />
                </WrapperInput>
              )}
            <canvas id="canvas" width={screenwidth} height={screenheight} />
            {/* {data ? (
              data.map((obj) => {
                console.log(`data>>>`, data);
                return (
                  <div className="sugestion" key={obj.class}>
                    <Button
                    variant="outlined"
                      value={obj.class}
                      onClick={handleObject}
                    >
                      {obj.class}
                      </Button>
                  </div>
                );
              })
              ) : (
              <>
                <div>
                  <p>No Object Detected</p>
                </div>
                </>
            )} */}
          </Col>
        </Row>
      </Container>

      {/* )} */}
      {parent === false && (
        <Footer
          optionsKeyBoard={optionsKeyBoard}
          setSelectopOption={setSelectopOption}
          toggleSidebar={handleObject}
        />
      )}
    </>
  );
};

export default DefaultCamera;
