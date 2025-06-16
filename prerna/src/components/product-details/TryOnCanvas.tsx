"use client";

import React, { useEffect, useRef, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import type { FaceMesh } from '@mediapipe/face_mesh';
import type { Camera } from '@mediapipe/camera_utils';
import type * as TENSORFLOW from '@tensorflow/tfjs';

interface TryOnCanvasProps {
  webcamEnabled: boolean;
  mainImageUri: string | null;
  onResults: (results: any) => void;
  drawCanvas: () => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  jewelryImageRef: React.MutableRefObject<HTMLImageElement>;
  imageX: React.MutableRefObject<number>;
  imageY: React.MutableRefObject<number>;
  imageScale: React.MutableRefObject<number>;
  onMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  onWheel: (e: React.WheelEvent<HTMLCanvasElement>) => void;
}

export function TryOnCanvas({
  webcamEnabled,
  mainImageUri,
  onResults,
  drawCanvas,
  videoRef,
  canvasRef,
  jewelryImageRef,
  imageX,
  imageY,
  imageScale,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
  onWheel,
}: TryOnCanvasProps) {
  const { toast } = useToast();

  const faceMeshRef = useRef<FaceMesh | null>(null);
  const cameraRef = useRef<Camera | null>(null);

  // Effect to load jewelry image for try-on
  useEffect(() => {
    if (mainImageUri) {
      jewelryImageRef.current.src = mainImageUri;
      jewelryImageRef.current.onload = () => {
        // Center the image initially
        if (canvasRef.current) {
          imageX.current = (canvasRef.current.width / 2) - (jewelryImageRef.current.width * imageScale.current / 2);
          imageY.current = (canvasRef.current.height / 2) - (jewelryImageRef.current.height * imageScale.current / 2);
          drawCanvas(); // Redraw with new image position
        }
      };
    }
  }, [mainImageUri, canvasRef, drawCanvas, imageX, imageY, imageScale, jewelryImageRef]);

  // Effect to handle webcam and MediaPipe Face Mesh setup
  useEffect(() => {
    if (webcamEnabled) {
      const loadMediapipe = async () => {
        try {
          const { FaceMesh } = await import('@mediapipe/face_mesh');
          const { Camera } = await import('@mediapipe/camera_utils');
          const TENSORFLOW = await import('@tensorflow/tfjs');

          // Ensure TensorFlow backend is ready
          TENSORFLOW.setBackend('webgl').then(() => {
            if (!faceMeshRef.current) {
              faceMeshRef.current = new FaceMesh({
                locateFile: (file) => {
                  return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
                },
              });
              faceMeshRef.current.setOptions({
                maxNumFaces: 1,
                refineLandmarks: true,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5,
              });
              faceMeshRef.current.onResults(onResults);
            }

            if (videoRef.current && canvasRef.current && !cameraRef.current) {
              cameraRef.current = new Camera(videoRef.current, {
                onFrame: async () => {
                  if (videoRef.current) {
                    await faceMeshRef.current?.send({ image: videoRef.current });
                  }
                },
                width: 640,
                height: 480,
              });
              cameraRef.current.start();
            }
          });
        } catch (error) {
          console.error("Failed to load Mediapipe or TensorFlow.js:", error);
          toast({
            title: "Try-on Feature Error",
            description: "Could not load necessary components for try-on. Please ensure your browser supports WebGL and try again.",
            variant: "destructive",
          });
        }
      };
      loadMediapipe();
    } else {
      // Clean up when webcam is disabled
      cameraRef.current?.stop();
      cameraRef.current = null;
      faceMeshRef.current = null;
    }

    return () => {
      // Cleanup on unmount
      cameraRef.current?.stop();
      cameraRef.current = null;
      faceMeshRef.current = null;
    };
  }, [webcamEnabled, videoRef, canvasRef, onResults, toast]);

  return (
    <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border">
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover transform scaleX(-1)" autoPlay playsInline hidden={!webcamEnabled}></video>
      <canvas
        ref={canvasRef}
        width="640"
        height="480"
        className="absolute inset-0 w-full h-full"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onWheel={onWheel}
      ></canvas>
    </div>
  );
} 