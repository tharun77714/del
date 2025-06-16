"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Send, Loader2, XCircle, UserCircle, Briefcase, Image as ImageIcon, Link as LinkIcon, Maximize2, Minimize2, Mic, MicOff, Trash2, MoreHorizontal, Check, CheckCheck } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { formatDistanceToNowStrict } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import supabase from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { deleteMessageAction, updateMessageAction } from '@/lib/actions/chat-actions';

// Add TypeScript declarations for the Web Speech API
declare global {
  interface Window {
    SpeechRecognition: new () => {
      continuous: boolean;
      interimResults: boolean;
      lang: string;
      onstart: (() => void) | null;
      onresult: ((event: SpeechRecognitionEvent) => void) | null;
      onerror: ((event: { error: string }) => void) | null;
      onend: (() => void) | null;
      start: () => void;
      stop: () => void;
      abort: () => void;
    };
    webkitSpeechRecognition: new () => {
      continuous: boolean;
      interimResults: boolean;
      lang: string;
      onstart: (() => void) | null;
      onresult: ((event: SpeechRecognitionEvent) => void) | null;
      onerror: ((event: { error: string }) => void) | null;
      onend: (() => void) | null;
      start: () => void;
      stop: () => void;
      abort: () => void;
    };
  }
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
  error: string;
}

interface SpeechRecognitionResultList extends Array<SpeechRecognitionResult> {
  length: number;
}

interface SpeechRecognitionResult extends Array<SpeechRecognitionAlternative> {
  isFinal: boolean;
  length: number;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export function ChatSidebar() {
  const {
    isChatOpen,
    toggleChat,
    closeChat,
    toggleMaximizeChat,
    isChatMaximized,
    conversations,
    messages,
    activeConversationId,
    setActiveConversationId,
    sendMessage,
    isLoadingConversations,
    isLoadingMessages,
    activeConversationTargetProfile,
    fetchConversations,
    setMessages,
  } = useChat();
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageContent, setEditingMessageContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<InstanceType<typeof window.SpeechRecognition> | null>(null);

  const handleEditMessage = (message: any) => {
    setEditingMessageId(message.id);
    setEditingMessageContent(message.content);
    setNewMessage(message.content);
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(message.content.length, message.content.length);
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingMessageContent('');
    setNewMessage('');
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (window.confirm("Are you sure you want to delete this message?")) {
      try {
        await deleteMessageAction(messageId);
        setMessages(prevMessages => prevMessages.filter(msg => msg.id !== messageId));
        toast({
          title: "Message Deleted",
          description: "Your message has been successfully deleted.",
        });
      } catch (error: any) {
        console.error("Error deleting message:", error);
        toast({
          title: "Deletion Failed",
          description: `Could not delete message: ${error.message}`,
          variant: "destructive",
        });
      }
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "0px"; // Reset height to recalculate
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = scrollHeight + "px";
    }
  }, [newMessage, editingMessageContent]); // Recalculate height whenever newMessage or editingMessageContent changes

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("handleSendMessage triggered."); // Debug log
    const messageToSend = editingMessageId ? editingMessageContent.trim() : newMessage.trim();

    if (!messageToSend) {
      console.log("Message to send is empty, returning."); // Debug log
      return;
    }

