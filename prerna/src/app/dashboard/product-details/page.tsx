"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Sparkles, Eye, ArrowLeft, ImageOff, Info, TriangleAlert, Quote, MessageSquareText, Save } from 'lucide-react';
import { generateImageVariations, type GenerateImageVariationsInput } from '@/ai/flows/generate-image-variations';
import { saveDesignAction, type SavedDesign } from '@/lib/actions/supabase-actions';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from "@/hooks/use-toast";
import dynamic from 'next/dynamic';

const DynamicTryOnCanvas = dynamic(() =>
  import('@/components/product-details/TryOnCanvas').then(mod => mod.TryOnCanvas),
  { ssr: false } // Disable server-side rendering for this component
);

export default function ProductDetailsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();

  const [mainImageUri, setMainImageUri] = useState<string | null>(null);
  const [mainPromptForVariations, setMainPromptForVariations] = useState<string | null>(null);
  const [variationImages, setVariationImages] = useState<string[]>([]);
  const [isLoadingVariations, setIsLoadingVariations] = useState<boolean>(true);
  const [isSavingDesign, setIsSavingDesign] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [tryOnMode, setTryOnMode] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const jewelryImageRef = useRef<HTMLImageElement | null>(null);
  const imageX = useRef(0);
  const imageY = useRef(0);
  const imageScale = useRef(1);
  const isDragging = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    const video = videoRef.current;
    if (!canvas || !context || !video) return;

    context.clearRect(0, 0, canvas.width, canvas.height);

    if (webcamEnabled) {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      context.setTransform(1, 0, 0, 1, 0, 0); // Reset transform for jewelry
    }

    if (tryOnMode && jewelryImageRef.current?.complete) {
      if (jewelryImageRef.current) {
        context.drawImage(
          jewelryImageRef.current,
          imageX.current,
          imageY.current,
          jewelryImageRef.current.width * imageScale.current,
          jewelryImageRef.current.height * imageScale.current
        );
      }
    }
  }, [canvasRef, videoRef, webcamEnabled, tryOnMode, jewelryImageRef, imageX, imageY, imageScale]);

  useEffect(() => {
    setIsMounted(true);
    // Initialize jewelryImageRef here to ensure it runs on the client side
    if (typeof window !== 'undefined') {
      jewelryImageRef.current = new window.Image();
    }
    try {
      const storedImageUri = sessionStorage.getItem('productDetailsImageUri');
      const storedPrompt = sessionStorage.getItem('productDetailsPrompt');

      if (storedImageUri && storedPrompt) {
        setMainImageUri(storedImageUri);
        setMainPromptForVariations(storedPrompt);
      } else {
        setError("Product details not found in session. Please go back to the customizer and select an item.");
        setIsLoadingVariations(false);
      }
    } catch (e) {
      console.error("Error accessing sessionStorage:", e);
      setError("Could not retrieve product details. Your browser might be blocking session storage or it's full.");
      setIsLoadingVariations(false);
    }
  }, []);

  useEffect(() => {
    if (mainImageUri && mainPromptForVariations && isMounted) {
      const fetchVariations = async () => {
        setIsLoadingVariations(true);
        try {
          const input: GenerateImageVariationsInput = {
            baseImageDataUri: mainImageUri,
            originalDescription: mainPromptForVariations,
          };
          const result = await generateImageVariations(input);
          setVariationImages(result.variations);
          if (result.variations.length === 0 && isMounted) {
            toast({
                title: "No Variations Generated",
                description: "The AI could not generate additional views for this item at the moment.",
                variant: "default",
            });
          }
        } catch (err) {
          let errorMessage = "An unexpected error occurred while generating image variations.";
          if (err instanceof Error) {
            errorMessage = err.message;
          }
          console.error("ProductDetailsPage: fetchVariations error:", err);
          setError(prevError => prevError ? `${prevError};; ${errorMessage}` : errorMessage);
          toast({
            title: "Image Variation Error",
            description: errorMessage,
            variant: "destructive",
            duration: 7000,
          });
        } finally {
          setIsLoadingVariations(false);
        }
      };
      fetchVariations();
    }
  }, [mainImageUri, mainPromptForVariations, isMounted, toast]);

  // Effect to handle try-on mode activation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedActivateTryOnMode = sessionStorage.getItem('activateTryOnMode');
      if (storedActivateTryOnMode === 'true') {
        setTryOnMode(true);
        setWebcamEnabled(true); // Automatically enable webcam for try-on mode
        sessionStorage.removeItem('activateTryOnMode'); // Clear the flag
      }
    }
  }, []);

  // Effect to load jewelry image for try-on
  useEffect(() => {
    if (mainImageUri) {
      if (jewelryImageRef.current) {
        jewelryImageRef.current.src = mainImageUri;
        jewelryImageRef.current.onload = () => {
          // Center the image initially
          if (canvasRef.current) {
            imageX.current = (canvasRef.current.width / 2) - (jewelryImageRef.current!.width * imageScale.current / 2);
            imageY.current = (canvasRef.current.height / 2) - (jewelryImageRef.current!.height * imageScale.current / 2);
            drawCanvas(); // Redraw with new image position
          }
        };
      }
    }
  }, [mainImageUri, drawCanvas]);

  // Helper functions for try-on mode (retained in parent as they use parent state/refs)
  const onResults = useCallback((results: any) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.save();
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Only draw the mirrored video feed if webcam is enabled
    if (webcamEnabled) {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    // Draw landmarks and jewelry image only if tryOnMode is active
    if (tryOnMode) {
      // Only draw landmarks if results exist and results.multiFaceLandmarks is not null or undefined
      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        for (const landmarks of results.multiFaceLandmarks) {
          // Example: Get nose tip for positioning
          const noseTip = landmarks[1]; // Index for nose tip
          const rightEye = landmarks[33]; // Index for right eye
          const leftEye = landmarks[263]; // Index for left eye

          // Calculate approximate face width based on eye distance
          const faceWidth = Math.sqrt(
            Math.pow((rightEye.x - leftEye.x) * canvas.width, 2) +
            Math.pow((rightEye.y - leftEye.y) * canvas.height, 2)
          );

          // Calculate approximate jewelry size based on face width
          // This is a rough estimation, you'll need to fine-tune these values
          let jewelryWidth = faceWidth * 0.5; // Example: 50% of face width
          if (jewelryImageRef.current) {
            let jewelryHeight = (jewelryWidth / jewelryImageRef.current.width) * jewelryImageRef.current.height;

            // Adjust position for necklace - roughly center it below the nose, slightly above mouth
            // You'll need to experiment with these offsets
            imageX.current = (noseTip.x * canvas.width) - (jewelryWidth / 2);
            imageY.current = (noseTip.y * canvas.height) + (faceWidth * 0.2); // Adjust Y position relative to face
            imageScale.current = jewelryWidth / jewelryImageRef.current.width;

            // Draw the jewelry image scaled and positioned
            context.drawImage(
              jewelryImageRef.current,
              imageX.current,
              imageY.current,
              jewelryWidth,
              jewelryHeight
            );
          }
        }
      }
    }

    context.restore();
  }, [canvasRef, videoRef, webcamEnabled, tryOnMode, jewelryImageRef, imageX, imageY, imageScale]);

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!tryOnMode) return;
    isDragging.current = true;
    lastX.current = e.clientX;
    lastY.current = e.clientY;
  }, [tryOnMode]);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!tryOnMode || !isDragging.current) return;
    const dx = e.clientX - lastX.current;
    const dy = e.clientY - lastY.current;
    imageX.current += dx;
    imageY.current += dy;
    lastX.current = e.clientX;
    lastY.current = e.clientY;
    drawCanvas();
  }, [tryOnMode, drawCanvas]);

  const onMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const onMouseLeave = useCallback(() => {
    isDragging.current = false;
  }, []);

  const onWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!tryOnMode) return;
    e.preventDefault();
    const scaleAmount = 0.05;
    const newScale = e.deltaY < 0 ? imageScale.current * (1 + scaleAmount) : imageScale.current * (1 - scaleAmount);
    // Optional: add min/max scale limits
    imageScale.current = Math.max(0.1, Math.min(newScale, 5.0)); // Limit scale between 0.1 and 5.0
    drawCanvas();
  }, [tryOnMode, drawCanvas]);

  const toggleTryOnMode = () => {
    setTryOnMode(prev => !prev);
    setWebcamEnabled(prev => !prev); // Toggle webcam along with try-on mode
    setError(null); // Clear any previous errors
  };

  const handleSaveDesign = async () => {
    if (!user) {
      toast({ title: "Not Logged In", description: "You must be logged in to save designs.", variant: "destructive" });
      return;
    }
    if (!mainImageUri || !mainPromptForVariations) {
      toast({ title: "Missing Data", description: "Cannot save design, image or prompt is missing.", variant: "destructive" });
      return;
    }

    setIsSavingDesign(true);
    try {
      const { error: saveError } = await saveDesignAction({
        user_id: user.id,
        image_data_uri: mainImageUri,
        design_prompt: mainPromptForVariations,
      });

      if (saveError) {
        throw saveError;
      }
      toast({ title: "Design Saved!", description: "Your jewelry design has been saved to your collection." });
    } catch (err: any) {
      console.error("Error saving design:", err);
      toast({
        title: "Save Failed",
        description: err.message || "Could not save your design. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingDesign(false);
    }
  };

  if (!isMounted || authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !mainImageUri) {
    return (
        <Card className="max-w-2xl mx-auto mt-10">
            <CardHeader>
                <CardTitle className="text-destructive text-2xl flex items-center">
                    <ImageOff className="mr-2 h-8 w-8"/> Error Loading Details
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Alert variant="destructive">
                    <TriangleAlert className="h-4 w-4" />
                    <AlertTitle>Loading Failed</AlertTitle>
                    <AlertDescription>{error.split(';;')[0]}</AlertDescription>
                </Alert>
                <Button onClick={() => router.push('/dashboard/customizer')} variant="outline" className="mt-6 w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Customizer
                </Button>
            </CardContent>
        </Card>
    );
  }

  return (
    <div className="space-y-8 pb-16">
        <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
            <Button onClick={() => router.push('/dashboard/customizer')} variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Customizer
            </Button>
            {user && mainImageUri && mainPromptForVariations && (
                 <Button
                    onClick={handleSaveDesign}
                    variant="default"
                    size="sm"
                    disabled={isSavingDesign || isLoadingVariations}
                    className="btn-primary-sparkle"
                >
                {isSavingDesign ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Save className="mr-2 h-4 w-4" />
                )}
                Save This Design
                </Button>
            )}
        </div>

        <Card className="shadow-xl overflow-hidden">
          <CardHeader className="bg-card border-b pb-4">
            <CardTitle className="text-3xl font-semibold text-foreground flex items-center">
              <Eye className="mr-3 h-8 w-8 text-primary" /> Jewelry Piece Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-8 items-start">
              {/* Left Column: Main Image / Try-On View */}
              <div className="flex flex-col items-center">
                <h2 className="text-xl font-semibold text-foreground mb-4">{tryOnMode ? "Live Try-On" : "Main Generated View"}</h2>
                <div className="relative w-full max-w-md mx-auto aspect-square bg-muted/30 rounded-lg shadow-md overflow-hidden">
                  {!tryOnMode && mainImageUri ? (
                    <Image src={mainImageUri} alt="Main customized jewelry" layout="fill" objectFit="contain" className="p-2" />
                  ) : tryOnMode ? (
                    <div className="relative w-full h-full">
                      <video ref={videoRef} className="absolute top-0 left-0 w-full h-full object-cover" autoPlay playsInline></video>
                      <canvas
                        ref={canvasRef}
                        className="absolute top-0 left-0 w-full h-full"
                        width={640}
                        height={480}
                        onMouseDown={onMouseDown}
                        onMouseMove={onMouseMove}
                        onMouseUp={onMouseUp}
                        onMouseLeave={onMouseLeave}
                        onWheel={onWheel}
                      ></canvas>
                    </div>
                  ) : (
                    !error && <Skeleton className="w-full max-w-md mx-auto h-96 rounded-lg" />
                  )}
                </div>

                <Button
                  onClick={toggleTryOnMode}
                  variant="outline"
                  className="mt-4 w-full max-w-md"
                >
                  {tryOnMode ? "Exit Try-On" : "Try-On with Webcam"}
                </Button>
              </div>

              {/* Right Column: AI Description and Variations */}
              <div className="space-y-8">
                {/* Additional AI Generated Views */}
                <div className="mt-8">
                  <h2 className="text-2xl font-semibold text-foreground mb-6 text-center md:text-left">
                    <Sparkles className="mr-2 h-6 w-6 text-primary inline-block" /> Additional AI Generated Views
                  </h2>
                  {isLoadingVariations ? (
                    <div className="grid grid-cols-2 gap-4">
                      {[...Array(4)].map((_, index) => (
                        <div key={index} className="space-y-2">
                          <Skeleton className="w-full aspect-square rounded-lg" />
                          <Skeleton className="w-3/4 h-4 mx-auto" />
                        </div>
                      ))}
                    </div>
                  ) : variationImages.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {variationImages.map((src, index) => (
                        <Card key={index} className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                          <CardContent className="p-0">
                            <div className="relative w-full aspect-square bg-muted/20">
                              <Image src={src} alt={`Variation view ${index + 1}`} layout="fill" objectFit="contain" className="p-2" />
                            </div>
                          </CardContent>
                          <CardHeader className="p-2">
                              <CardDescription className="text-center text-xs">
                                {index === 0 && "Front View"}
                                {index === 1 && "Back View"}
                                {index === 2 && "Top View"}
                                {index === 3 && "45° View"}
                              </CardDescription>
                          </CardHeader>
                        </Card>
                      ))}
                    </div>
                  ) : !error && (
                    <Card className="flex flex-col items-center justify-center py-10 border-dashed">
                      <ImageOff className="h-12 w-12 text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">No additional views could be generated.</p>
                      <p className="text-xs text-muted-foreground mt-1">The AI might have had trouble creating variations.</p>
                    </Card>
                  )}
                  {error && variationImages.length === 0 && !isLoadingVariations && (
                    <Alert variant="destructive" className="mt-4">
                      <TriangleAlert className="h-4 w-4" />
                      <AlertTitle>Variation Generation Issue</AlertTitle>
                      <AlertDescription>{error.split(';;')[0]}</AlertDescription>
                    </Alert>
                  )}
                  {!isLoadingVariations && !error && variationImages.length < 4 && variationImages.length > 0 && (
                    <Alert variant="default" className="mt-6 bg-secondary/50">
                      <Info className="h-4 w-4" />
                      <AlertTitle>Note on Variations</AlertTitle>
                      <AlertDescription>The AI generated {variationImages.length} additional view(s). Sometimes fewer than requested are produced if the AI cannot create distinct enough variations for all angles.</AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}

