"use client";

import { useState, type ChangeEvent, type FormEvent, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Keep Input
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"; // Keep Card components
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Keep Alert
import { Loader2, Sparkles, AlertTriangle, UploadCloud, Image as ImageIcon, Lightbulb, SlidersHorizontal, Info, History, RotateCcw as RevertIcon, Eye, Wand2 } from "lucide-react";
import { customizeJewelry, type CustomizeJewelryInput } from "@/ai/flows/customize-jewelry";
import { enhanceJewelryPrompt, type EnhanceJewelryPromptInput } from "@/ai/flows/enhance-jewelry-prompt"; // Import new flow
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Keep Tabs components
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Mic, MicOff, StopCircle as LucideMicOff, Mic as LucideMic } from 'lucide-react'; // Import Mic and StopCircle
import supabase from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { saveDesignAction } from '@/lib/actions/supabase-actions';
import Script from "next/script"; // Import Script for external JS

// Utility function to convert File to Data URI
const fileToDataUri = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const materials = ["Gold", "Silver", "Rose Gold", "Platinum", "Titanium"];
const materialFinishes = ["Polished", "Matte", "Brushed", "Hammered", "Satin"];
const gemstones = ["Diamond", "Sapphire", "Ruby", "Emerald", "Amethyst", "Opal", "Pearl", "Garnet", "Topaz", "None"];
const gemstoneCuts = ["Round", "Princess", "Oval", "Marquise", "Pear", "Emerald", "Baguette", "Cushion", "Asscher", "Radiant"];
const designStyles = ["Vintage", "Modern", "Art Deco", "Minimalist", "Bohemian", "Nature-Inspired", "Geometric", "Classic", "Abstract"];

const NO_CHANGE_VALUE = "no-change";

interface HistoryItem {
  imageUrl: string;
  description: string;
}

