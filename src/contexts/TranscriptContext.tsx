"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

type TranscriptContextType = {
  transcript: string;
  setTranscript: React.Dispatch<React.SetStateAction<string>>;
};

const TranscriptContext = createContext<TranscriptContextType | undefined>(
  undefined,
);

export function TranscriptProvider({ children }: { children: ReactNode }) {
  const [transcript, setTranscript] = useState("");

  return (
    <TranscriptContext.Provider value={{ transcript, setTranscript }}>
      {children}
    </TranscriptContext.Provider>
  );
}

export function useTranscript() {
  const context = useContext(TranscriptContext);
  if (context === undefined) {
    throw new Error("useTranscript must be used within a TranscriptProvider");
  }
  return context;
}