    if (editingMessageId) {
      console.log(`Attempting to update message with ID: ${editingMessageId}`); // Debug log
      try {
        await updateMessageAction(editingMessageId, messageToSend);
        console.log(`updateMessageAction called for ID: ${editingMessageId}`); // Debug log after call
        setMessages(prevMessages =>
          prevMessages.map(msg =>
            msg.id === editingMessageId ? { ...msg, content: messageToSend } : msg
          )
        );
        toast({
          title: "Message Updated",
          description: "Your message has been successfully updated.",
        });
        handleCancelEdit();
      } catch (error: any) {
        console.error("Client-side error updating message:", error); // Specific error log
        toast({
          title: "Update Failed",
          description: `Could not update message: ${error.message}`,
          variant: "destructive",
        });
      }
    } else {
      console.log("Attempting to send new message."); // Debug log
      await sendMessage(messageToSend, 'text');
      setNewMessage('');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}_${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage.from('chat-images').upload(fileName, file);
      if (error) throw error;
      const { data: publicUrlData } = supabase.storage.from('chat-images').getPublicUrl(fileName);
      const publicUrl = publicUrlData?.publicUrl;
      if (publicUrl) {
        await sendMessage(publicUrl, 'image');
      }
    } catch (err) {
      toast({ 
        title: "Upload Error", 
        description: "Failed to upload image. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setImageUploading(false);
    }
  };

  const handleImageUploadDirect = async (file: File) => {
    setImageUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}_${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage.from('chat-images').upload(fileName, file);
      if (error) throw error;
      const { data: publicUrlData } = supabase.storage.from('chat-images').getPublicUrl(fileName);
      const publicUrl = publicUrlData?.publicUrl;
      if (publicUrl) {
        await sendMessage(publicUrl, 'image');
      }
    } catch (err) {
      toast({
        title: "Upload Error",
        description: "Failed to upload image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setImageUploading(false);
    }
  };

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
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!recognition) {
      const newRecognition = new SpeechRecognitionAPI();
      newRecognition.continuous = false; // Stop after a pause
      newRecognition.interimResults = false; // Only return final results
      newRecognition.lang = 'en-US'; // Set language

      newRecognition.onstart = () => {
        setIsRecording(true);
      };

      newRecognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setNewMessage(prev => (prev + " " + transcript).trim());
      };

      newRecognition.onerror = (event) => {
        setIsRecording(false);
        toast({
          title: "Speech Recognition Error",
          description: `Error: ${event.error}. Please check microphone permissions.`,
          variant: "destructive",
        });
        setRecognition(null); // Reset recognition object on error
      };

      newRecognition.onend = () => {
        setIsRecording(false);
        setRecognition(null); // Reset recognition object when it ends
      };

      setRecognition(newRecognition);
      newRecognition.start();
    } else if (isRecording) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  const getParticipantName = (participant: any) => {
    if (!participant) return 'Unknown User';
    // Prefer full_name (for individuals), fallback to business_name (for stores)
    return participant.full_name || participant.business_name || 'Unknown User';
  };

  const getInitials = (name?: string) => {
    return name?.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() || 'U';
  };

  if (!isChatOpen) return null;