export default function CustomizerPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [baseImageFile, setBaseImageFile] = useState<File | null>(null);
  const [baseImageDataUri, setBaseImageDataUri] = useState<string | null>(null);
  const [initialUploadedImageDataUri, setInitialUploadedImageDataUri] = useState<string | null>(null);
  
  const [customizationTab, setCustomizationTab] = useState<string>("prompt");
  const [customizationPrompt, setCustomizationPrompt] = useState<string>("");
  
  const [manualMaterial, setManualMaterial] = useState<string>(NO_CHANGE_VALUE);
  const [manualMaterialFinish, setManualMaterialFinish] = useState<string>(NO_CHANGE_VALUE);
  const [manualGemstone, setManualGemstone] = useState<string>(NO_CHANGE_VALUE);
  const [manualGemstoneCut, setManualGemstoneCut] = useState<string>(NO_CHANGE_VALUE);
  const [manualDesignStyle, setManualDesignStyle] = useState<string>(NO_CHANGE_VALUE);
  const [manualEngraving, setManualEngraving] = useState<string>("");

  const [customizedImageDataUri, setCustomizedImageDataUri] = useState<string | null>(null);
  const [imageHistory, setImageHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState<boolean>(false); // New state for prompt enhancement
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false); // State for recording status
  const [recognition, setRecognition] = useState<any | null>(null); // State for SpeechRecognition instance
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const clearCustomizationInputs = () => {
    // Stop recording if active when clearing inputs
    if (recognition && isRecording) {
      recognition.stop();
      setIsRecording(false);
      toast({
        title: "Recording Stopped",
        description: "Speech recognition was stopped due to input clear.",
        variant: "default"
      });
    }
    // If recognition instance exists, abort it
    if (recognition) {
      recognition.abort();
    }

    setCustomizationPrompt("");
    setManualMaterial(NO_CHANGE_VALUE);
    setManualMaterialFinish(NO_CHANGE_VALUE);
    setManualGemstone(NO_CHANGE_VALUE);
    setManualGemstoneCut(NO_CHANGE_VALUE);
    setManualDesignStyle(NO_CHANGE_VALUE);
    setManualEngraving("");
  };

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setBaseImageFile(file);
      setError(null);
      try {
        const dataUri = await fileToDataUri(file);
        setBaseImageDataUri(dataUri);
        setInitialUploadedImageDataUri(dataUri); 
        setCustomizedImageDataUri(dataUri); 
        setImageHistory([{ imageUrl: dataUri, description: "Initial image" }]);
        clearCustomizationInputs();
      } catch (err) {
        setError("Failed to load image. Please try again.");
        setBaseImageDataUri(null);
        setInitialUploadedImageDataUri(null);
        setCustomizedImageDataUri(null);
      }
    } else {
      setBaseImageFile(null);
    }
  };

  const generateCustomizationDescription = (): string => {
    if (customizationTab === "prompt") {
      return customizationPrompt.trim();
    } else {
      let descriptionParts: string[] = [];
      
      if (manualMaterial !== NO_CHANGE_VALUE) {
        let materialDesc = `Set material to ${manualMaterial}`;
        if (manualMaterialFinish !== NO_CHANGE_VALUE) {
          materialDesc += ` with a ${manualMaterialFinish.toLowerCase()} finish`;
        }
        descriptionParts.push(materialDesc + ".");
      } else if (manualMaterialFinish !== NO_CHANGE_VALUE) {
        descriptionParts.push(`Apply a ${manualMaterialFinish.toLowerCase()} finish.`);
      }

      if (manualGemstone !== NO_CHANGE_VALUE) {
        if (manualGemstone === "None") {
          descriptionParts.push(`Remove any existing gemstones or ensure no gemstones are present.`);
        } else {
          let gemstoneDesc = `Set gemstone to ${manualGemstone}`;
          if (manualGemstoneCut !== NO_CHANGE_VALUE) {
            gemstoneDesc += ` with a ${manualGemstoneCut.toLowerCase()} cut`;
          }
          descriptionParts.push(gemstoneDesc + ".");
        }
      } else if (manualGemstoneCut !== NO_CHANGE_VALUE) { // If no specific gemstone is chosen but a cut is, imply applying to existing
        descriptionParts.push(`Apply a ${manualGemstoneCut.toLowerCase()} cut to existing gemstone(s).`);
      }
      
      if (manualDesignStyle !== NO_CHANGE_VALUE) {
        descriptionParts.push(`The overall design style should be ${manualDesignStyle.toLowerCase()}.`);
      }

      if (manualEngraving.trim()) {
        descriptionParts.push(`Add engraving: "${manualEngraving.trim()}".`);
      }

      if (descriptionParts.length === 0 && baseImageDataUri) {
        return "Subtly enhance or refine the provided base image.";
      }
      return descriptionParts.join(" ").trim();
    }
  };
  
  const isCustomizationProvided = (): boolean => {
    if (customizationTab === "prompt") {
      return customizationPrompt.trim() !== "";
    } else {
      return (
        manualMaterial !== NO_CHANGE_VALUE ||
        manualMaterialFinish !== NO_CHANGE_VALUE ||
        manualGemstone !== NO_CHANGE_VALUE || // Covers explicit gemstone selection (including "None")
        manualGemstoneCut !== NO_CHANGE_VALUE || // Covers cases where only cut is changed (implies existing gemstone)
        manualDesignStyle !== NO_CHANGE_VALUE ||
        manualEngraving.trim() !== ""
      );
    }
  };

  const handleEnhancePrompt = async () => {
    if (!customizationPrompt.trim()) {
      toast({
        title: "Cannot Enhance Empty Prompt",
        description: "Please type your initial idea before enhancing.",
        variant: "default"
      });
      return;
    }
    setIsEnhancingPrompt(true);
    setError(null);
    try {
      const input: EnhanceJewelryPromptInput = { currentPrompt: customizationPrompt };
      const result = await enhanceJewelryPrompt(input);
      setCustomizationPrompt(result.enhancedPrompt);
      toast({
        title: "Prompt Enhanced!",
        description: "The AI has expanded on your idea. You can edit it further or generate your design.",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred while enhancing the prompt.";
      setError(errorMessage);
      toast({
        title: "Prompt Enhancement Failed",
        description: errorMessage,
        variant: "destructive",
        duration: 7000,
      });
    } finally {
      setIsEnhancingPrompt(false);
    }
  };

  // Function to handle speech recognition start/stop
  const handleSpeechInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "Speech Input Not Supported",
        description: "Your browser does not support speech recognition. Please use a modern browser like Chrome or Edge.",
        variant: "destructive",
      });
      return;
    }

    // Use webkitSpeechRecognition for broader browser support, fallback to SpeechRecognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!recognition) {
      const newRecognition = new SpeechRecognition();
      newRecognition.continuous = false; // Stop after a pause
      newRecognition.interimResults = false; // Only return final results
      newRecognition.lang = 'en-US'; // Set language

      newRecognition.onstart = () => {
        setIsRecording(true);
        setError(null); // Clear any previous errors on start
      };

      newRecognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setCustomizationPrompt(prev => (prev + " " + transcript).trim());
      };

      newRecognition.onerror = (event: any) => {
        setIsRecording(false);
        setError(`Speech recognition error: ${event.error}`);
        toast({
          title: "Speech Recognition Error",
          description: `Error: ${event.error}. Please check microphone permissions.`,
          variant: "destructive",
          duration: 7000,
        });
      };

      newRecognition.onend = () => {
        setIsRecording(false);
      };
      setRecognition(newRecognition);
    }

    if (isRecording) {
      recognition?.stop(); // Stop recording if already active
    } else {
      // Abort previous recording if it exists before starting a new one
      if (recognition) {
        recognition.abort();
      }
      recognition?.start(); // Start recording
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const finalCustomizationDescription = generateCustomizationDescription();

    if (!finalCustomizationDescription && !baseImageDataUri) {
       setError("Please describe your new design or select manual options.");
       return;
    }
    if (!finalCustomizationDescription && baseImageDataUri && !isCustomizationProvided()) { 
        setError("Please describe your customization or select manual options for the current base image.");
        return;
    }
    
    setError(null);
    setIsLoading(true);
    
    try {
      const input: CustomizeJewelryInput = {
        customizationDescription: finalCustomizationDescription || "Create a new jewelry design.",
      };
      if (baseImageDataUri) {
        input.baseJewelryDataUri = baseImageDataUri;
      }
      
      const result = await customizeJewelry(input);
      const newHistoryItem: HistoryItem = { 
        imageUrl: result.customizedJewelryDataUri, 
        description: finalCustomizationDescription || (baseImageDataUri ? "Subtle refinement" : "New design from empty prompt") 
      };

      setCustomizedImageDataUri(result.customizedJewelryDataUri);
      setBaseImageDataUri(result.customizedJewelryDataUri); 
      setBaseImageFile(null); 

      setImageHistory(prevHistory => {
        const updatedHistory = [newHistoryItem, ...prevHistory.filter(item => item.imageUrl !== result.customizedJewelryDataUri)];
        return updatedHistory.slice(0, 3); 
      });
      clearCustomizationInputs(); 
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred during customization.";
      setError(errorMessage);
      toast({
        title: "Customization Failed",
        description: errorMessage,
        variant: "destructive",
        duration: 7000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleHistoryImageSelect = (historyItem: HistoryItem) => {
    setCustomizedImageDataUri(historyItem.imageUrl); 
    setBaseImageDataUri(historyItem.imageUrl); 
    setBaseImageFile(null);
    clearCustomizationInputs(); 
  };

  const handleRevertToInitial = () => {
    if (!initialUploadedImageDataUri) return;
    setBaseImageDataUri(initialUploadedImageDataUri);
    setCustomizedImageDataUri(initialUploadedImageDataUri); 
    setBaseImageFile(null);
    const initialHistoryEntry: HistoryItem = { imageUrl: initialUploadedImageDataUri, description: "Initial image" };
    setImageHistory(prev => [initialHistoryEntry, ...prev.filter(item => item.imageUrl !== initialUploadedImageDataUri)].slice(0,3));
    clearCustomizationInputs();
  };

  const handleStartOver = () => {
    setBaseImageFile(null);
    setBaseImageDataUri(null);
    setInitialUploadedImageDataUri(null);
    setCustomizedImageDataUri(null);
    setImageHistory([]);
    clearCustomizationInputs();
    setError(null);
  };

  const handleViewDetails = () => {
    if (!customizedImageDataUri) return;
    
    const currentHistoryItem = imageHistory.find(item => item.imageUrl === customizedImageDataUri);
    const promptForDetails = currentHistoryItem?.description || 
                             (baseImageDataUri === customizedImageDataUri && initialUploadedImageDataUri === customizedImageDataUri ? "Initial image" : "Customized jewelry");

    if (customizedImageDataUri) {
      try {
        sessionStorage.setItem('productDetailsImageUri', customizedImageDataUri);
        sessionStorage.setItem('productDetailsPrompt', promptForDetails);
        router.push('/dashboard/product-details');
      } catch (e) {
        console.error("Error using sessionStorage:", e);
        setError("Could not navigate to details page. Your browser might be blocking session storage or it's full.");
        toast({
          title: "Navigation Error",
          description: "Could not navigate to details page. Your browser might be blocking session storage or it's full.",
          variant: "destructive",
        });
      }
    }
  };

  const handleSaveModel = async () => {
    if (!customizedImageDataUri || !user) return;
    try {
      const { error } = await saveDesignAction({
        user_id: user.id,
        image_data_uri: customizedImageDataUri,
        design_prompt: imageHistory.find(item => item.imageUrl === customizedImageDataUri)?.description || '',
      });
      if (error) throw error;
      toast({ title: 'Saved!', description: 'Model saved to your profile.' });
    } catch (err) {
      toast({ title: 'Save failed', description: 'Could not save model.', variant: 'destructive' });
    }
  };
  
  if (!isMounted) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const noChangeText = baseImageDataUri ? "No Change" : "Not Specified";
  const showGemstoneCut = manualGemstone !== NO_CHANGE_VALUE && manualGemstone !== "None";
  const canRevertToInitial = initialUploadedImageDataUri && baseImageDataUri !== initialUploadedImageDataUri;

  const submitButtonText = baseImageDataUri ? "Refine This Design" : "Generate New Design";
  const submitButtonDisabled = isLoading || isEnhancingPrompt ||
                               (!isCustomizationProvided() && !baseImageDataUri) ||
                               (baseImageDataUri && !isCustomizationProvided() && !baseImageFile); 

  return (
    <div className="space-y-8 pb-16">
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-semibold text-foreground mb-2">
          AI Jewelry Customizer
        </h1>
        <p className="text-muted-foreground">
          Upload an image to customize, or describe a new design. Each step builds on the last.
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="animate-in fade-in duration-300">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center"><Sparkles className="mr-2 h-6 w-6 text-primary"/>Design Your Masterpiece</CardTitle>
          <CardDescription>Upload an image to modify, or use the prompt/controls to generate a new design. Each generation becomes the base for the next refinement.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="baseImage" className="text-lg font-medium">1. Upload Initial Jewelry Image (Optional)</Label>
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="baseImage"
                  className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-accent/10 border-input transition-colors"
                >
                  {baseImageDataUri && !baseImageFile ? ( 
                     <div className="relative w-36 h-36">
                        <Image src={baseImageDataUri} alt="Current Base" layout="fill" objectFit="contain" className="rounded-md" />
                     </div>
                  ) : baseImageFile && baseImageDataUri ? ( 
                     <div className="relative w-36 h-36">
                        <Image src={baseImageDataUri} alt="Preview" layout="fill" objectFit="contain" className="rounded-md" />
                     </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-muted-foreground">
                      <UploadCloud className="w-10 h-10 mb-3" />
                      <p className="mb-2 text-sm"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                      <p className="text-xs">PNG, JPG, WEBP (MAX. 5MB)</p>
                    </div>
                  )}
                  <Input id="baseImage" type="file" accept="image/png, image/jpeg, image/webp" onChange={handleImageChange} className="hidden" />
                </label>
              </div>
               {baseImageDataUri && (
                <>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {canRevertToInitial && (
                       <Button variant="outline" size="sm" onClick={handleRevertToInitial} className="w-full">
                         <RevertIcon className="mr-2 h-4 w-4"/> Use Initial Upload as Base
                       </Button>
                    )}
                  </div>
                  <div className="mt-2 p-3 bg-accent/10 rounded-md border border-accent/30">
                    <div className="flex items-start text-accent">
                      <Info className="h-5 w-5 mr-2 shrink-0 mt-0.5" />
                      <p className="text-xs">
                        <strong>Tip:</strong> If your image has multiple items, be specific in your prompt. Example: "Change the earrings to silver". The current image shown in "Current Base Design" below (if any) will be the base for the next AI customization.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-lg font-medium">2. Choose Customization Method</Label>
              <Tabs value={customizationTab} onValueChange={setCustomizationTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="prompt"><Lightbulb className="mr-2 h-4 w-4" />Prompt AI</TabsTrigger>
                  <TabsTrigger value="manual"><SlidersHorizontal className="mr-2 h-4 w-4" />Manual Controls</TabsTrigger>
                </TabsList>
                <TabsContent value="prompt" className="pt-4 space-y-2">
                    <Label htmlFor="customizationPrompt" className="text-base font-normal">
                      {baseImageDataUri ? "Describe changes to the current base image" : "Describe the new jewelry design you want to create"}
                    </Label>
                    <Textarea
                        id="customizationPrompt"
                        value={customizationPrompt}
                        onChange={(e) => setCustomizationPrompt(e.target.value)}
                        placeholder={baseImageDataUri 
                            ? "e.g., 'Change the gemstone to a large oval sapphire with a vintage style', 'Add floral engravings with a matte finish'" 
                            : "e.g., 'A silver necklace with a crescent moon pendant, polished finish, and small blue stars', 'Gold ring, ruby gemstone, emerald cut, art deco style'"
                        }
                        rows={5}
                        className="text-base pr-10" // Add padding for the icon
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                          type="button"
                          variant="outline"
                          onClick={handleEnhancePrompt}
                          disabled={isEnhancingPrompt || isLoading || !customizationPrompt.trim()}
                          className="flex-1 sm:flex-none"
                      >
                          {isEnhancingPrompt ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                          ENHANCE MY PROMPT
                      </Button> 
                       <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handleSpeechInput}
                        disabled={isLoading || isEnhancingPrompt || !('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)}
                        className={`shrink-0 transition-colors duration-200 ease-in-out ${isRecording ? 'text-red-500 hover:text-red-600 animate-pulse' : 'text-muted-foreground hover:text-foreground'}`}
                        aria-label={isRecording ? "Stop speech input" : "Start speech input"}
                      >
                        {isRecording ? <LucideMicOff size={20} /> : <LucideMic size={20} />}
                    </Button>
                    </div>
                </TabsContent>
                 <TabsContent value="manual" className="pt-4 space-y-6">
                   <p className="text-sm text-muted-foreground">
                    {baseImageDataUri 
                        ? "Apply specific changes to the current base image." 
                        : "Define attributes for a new jewelry design."
                    }
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="manualMaterial" className="text-base font-normal">Material</Label>
                      <Select value={manualMaterial} onValueChange={setManualMaterial}>
                        <SelectTrigger id="manualMaterial"><SelectValue placeholder="Select material" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_CHANGE_VALUE}><em>{noChangeText}</em></SelectItem>
                          {materials.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manualMaterialFinish" className="text-base font-normal">Material Finish</Label>
                      <Select value={manualMaterialFinish} onValueChange={setManualMaterialFinish}>
                        <SelectTrigger id="manualMaterialFinish"><SelectValue placeholder="Select finish" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_CHANGE_VALUE}><em>{noChangeText}</em></SelectItem>
                          {materialFinishes.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="manualGemstone" className="text-base font-normal">Gemstone</Label>
                      <Select value={manualGemstone} onValueChange={setManualGemstone}>
                        <SelectTrigger id="manualGemstone"><SelectValue placeholder="Select gemstone" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_CHANGE_VALUE}><em>{noChangeText}</em></SelectItem>
                          {gemstones.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {showGemstoneCut && (
                      <div className="space-y-2">
                        <Label htmlFor="manualGemstoneCut" className="text-base font-normal">Gemstone Cut</Label>
                        <Select value={manualGemstoneCut} onValueChange={setManualGemstoneCut}>
                          <SelectTrigger id="manualGemstoneCut"><SelectValue placeholder="Select cut" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NO_CHANGE_VALUE}><em>{noChangeText}</em></SelectItem>
                            {gemstoneCuts.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manualDesignStyle" className="text-base font-normal">Overall Design Style</Label>
                    <Select value={manualDesignStyle} onValueChange={setManualDesignStyle}>
                      <SelectTrigger id="manualDesignStyle"><SelectValue placeholder="Select style" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_CHANGE_VALUE}><em>{noChangeText}</em></SelectItem>
                        {designStyles.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manualEngraving" className="text-base font-normal">Engraving Text</Label>
                    <Input
                      id="manualEngraving"
                      type="text"
                      value={manualEngraving}
                      onChange={(e) => setManualEngraving(e.target.value)}
                      placeholder="e.g., 'Forever Yours', 'Initials: A&amp;B' (optional)"
                      className="text-base"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <Button type="submit" disabled={!!submitButtonDisabled} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-6">
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-5 w-5" />
              )}
              {submitButtonText}
            </Button>
            {baseImageDataUri && (
              <Button variant="destructive" onClick={handleStartOver} className="w-full mt-4">
                GENERATE NEW DESIGN (START OVER)
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {(isLoading || customizedImageDataUri || (baseImageDataUri && !baseImageFile) ) && (
         <div className="grid md:grid-cols-2 gap-8 mt-12">
          {baseImageDataUri && !isLoading && !baseImageFile && ( 
            <Card className="animate-in fade-in duration-500">
              <CardHeader>
                <CardTitle className="text-xl flex items-center"><ImageIcon className="mr-2 h-5 w-5 text-muted-foreground"/>Current Base Design</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center items-center p-4 min-h-[300px]">
                <Image src={baseImageDataUri} alt="Base Jewelry for next customization" width={400} height={400} className="rounded-lg object-contain max-h-[400px]" />
              </CardContent>
            </Card>
          )}

          {isLoading && (
            <Card className={`animate-in fade-in duration-500 ${(!baseImageDataUri || baseImageFile) || isLoading ? 'md:col-span-2' : ''}`}>
              <CardHeader>
                <CardTitle className="text-xl flex items-center">
                    <Sparkles className="mr-2 h-5 w-5 text-primary animate-pulse"/>
                    {baseImageDataUri ? "Refining Design..." : "Generating New Design..."}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col justify-center items-center p-4 min-h-[300px] text-muted-foreground">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p>AI is working its magic...</p>
                <p>This may take a moment.</p>
              </CardContent>
            </Card>
          )}

          {customizedImageDataUri && !isLoading && (
            <Card className={`animate-in fade-in duration-500 ${(!baseImageDataUri || baseImageFile) && !isLoading ? 'md:col-span-2' : ''}`}>
              <CardHeader>
                <CardTitle className="text-xl flex items-center">
                    <Sparkles className="mr-2 h-5 w-5 text-primary"/>
                    Latest AI Result
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col justify-center items-center p-4 min-h-[300px]">
                <Image src={customizedImageDataUri} alt="Customized or Generated Jewelry" width={400} height={400} className="rounded-lg object-contain max-h-[400px]" />
                <div className="flex gap-2 mt-4 w-full sm:w-auto">
                    <Button onClick={handleViewDetails} variant="outline" className="flex-1 border-accent text-accent hover:bg-accent/10" disabled={!customizedImageDataUri || isLoading}>
                      <Eye className="mr-2 h-4 w-4" /> Details
                    </Button>
                </div>
                <Button onClick={handleSaveModel} variant="default" className="mt-4 w-full">
                  Save Model
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {imageHistory.length > 0 && !isLoading && (customizedImageDataUri || (baseImageDataUri && !baseImageFile)) && (
        <Card className="mt-8 animate-in fade-in duration-500">
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <History className="mr-2 h-5 w-5 text-muted-foreground" /> Design History (Last 3 Iterations)
            </CardTitle>
            <CardDescription>Click an image to view it and use it as the new base for further customization. Inputs above will be cleared. Hover over an image to see the prompt used.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4">
            {imageHistory.map((historyItem, index) => (
              <button
                key={index}
                title={historyItem.description}
                onClick={() => handleHistoryImageSelect(historyItem)}
                className={`border rounded-lg overflow-hidden hover:shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${baseImageDataUri === historyItem.imageUrl ? 'ring-2 ring-primary shadow-lg scale-105' : 'hover:opacity-80'}`}
                aria-label={`View design version ${imageHistory.length - index}. Prompt: ${historyItem.description.substring(0, 50)}...`}
              >
                <Image
                  src={historyItem.imageUrl}
                  alt={`History image ${imageHistory.length - index} - ${historyItem.description.substring(0,30)}...`}
                  width={200}
                  height={200}
                  className="object-contain w-full h-full aspect-square bg-muted/10"
                />
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
