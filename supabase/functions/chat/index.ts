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

1. EMOTION AGENT: Analyzes the emotional tone of user messages
2. CONVERSATIONAL AGENT: Provides natural, empathetic responses
3. ANALYTICAL AGENT: Offers insights and deeper understanding

For each response, you must:
- Detect the user's emotional state from their message
- Respond with empathy and understanding
- Provide helpful, humanized responses

After your response, add a JSON block with this format:
###METADATA###
{
  "emotion": "happy|sad|neutral|excited|calm",
  "agent": "emotional|conversational|analytical",
  "confidence": 0.0-1.0
}

Example:
User: "I'm feeling great today!"
TARA: "That's wonderful to hear! Your positive energy is contagious. What's making your day so special?"
###METADATA###
{"emotion": "happy", "agent": "emotional", "confidence": 0.95}`;

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
    const content = data.choices[0].message.content;

    // Parse response and metadata
    let messageText = content;
    let metadata = {
      emotion: "neutral" as const,
      agent: "conversational" as const,
      confidence: 0.8,
    };

    const metadataMatch = content.match(/###METADATA###\s*(\{[^}]+\})/);
    if (metadataMatch) {
      try {
        const parsedMetadata = JSON.parse(metadataMatch[1]);
        metadata = { ...metadata, ...parsedMetadata };
        messageText = content.replace(/###METADATA###\s*\{[^}]+\}/, "").trim();
      } catch (e) {
        console.error("Failed to parse metadata:", e);
      }
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
