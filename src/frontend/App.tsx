import { useRef } from "react";
import { useWebRTC } from "./hooks/webrtc";

const App = () => {
  const {
    peer,
    connect,
    disconnect,
    localMediaStream,
    remotePeerIds,
    remoteStreams,
  } = useWebRTC();

  const ref = useRef<HTMLSelectElement>(null);
  return (
    <div>
      <div>
        <h4>{peer?.id}</h4>
        <h5>
          <select ref={ref}>
            {remotePeerIds.map((id) => (
              <option key={"opt-" + id} value={id}>
                {id}
              </option>
            ))}
          </select>{" "}
          <button
            onClick={() => {
              const remoteId = ref.current?.value;
              if (remoteId !== undefined) {
                connect(remoteId);
              }
            }}
          >
            Call
          </button>
          <button
            onClick={() => {
              const remoteId = ref.current?.value;
              if (!remoteId) return;
              disconnect(remoteId);
            }}
          >
            Disconnect
          </button>
        </h5>
      </div>
      <video
        ref={(ref) => {
          if (!ref || !localMediaStream) return;
          ref.srcObject = localMediaStream;
          ref.addEventListener("loadedmetadata", () => {
            ref.play();
          });
        }}
        muted
        autoPlay
        style={{ width: "400px", height: "300px", border: "solid 1px #FFF" }}
      ></video>

      {remoteStreams.map((stream, id) => {
        return (
          <video
            key={`vide-${id}`}
            ref={(ref) => {
              if (!ref) return;
              ref.srcObject = stream;
              ref.addEventListener("loadedmetadata", () => ref.play());
            }}
            width={400}
            height={300}
            autoPlay
          ></video>
        );
      })}
    </div>
  );
};

export default App;
