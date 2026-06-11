import { useState } from "react";

export function useVoiceInput() {
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);

  return {
    transcript,
    isListening,
    setTranscript,
    setIsListening,
  };
}
