import React, { useEffect, useRef, useState } from "react";

const Stream = () => {
    const videoRef = useRef(null);
    const peerConnectionRef = useRef(null);
    const [isStreamAvailable, setIsStreamAvailable] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [error, setError] = useState(null);

    const checkStreamAvailability = async () => {
        setIsChecking(true);
        setError(null);

        try {
            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: "stun:stun.l.google.com:19302" },
                    {
                        urls: "turn:relay.metered.ca:443",
                        username: "open",
                        credential: "open"
                    }
                ]
            });

            const offer = await pc.createOffer({
                offerToReceiveVideo: true,
                offerToReceiveAudio: false // Если аудио не нужно
            });
            await pc.setLocalDescription(offer);

            const response = await fetch("https://back.kazitech.ru/viewer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sdp: pc.localDescription.sdp,
                    type: pc.localDescription.type,
                }),
            });

            if (response.ok) {
                const { sdp, type } = await response.json();
                if (sdp && type) {
                    setIsStreamAvailable(true);
                    startStream();
                } else {
                    setError("Стрим недоступен");
                    setIsStreamAvailable(false);
                }
            } else {
                setIsStreamAvailable(false);
                setError("Стрим пока недоступен");
            }

            pc.close();
        } catch (err) {
            console.error("Check availability error:", err);
            setError("Ошибка при проверке доступности стрима");
            setIsStreamAvailable(false);
        } finally {
            setIsChecking(false);
        }
    };

    const startStream = async () => {
        try {
            if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
            }

            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: "stun:stun.l.google.com:19302" },
                    {
                        urls: "turn:relay.metered.ca:443",
                        username: "open",
                        credential: "open"
                    }
                ]
            });

            peerConnectionRef.current = pc;

            pc.ontrack = (event) => {
                if (videoRef.current) {
                    videoRef.current.srcObject = event.streams[0];
                }
            };

            pc.oniceconnectionstatechange = () => {
                console.log("ICE Connection State:", pc.iceConnectionState);
                if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
                    setError("Соединение потеряно");
                    setIsStreamAvailable(false);
                }
            };

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    console.log("New ICE candidate:", event.candidate);
                }
            };

            const offer = await pc.createOffer({
                offerToReceiveVideo: true,
                offerToReceiveAudio: false
            });
            await pc.setLocalDescription(offer);

            const response = await fetch("https://back.kazitech.ru/viewer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sdp: pc.localDescription.sdp,
                    type: pc.localDescription.type,
                }),
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const { sdp, type } = await response.json();
            const remoteDesc = new RTCSessionDescription({ sdp, type });
            await pc.setRemoteDescription(remoteDesc);

        } catch (err) {
            console.error("Start stream error:", err);
            setError("Ошибка при запуске стрима");
            setIsStreamAvailable(false);
        }
    };

    useEffect(() => {
        checkStreamAvailability();
        return () => {
            if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
            }
        };
    }, []);

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            <div className="max-w-4xl mx-auto">
                {isStreamAvailable ? (
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            controls
                            className="w-full h-auto aspect-video"
                        />
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                            Стрим еще не начался
                        </h2>
                        {error && (
                            <p className="text-red-500 mb-4">
                                {error}
                            </p>
                        )}
                        <button
                            onClick={checkStreamAvailability}
                            disabled={isChecking}
                            className={`
                                px-6 py-3 rounded-lg text-white font-medium
                                ${isChecking
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'}
                                transition duration-150
                            `}
                        >
                            {isChecking ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Проверяем...
                                </span>
                            ) : (
                                'Проверить доступность'
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Stream;