import { MediaConnection, Peer } from "peerjs";
import { useCallback, useEffect, useState } from "react";

export function useWebRTC() {
  const [remoteStreams, setRemoteStream] = useState<MediaStream[]>([]);
  const [remoteCalls, setRemoteCalls] = useState<MediaConnection[]>([]);
  const [peer, setPeer] = useState<Peer>();
  const [remotePeerIds, setRemotePeerIds] = useState<string[]>([]);
  const [localMediaStream, setLocalMediaStream] = useState<MediaStream>();

  useEffect(() => {
    // get host and port from baseURI
    const protocol = document.baseURI.split(":")[0];
    const hostname = document.baseURI.split("/")[2];
    const hostnames = hostname.split(":");
    const host = hostnames[0];
    let port = protocol==='https'?443:80;
    if (hostnames.length > 1) {
      port = parseInt(hostnames[1]);
    }

    const _peer = new Peer({ host, port, path: "/webrtc/" });

    _peer.on("open", () => {
      setPeer(_peer);
    });

    navigator.mediaDevices
      .getUserMedia({
        video: true,
        audio: true,
      })
      .then((_localMediaStream) => {
        setLocalMediaStream(_localMediaStream);
        // on peer open, get all peers
        _peer.listAllPeers((peers) => {
          const excludeMySelf = peers.filter((id) => id !== _peer.id);
          setRemotePeerIds(excludeMySelf);
        });
        _peer.on("call", (call) => {
          console.log("answer the call and provide our media stream");
          call.answer(_localMediaStream);
          call.on("stream", (_stream) => {
            setRemoteStream((prev) => [
              ...prev.filter((s) => s.id !== _stream.id),
              _stream,
            ]);
          });
          call.on("close", () => {
            setRemoteStream((prev) => [
              ...prev.filter((s) => s.id !== call.remoteStream.id)
            ]);
          });

        });

        _peer.socket.on("message", (data: { type: string; payload: any }) => {
          if (data.type === "new-peer") {
            const id = data.payload as string;
            setRemotePeerIds((prev) => [...prev, id]);
          } else if (data.type === "closed-peer") {
            const id = data.payload as string;
            setRemotePeerIds((prev) => prev.filter((_id) => _id !== id));
          }
        });
      });

    _peer.on("error", (error) => {
      console.error(error);
    });

    return () => {
      _peer.disconnect();
      _peer.destroy();
    };
  }, []);

  const connect = useCallback(
    (remoteId: string) => {
      if (!peer || !localMediaStream) return;
      const _remoteCall = peer.call(remoteId, localMediaStream);
      _remoteCall.on("stream", (_stream) => {
        setRemoteStream((prev) => [
          ...prev.filter((s) => s.id !== _stream.id),
          _stream,
        ]);
      });
      _remoteCall.on("close", () => {
        setRemoteStream((prev) => [
          ...prev.filter((s) => s.id !== _remoteCall.remoteStream.id)]);
      })
      setRemoteCalls((prev) => [
        ...prev.filter((c) => c.peer !== _remoteCall.peer),
        _remoteCall,
      ]);
    },
    [peer, localMediaStream]
  );

  const disconnect = useCallback(
    (remoteId: string) => {
      const _call = remoteCalls.find((c) => c.peer === remoteId);
      if (!_call) return;
      const newStreams = remoteStreams.filter(s => s.id !== _call.remoteStream.id)
      setRemoteStream(newStreams);

      setRemoteCalls((prev) => [...prev.filter((c) => c.peer !== remoteId)]);
      _call?.close();
    },
    [remoteCalls, remoteStreams]
  );

  return {
    peer,
    remotePeerIds,
    localMediaStream,
    remoteStreams,
    connect,
    disconnect,
  };
}
