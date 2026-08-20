"use client";

// Clean lightweight export stub for backward compatibility
class AudioServiceStub {
  private static instance: AudioServiceStub | null = null;
  public static getInstance(): AudioServiceStub {
    if (!AudioServiceStub.instance) {
      AudioServiceStub.instance = new AudioServiceStub();
    }
    return AudioServiceStub.instance;
  }
}

export const getAudioService = () => AudioServiceStub.getInstance();