  return (
    <Card className={`fixed right-0 top-16 bottom-0 h-[calc(100vh-4rem)] border-l shadow-xl bg-card z-40 flex flex-col ${isChatMaximized ? 'w-full md:w-full' : 'w-80 md:w-96'}`}>
      <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center">
          <MessageSquare className="mr-2 h-5 w-5 text-primary" />
          Sparkle Chats
        </CardTitle>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={toggleMaximizeChat} className="h-7 w-7">
            {isChatMaximized ? <Minimize2 className="h-5 w-5"/> : <Maximize2 className="h-5 w-5"/>}
            <span className="sr-only">{isChatMaximized ? 'Minimize chat' : 'Maximize chat'}</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={closeChat} className="h-7 w-7">
            <XCircle className="h-5 w-5"/>
            <span className="sr-only">Close chat</span>
          </Button>
        </div>
      </CardHeader>

      {!activeConversationId ? (
        <CardContent className="p-0 flex-1 overflow-hidden">
          {isLoadingConversations ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-10">
              No conversations yet. Start chatting with someone!
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="p-2 space-y-1">
                {conversations.map((convo) => (
                  <Button
                    key={convo.id}
                    variant="ghost"
                    className={cn("w-full justify-start h-auto py-2 px-3 text-left relative", activeConversationId === convo.id && "bg-accent")}
                    onClick={() => setActiveConversationId(convo.id)}
                  >
                    <Avatar className="mr-3 h-9 w-9">
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {getInitials(getParticipantName(convo.otherParticipant))}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <p className="font-medium truncate">{getParticipantName(convo.otherParticipant)}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {convo.last_message_content || "No messages yet."}
                      </p>
                    </div>
                    <div className="flex flex-col items-end ml-2 self-start pt-1">
                      {convo.last_message_at && (
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNowStrict(new Date(convo.last_message_at), { addSuffix: true })}
                        </span>
                      )}
                      {convo.unread_count > 0 && (
                        <Badge variant="destructive" className="mt-1 px-1.5 py-0.5 text-xs h-auto leading-tight">
                          {convo.unread_count > 9 ? '9+' : convo.unread_count}
                        </Badge>
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      ) : (
        <>
          <CardHeader className="p-3 border-b bg-secondary/30">
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="sm" onClick={() => setActiveConversationId(null)} className="mr-1 p-1 h-auto">
                &larr; <span className="ml-1">Back</span>
              </Button>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                  {getInitials(getParticipantName(activeConversationTargetProfile))}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold">{getParticipantName(activeConversationTargetProfile)}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {activeConversationTargetProfile?.role === 'business' ? <Briefcase className="inline mr-1 h-3 w-3"/> : <UserCircle className="inline mr-1 h-3 w-3"/>}
                  {activeConversationTargetProfile?.role || 'User'}
                </p>
              </div>
            </div>
          </CardHeader>
          
          <ScrollArea className="h-full p-4">
            {isLoadingMessages ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-10">
                No messages yet. Say hello!
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex items-end space-x-2 max-w-[85%] group",
                      msg.sender_id === user?.id ? "ml-auto flex-row-reverse space-x-reverse" : "mr-auto"
                    )}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs bg-muted-foreground/20 text-muted-foreground">
                        {getInitials(msg.sender_id === user?.id ? undefined : getParticipantName(activeConversationTargetProfile))}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      "rounded-lg px-3 py-2 text-sm relative flex flex-col",
                      msg.sender_id === user?.id ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      {msg.message_type === 'image' ? (
                        <img src={msg.image_url} alt="Shared image" className="max-w-[200px] rounded" />
                      ) : (
                        msg.content
                      )}
                      {msg.sender_id === user?.id && (
                        <span className="self-end mt-1 flex items-center">
                          {msg.is_read ? (
                            <CheckCheck className="h-3 w-3 text-blue-300 ml-1" />
                          ) : (
                            <Check className="h-3 w-3 text-gray-400 ml-1" />
                          )}
                        </span>
                      )}
                      {msg.sender_id === user?.id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute -top-1 -right-8 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity p-0"
                            >
                              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                              <span className="sr-only">Message options</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditMessage(msg)}>Edit Message</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Message
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          <CardFooter className="p-3 border-t">
            <form onSubmit={handleSendMessage} className="w-full">
              <div
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file && file.type.startsWith('image/')) {
                    handleImageUploadDirect(file);
                  }
                }}
                onDragOver={(e) => e.preventDefault()}
                className="flex items-center space-x-2 w-full bg-[#FFFFF5] p-2 rounded"
                style={{ border: '1px solid #eee' }}
              >
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={imageUploading}
                >
                  <ImageIcon className="h-5 w-5" />
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  ref={imageInputRef}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUploadDirect(file);
                  }}
                />
                <textarea
                  ref={textareaRef}
                  placeholder={editingMessageId ? "Editing message..." : "Type a message..."}
                  value={editingMessageId ? editingMessageContent : newMessage}
                  onChange={(e) => { 
                    if (editingMessageId) setEditingMessageContent(e.target.value);
                    else setNewMessage(e.target.value);
                  }}
                  className="flex-1 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none overflow-hidden"
                  rows={1}
                  autoComplete="off"
                  style={{ background: 'transparent' }}
                />
                {editingMessageId && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelEdit}
                    className="text-destructive"
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={handleSpeechInput}
                  disabled={!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)}
                  className={cn(
                    "shrink-0 transition-colors duration-200 ease-in-out",
                    isRecording ? 'text-red-500 hover:text-red-600 animate-pulse' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  <span className="sr-only">{isRecording ? 'Stop recording' : 'Start recording'}</span>
                </Button>
                <Button type="submit" size="icon" variant="ghost" disabled={!newMessage.trim() && !editingMessageContent.trim()}>
                  {editingMessageId ? <><Check className="h-5 w-5" /> <span className="sr-only">Update</span></> : <><Send className="h-5 w-5" /> <span className="sr-only">Send</span></>}
                </Button>
              </div>
            </form>
            {imageUploading && (
              <p className="text-xs text-muted-foreground mt-2 ml-2">Uploading image...</p>
            )}
          </CardFooter>
        </>
      )}
    </Card>
  );
}
