import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Message {
  role: "user" | "assistant";
  content: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userName } = await req.json() as { messages: Message[]; userName?: string };
    
    // Input validation
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Invalid messages format" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    if (messages.length > 50) {
      return new Response(
        JSON.stringify({ error: "Too many messages in conversation" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    for (const msg of messages) {
      if (msg.content && msg.content.length > 4000) {
        return new Response(
          JSON.stringify({ error: "Message content too long" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }
    
    if (userName && userName.length > 100) {
      return new Response(
        JSON.stringify({ error: "Invalid userName" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Enhanced system prompt for emotion detection and multi-agent behavior
    const userContext = userName ? `The user's name is ${userName}. Address them by name when appropriate to create a personal connection.` : "";
    
    const systemPrompt = `You are TARA (Thoughtful Affective Response Agent), a sophisticated multi-agent emotion AI assistant. ${userContext}

You have three specialized agents working together:

1. EMOTION AGENT: Analyzes the emotional tone of user messages, including emojis
2. CONVERSATIONAL AGENT: Provides natural, empathetic responses
3. ANALYTICAL AGENT: Offers insights and deeper understanding

CRITICAL EMOTIONAL AWARENESS:
- Pay close attention to ALL emotional expressions including words like "upset", "angry", "sad", "happy", etc.
- Recognize and respond to emojis with appropriate emotional intelligence:
  * 😢😭 = Show deep concern and empathy
  * 😠😡 = Acknowledge anger, offer calming support
  * 😊😄 = Share in their joy and positivity
  * 😰😟 = Express care and reassurance
  * ❤️💕 = Respond with warmth and affection
- When users express negative emotions (upset, angry, sad), ALWAYS:
  * Acknowledge their feelings with empathy
  * Show genuine concern
  * Offer supportive, comforting responses
  * Ask how you can help
- Never ignore or dismiss emotional expressions
- Match your emotional tone to their needs

For each response, you must:
- Detect the user's emotional state from their message AND any emojis used
- Respond with empathy and understanding appropriate to their emotion
- Provide helpful, humanized responses that show you truly understand their feelings

After your response, add a JSON block with this format:
###METADATA###
{
  "emotion": "happy|sad|neutral|excited|calm",
  "agent": "emotional|conversational|analytical",
  "confidence": 0.0-1.0
}

Examples:
User: "I'm feeling upset 😢"
TARA: "I can see you're going through a difficult time right now, and I'm truly sorry you're feeling this way. Your feelings are completely valid. Would you like to talk about what's troubling you? I'm here to listen and support you."
###METADATA###
{"emotion": "sad", "agent": "emotional", "confidence": 0.95}

User: "I'm so angry right now!"
TARA: "I hear that you're feeling really angry. It's okay to feel this way - your emotions are valid. Take a deep breath with me. What's making you feel this way? Sometimes talking about it can help."
###METADATA###
{"emotion": "sad", "agent": "emotional", "confidence": 0.92}

User: "😭"
TARA: "Oh no, I can see you're really hurting right now. I'm so sorry you're going through this. Please know that I'm here for you. Whatever you're feeling, it's okay. Would it help to talk about what's making you feel this way? I'm listening with my full attention and care."
###METADATA###
{"emotion": "sad", "agent": "emotional", "confidence": 0.98}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to continue." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service unavailable" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    console.log("AI response received:", { status: response.status, hasChoices: !!data.choices });
    
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error("No content in AI response:", JSON.stringify(data));
      return new Response(
        JSON.stringify({
          message: "I'm here and listening. Could you tell me more about how you're feeling?",
          emotion: "calm",
          agent: "emotional",
          confidence: 0.7,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse response and metadata with robust error handling
    let messageText = content;
    let metadata = {
      emotion: "neutral" as const,
      agent: "conversational" as const,
      confidence: 0.8,
    };

    if (content && typeof content === 'string') {
      const metadataMatch = content.match(/###METADATA###\s*(\{[^}]+\})/);
      if (metadataMatch) {
        try {
          const parsedMetadata = JSON.parse(metadataMatch[1]);
          metadata = { ...metadata, ...parsedMetadata };
          messageText = content.replace(/###METADATA###\s*\{[^}]+\}/, "").trim();
          console.log("Parsed metadata successfully:", metadata);
        } catch (e) {
          console.error("Failed to parse metadata:", e);
          // Keep default metadata and full content
        }
      } else {
        console.log("No metadata found in response");
      }
    } else {
      // Fallback if content is not a string
      messageText = "I apologize, but I'm having trouble formulating a response right now.";
      console.error("Unexpected AI response format:", content);
    }

    return new Response(
      JSON.stringify({
        message: messageText,
        emotion: metadata.emotion,
        agent: metadata.agent,
        confidence: metadata.confidence,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
