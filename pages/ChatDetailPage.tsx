import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { UserProfile } from "../types";
import AppImage from "../components/AppImage";
import {
  uploadAudioToCloudinary,
  uploadToCloudinary,
} from "../services/cloudinaryService";
import {
  listenToConversation,
  listenToMessages,
  markConversationRead,
  sendMessage as sendChatMessage,
} from "../services/chatService";
import { markNotificationsReadByConversation } from "../services/notificationService";
import {
  getIceBreakers,
  getSmartReplies,
  summarizeConversation,
} from "../services/aiService";

interface Props {
  user: UserProfile;
}

const ChatDetailPage: React.FC<Props> = ({ user }) => {
  const { id: conversationId } = useParams();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [pendingAudio, setPendingAudio] = useState<{
    blob: Blob;
    url: string;
    context: {
      conversationId: string;
      recipientId: string;
      recipientNickname: string;
    };
  } | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const recordingContextRef = useRef<{
    conversationId: string;
    recipientId: string;
    recipientNickname: string;
  } | null>(null);
  const [aiTone, setAiTone] = useState("warm");
  const [aiReplies, setAiReplies] = useState<string[]>([]);
  const [aiIceBreakers, setAiIceBreakers] = useState<string[]>([]);
  const [aiSummary, setAiSummary] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!conversationId) return;
    const unsubscribe = listenToConversation(conversationId, (data) => {
      setConversation(data);
    });
    return () => unsubscribe();
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    const unsubscribe = listenToMessages(conversationId, (items) => {
      setMessages(items);
    });
    return () => unsubscribe();
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    void markConversationRead(conversationId, user.id);
  }, [conversationId, user.id, messages.length]);

  useEffect(() => {
    if (!conversationId) return;
    void markNotificationsReadByConversation(user.id, conversationId);
  }, [conversationId, user.id]);

  const otherParticipant = useMemo(() => {
    const members: string[] = conversation?.members ?? [];
    const otherId = members.find((member) => member !== user.id);
    if (!otherId) return null;
    const profile = conversation?.memberProfiles?.[otherId];
    return {
      id: otherId,
      nickname: profile?.nickname ?? "Chat",
      photoUrl: profile?.photoUrl ?? user.photoUrl,
    };
  }, [conversation, user.id, user.photoUrl]);

  const aiSuggestions = aiReplies.length > 0 ? aiReplies : aiIceBreakers;

  useEffect(() => {
    return () => {
      if (pendingAudio?.url) {
        URL.revokeObjectURL(pendingAudio.url);
      }
    };
  }, [pendingAudio]);

  useEffect(() => {
    if (!otherParticipant) return;
    if (messages.length === 0) {
      setAiIceBreakers(getIceBreakers({ otherProfile: otherParticipant }));
      setAiReplies([]);
      setAiSummary("");
      return;
    }
    const lastMessage = messages[messages.length - 1]?.text ?? "";
    setAiReplies(
      getSmartReplies({
        lastMessage,
        otherProfile: otherParticipant,
        tone: aiTone,
      }),
    );
    setAiIceBreakers([]);
    setAiSummary(summarizeConversation(messages));
  }, [messages, otherParticipant, aiTone]);

  const sendMessage = async () => {
    if (!inputValue.trim() || !conversationId || !otherParticipant) return;
    try {
      await sendChatMessage({
        conversationId,
        sender: user,
        recipientId: otherParticipant.id,
        text: inputValue.trim(),
        recipientNickname: otherParticipant.nickname,
      });
      setInputValue("");
    } catch (error) {
      console.error(error);
    }
  };

  const handleSelectPhoto = () => {
    if (!fileInputRef.current) return;
    fileInputRef.current.value = "";
    fileInputRef.current.click();
  };

  const handlePhotoSelected = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !conversationId || !otherParticipant) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select a valid image file.");
      return;
    }
    setUploadError(null);
    setIsUploadingImage(true);
    try {
      const imageUrl = await uploadToCloudinary(file);
      await sendChatMessage({
        conversationId,
        sender: user,
        recipientId: otherParticipant.id,
        text: inputValue.trim() ? inputValue.trim() : undefined,
        imageUrl,
        recipientNickname: otherParticipant.nickname,
      });
      setInputValue("");
    } catch (error) {
      console.error(error);
      setUploadError("Unable to upload image. Try again.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const clearPendingAudio = () => {
    setPendingAudio(null);
    setIsPreviewPlaying(false);
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
    }
  };

  const togglePreviewPlayback = () => {
    const audio = previewAudioRef.current;
    if (!audio) return;
    if (isPreviewPlaying) {
      audio.pause();
      setIsPreviewPlaying(false);
      return;
    }
    audio
      .play()
      .then(() => setIsPreviewPlaying(true))
      .catch(() => setRecordingError("Unable to play the preview."));
  };

  const toggleAudioPlayback = (messageId: string) => {
    const audio = audioRefs.current[messageId];
    if (!audio) return;
    if (playingAudioId && playingAudioId !== messageId) {
      audioRefs.current[playingAudioId]?.pause();
    }
    if (playingAudioId === messageId) {
      audio.pause();
      setPlayingAudioId(null);
      return;
    }
    audio
      .play()
      .then(() => setPlayingAudioId(messageId))
      .catch(() => setRecordingError("Unable to play this voice note."));
  };

  const sendPendingAudio = async () => {
    if (!pendingAudio || isUploadingAudio) return;
    setIsUploadingAudio(true);
    try {
      const file = new File(
        [pendingAudio.blob],
        `voice-note-${Date.now()}.webm`,
        { type: pendingAudio.blob.type || "audio/webm" },
      );
      const audioUrl = await uploadAudioToCloudinary(file);
      await sendChatMessage({
        conversationId: pendingAudio.context.conversationId,
        sender: user,
        recipientId: pendingAudio.context.recipientId,
        text: inputValue.trim() ? inputValue.trim() : undefined,
        audioUrl,
        recipientNickname: pendingAudio.context.recipientNickname,
      });
      setInputValue("");
      clearPendingAudio();
    } catch (error) {
      console.error(error);
      setRecordingError("Unable to upload voice note. Try again.");
    } finally {
      setIsUploadingAudio(false);
    }
  };

  const clearRecordingTimer = () => {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const stopRecordingStream = () => {
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
  };

  const startRecording = async () => {
    if (isRecording || isUploadingAudio) return;
    if (pendingAudio) {
      clearPendingAudio();
    }
    if (!conversationId || !otherParticipant) {
      setRecordingError("Open a chat to record a voice note.");
      return;
    }
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setRecordingError("Voice recording is not supported in this browser.");
      return;
    }
    setRecordingError(null);
    setRecordingSeconds(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      recordingContextRef.current = {
        conversationId,
        recipientId: otherParticipant.id,
        recipientNickname: otherParticipant.nickname,
      };
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recordingChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const context = recordingContextRef.current;
        recordingContextRef.current = null;
        setIsRecording(false);
        clearRecordingTimer();
        stopRecordingStream();
        const chunks = recordingChunksRef.current;
        if (!chunks.length || !context) return;
        const blob = new Blob(chunks, {
          type: recorder.mimeType || "audio/webm",
        });
        if (blob.size < 800) return;
        const url = URL.createObjectURL(blob);
        setPendingAudio({
          blob,
          url,
          context,
        });
      };

      recorder.start();
      setIsRecording(true);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error(error);
      setRecordingError("Microphone access denied.");
      recordingContextRef.current = null;
      stopRecordingStream();
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return;
    if (mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  useEffect(() => {
    return () => {
      clearRecordingTimer();
      stopRecordingStream();
    };
  }, []);

  return (
    <div className="relative flex h-screen flex-col bg-[#121212] font-sans selection:bg-kipepeo-pink/30">
      {/* Ambient Background Effects */}
      <div className="fixed left-0 top-0 h-full w-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-900/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-kipepeo-pink/5 rounded-full blur-[100px]"></div>
      </div>

      {/* --- Header --- */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/5 bg-[#121212]/80 px-4 py-3 backdrop-blur-xl transition-all">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/chats")}
            className="group flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/10 active:scale-90"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-400 group-hover:text-white"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <div className="flex items-center gap-3">
            <div className="relative">
              <AppImage
                src={otherParticipant?.photoUrl ?? user.photoUrl}
                className="h-10 w-10 rounded-full object-cover ring-2 ring-transparent transition-all hover:ring-kipepeo-pink/50"
                alt={otherParticipant?.nickname ?? "Chat profile"}
                loading="eager"
                fetchPriority="high"
              />
              {/* Online Status Dot (Visual Polish) */}
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#121212] bg-green-500"></span>
            </div>

            <div className="flex flex-col">
              <h3 className="text-sm font-black tracking-wide text-white">
                {otherParticipant?.nickname ?? "Chat"}
              </h3>
              <span className="text-[9px] font-bold uppercase tracking-widest text-kipepeo-pink">
                Online Now
              </span>
            </div>
          </div>
        </div>

        {/* Option Menu Placeholder */}
        <button className="optionBtn flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-white/5 hover:text-white">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </button>
      </header>

      {/* --- AI Copilot --- */}
      <div className="px-4 pt-3 pb-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-widest text-gray-400">
              AI Copilot
            </span>
            <select
              value={aiTone}
              onChange={(e) => setAiTone(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] uppercase tracking-widest text-gray-200"
            >
              <option value="warm">Warm</option>
              <option value="direct">Direct</option>
              <option value="playful">Playful</option>
              <option value="confident">Confident</option>
            </select>
          </div>
          {aiSummary && (
            <p className="text-xs text-gray-300 mb-3">{aiSummary}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {aiSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setInputValue(suggestion)}
                className="px-3 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase tracking-widest text-gray-300 hover:bg-white/10 active:scale-95"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* --- Messages Area --- */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center space-y-4 opacity-50">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/5 text-4xl grayscale">
              👋
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
              Start the vibe
            </p>
          </div>
        ) : (
          messages.map((m, index) => {
            const isMe = m.senderId === user.id;
            const isLast = index === messages.length - 1;

            return (
              <div
                key={m.id}
                className={`flex w-full ${isMe ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-2 duration-300`}
              >
                <div
                  className={`flex max-w-[75%] flex-col ${isMe ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`relative px-4 py-3 text-sm leading-relaxed shadow-lg space-y-2 ${
                      isMe
                        ? "rounded-2xl rounded-tr-sm bg-gradient-to-br from-kipepeo-pink to-purple-600 text-white"
                        : "rounded-2xl rounded-tl-sm border border-white/5 bg-[#1E1E1E] text-gray-200"
                    }`}
                  >
                    {m.imageUrl && (
                      <div className="overflow-hidden rounded-xl border border-white/10">
                        <AppImage
                          src={m.imageUrl}
                          alt="Shared"
                          className="w-full max-w-[260px] sm:max-w-[320px] object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    {m.audioUrl && (
                      <div className="flex items-center gap-3 rounded-xl bg-black/20 px-3 py-2">
                        <button
                          onClick={() => toggleAudioPlayback(m.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                          aria-label={
                            playingAudioId === m.id
                              ? "Pause voice note"
                              : "Play voice note"
                          }
                        >
                          {playingAudioId === m.id ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <rect x="6" y="5" width="4" height="14" />
                              <rect x="14" y="5" width="4" height="14" />
                            </svg>
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <polygon points="5 3 19 12 5 21 5 3" />
                            </svg>
                          )}
                        </button>
                        <div className="flex flex-1 items-center gap-2">
                          <div className="flex items-end gap-1">
                            {["h-3", "h-5", "h-4", "h-6", "h-3"].map(
                              (height, index) => (
                                <span
                                  key={`${m.id}-wave-${index}`}
                                  className={`w-1 rounded-full bg-white/60 ${height} ${
                                    playingAudioId === m.id
                                      ? "animate-pulse"
                                      : ""
                                  }`}
                                  style={{ animationDelay: `${index * 120}ms` }}
                                ></span>
                              ),
                            )}
                          </div>
                          <span className="text-[10px] uppercase tracking-widest text-gray-300">
                            Voice note
                          </span>
                        </div>
                        <audio
                          ref={(el) => {
                            audioRefs.current[m.id] = el;
                          }}
                          src={m.audioUrl}
                          onEnded={() => setPlayingAudioId(null)}
                          className="hidden"
                        />
                      </div>
                    )}
                    {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
                  </div>
                  {/* Timestamp / Status (Visual Polish) */}
                  <span className="mt-1 text-[9px] font-medium text-gray-600">
                    {isMe && isLast ? "Delivered" : ""}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* --- Input Area --- */}
      <div className="sticky bottom-0 z-20 w-full bg-[#121212] px-4 pb-6 pt-2">
        {/* Gradient Line Top */}
        <div className="absolute left-0 top-0 h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

        {pendingAudio && (
          <div className="mb-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
            <button
              onClick={togglePreviewPlayback}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              aria-label={isPreviewPlaying ? "Pause preview" : "Play preview"}
            >
              {isPreviewPlaying ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <rect x="6" y="5" width="4" height="14" />
                  <rect x="14" y="5" width="4" height="14" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              )}
            </button>

            <div className="flex flex-1 items-center gap-2">
              <div className="flex items-end gap-1">
                {["h-3", "h-5", "h-4", "h-6", "h-3"].map((height, index) => (
                  <span
                    key={`preview-wave-${index}`}
                    className={`w-1 rounded-full bg-white/60 ${height} ${
                      isPreviewPlaying ? "animate-pulse" : ""
                    }`}
                    style={{ animationDelay: `${index * 120}ms` }}
                  ></span>
                ))}
              </div>
              <span className="text-[10px] uppercase tracking-widest text-gray-300">
                Voice note ready
              </span>
            </div>

            <button
              onClick={clearPendingAudio}
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-white/10 hover:text-white"
              aria-label="Discard voice note"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <button
              onClick={sendPendingAudio}
              disabled={isUploadingAudio}
              className={`flex h-9 w-9 items-center justify-center rounded-full shadow-lg transition-all active:scale-95 ${
                isUploadingAudio
                  ? "bg-white/5 text-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-kipepeo-pink to-purple-600 text-white hover:shadow-kipepeo-pink/25"
              }`}
              aria-label="Send voice note"
            >
              {isUploadingAudio ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-kipepeo-pink border-t-transparent"></div>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              )}
            </button>

            <audio
              ref={previewAudioRef}
              src={pendingAudio.url}
              onEnded={() => setIsPreviewPlaying(false)}
              className="hidden"
            />
          </div>
        )}

        <div className="flex items-end gap-2 rounded-3xl bg-[#1E1E1E] p-2 ring-1 ring-white/5 transition-all focus-within:ring-kipepeo-pink/50">
          {/* Attachment Button (Visual) */}
          <button
            onClick={handleSelectPhoto}
            disabled={isUploadingImage}
            aria-label="Attach photo"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
              isUploadingImage
                ? "text-gray-500 cursor-not-allowed"
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            {isUploadingImage ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-kipepeo-pink border-t-transparent"></div>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            )}
          </button>

          {/* Voice Note Button */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isUploadingAudio}
            aria-label="Record voice note"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
              isUploadingAudio
                ? "text-gray-500 cursor-not-allowed"
                : isRecording
                  ? "text-red-300 bg-red-500/10"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            {isUploadingAudio ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-kipepeo-pink border-t-transparent"></div>
            ) : isRecording ? (
              <span className="h-3 w-3 rounded-full bg-red-500"></span>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 1a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10a7 7 0 0 1-14 0" />
                <path d="M12 17v4" />
              </svg>
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoSelected}
            className="hidden"
          />

          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type your vibe..."
            className="max-h-32 min-h-[44px] flex-1 bg-transparent py-3 text-sm text-white placeholder-gray-500 focus:outline-none"
          />

          <button
            onClick={sendMessage}
            disabled={!inputValue.trim()}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-lg transition-all active:scale-95 ${
              inputValue.trim()
                ? "bg-gradient-to-r from-kipepeo-pink to-purple-600 text-white hover:shadow-kipepeo-pink/25"
                : "bg-white/5 text-gray-500 cursor-not-allowed"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={inputValue.trim() ? "ml-0.5" : ""}
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>

        {uploadError && (
          <div className="mt-2 text-[10px] text-red-400">{uploadError}</div>
        )}
        {recordingError && (
          <div className="mt-2 text-[10px] text-red-400">{recordingError}</div>
        )}
        {isRecording && (
          <div className="mt-2 text-[10px] text-rose-300 uppercase tracking-widest">
            Recording...{" "}
            {Math.floor(recordingSeconds / 60)
              .toString()
              .padStart(2, "0")}
            :{(recordingSeconds % 60).toString().padStart(2, "0")}
          </div>
        )}

        {/* Mobile Safe Area Spacer if needed, or keeping space for bottom nav */}
        <div className="h-4"></div>
      </div>
    </div>
  );
};

export default ChatDetailPage;
