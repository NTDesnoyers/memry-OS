import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { createLogger } from "./logger";
import { getSystemPromptWithProfile } from "./ai-context";

const logger = createLogger("VoiceRelay");

interface VoiceSession {
  clientWs: WebSocket;
  openaiWs: WebSocket | null;
  sessionId: string;
}

const activeSessions = new Map<string, VoiceSession>();

export function setupVoiceRelay(httpServer: Server) {
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: "/api/voice/realtime" 
  });

  logger.info("Voice relay WebSocket server initialized on /api/voice/realtime");

  wss.on("connection", async (clientWs, req) => {
    const sessionId = crypto.randomUUID();
    logger.info(`New voice session started: ${sessionId}`);

    const session: VoiceSession = {
      clientWs,
      openaiWs: null,
      sessionId,
    };
    activeSessions.set(sessionId, session);

    try {
      const basePrompt = `You are the AI assistant for Ninja OS, a relationship intelligence platform for real estate professionals using the Ninja Selling methodology. 

You help with:
- Managing relationships and FORD notes (Family, Occupation, Recreation, Dreams)
- Weekly planning and daily reviews
- Client follow-ups and nurture campaigns
- Business intelligence and deal tracking

Be conversational, warm, and efficient. Keep responses concise for voice interaction.`;
      const systemPrompt = await getSystemPromptWithProfile(basePrompt);
      await connectToOpenAI(session, systemPrompt);
    } catch (error) {
      logger.error(`Failed to connect to OpenAI: ${error}`);
      clientWs.send(JSON.stringify({ 
        type: "error", 
        message: "Failed to connect to voice service" 
      }));
      clientWs.close();
      return;
    }

    clientWs.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleClientMessage(session, message);
      } catch (error) {
        logger.error(`Invalid message from client: ${error}`);
      }
    });

    clientWs.on("close", () => {
      logger.info(`Voice session ended: ${sessionId}`);
      if (session.openaiWs) {
        session.openaiWs.close();
      }
      activeSessions.delete(sessionId);
    });

    clientWs.on("error", (error) => {
      logger.error(`Client WebSocket error: ${error}`);
    });
  });

  return wss;
}

async function connectToOpenAI(session: VoiceSession, systemPrompt: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17";
  
  return new Promise<void>((resolve, reject) => {
    const openaiWs = new WebSocket(url, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "OpenAI-Beta": "realtime=v1",
      },
    });

    session.openaiWs = openaiWs;

    openaiWs.on("open", () => {
      logger.info(`Connected to OpenAI Realtime API for session ${session.sessionId}`);
      
      openaiWs.send(JSON.stringify({
        type: "session.update",
        session: {
          modalities: ["text", "audio"],
          instructions: systemPrompt,
          voice: "alloy",
          input_audio_format: "pcm16",
          output_audio_format: "pcm16",
          input_audio_transcription: {
            model: "whisper-1"
          },
          turn_detection: {
            type: "server_vad",
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500,
          },
        },
      }));

      session.clientWs.send(JSON.stringify({ 
        type: "session.ready",
        sessionId: session.sessionId 
      }));
      
      resolve();
    });

    openaiWs.on("message", (data) => {
      try {
        const event = JSON.parse(data.toString());
        handleOpenAIEvent(session, event);
      } catch (error) {
        logger.error(`Failed to parse OpenAI event: ${error}`);
      }
    });

    openaiWs.on("error", (error) => {
      logger.error(`OpenAI WebSocket error: ${error}`);
      session.clientWs.send(JSON.stringify({ 
        type: "error", 
        message: "Voice service connection error" 
      }));
      reject(error);
    });

    openaiWs.on("close", () => {
      logger.info(`OpenAI connection closed for session ${session.sessionId}`);
      if (session.clientWs.readyState === WebSocket.OPEN) {
        session.clientWs.send(JSON.stringify({ type: "session.ended" }));
      }
    });
  });
}

function handleClientMessage(session: VoiceSession, message: any) {
  if (!session.openaiWs || session.openaiWs.readyState !== WebSocket.OPEN) {
    logger.warn("OpenAI connection not ready");
    return;
  }

  switch (message.type) {
    case "audio.append":
      session.openaiWs.send(JSON.stringify({
        type: "input_audio_buffer.append",
        audio: message.audio,
      }));
      break;

    case "audio.commit":
      session.openaiWs.send(JSON.stringify({
        type: "input_audio_buffer.commit",
      }));
      break;

    case "audio.clear":
      session.openaiWs.send(JSON.stringify({
        type: "input_audio_buffer.clear",
      }));
      break;

    case "response.create":
      session.openaiWs.send(JSON.stringify({
        type: "response.create",
        response: {
          modalities: ["text", "audio"],
        },
      }));
      break;

    case "conversation.item.create":
      session.openaiWs.send(JSON.stringify({
        type: "conversation.item.create",
        item: message.item,
      }));
      break;

    case "response.cancel":
      session.openaiWs.send(JSON.stringify({
        type: "response.cancel",
      }));
      break;

    default:
      logger.warn(`Unknown client message type: ${message.type}`);
  }
}

function handleOpenAIEvent(session: VoiceSession, event: any) {
  if (session.clientWs.readyState !== WebSocket.OPEN) {
    return;
  }

  switch (event.type) {
    case "session.created":
    case "session.updated":
      session.clientWs.send(JSON.stringify({
        type: event.type,
        session: event.session,
      }));
      break;

    case "input_audio_buffer.speech_started":
      session.clientWs.send(JSON.stringify({ type: "speech.started" }));
      break;

    case "input_audio_buffer.speech_stopped":
      session.clientWs.send(JSON.stringify({ type: "speech.stopped" }));
      break;

    case "conversation.item.input_audio_transcription.completed":
      session.clientWs.send(JSON.stringify({
        type: "transcription.completed",
        transcript: event.transcript,
      }));
      break;

    case "response.audio.delta":
      session.clientWs.send(JSON.stringify({
        type: "audio.delta",
        delta: event.delta,
      }));
      break;

    case "response.audio.done":
      session.clientWs.send(JSON.stringify({ type: "audio.done" }));
      break;

    case "response.text.delta":
      session.clientWs.send(JSON.stringify({
        type: "text.delta",
        delta: event.delta,
      }));
      break;

    case "response.text.done":
      session.clientWs.send(JSON.stringify({
        type: "text.done",
        text: event.text,
      }));
      break;

    case "response.done":
      session.clientWs.send(JSON.stringify({
        type: "response.done",
        response: {
          id: event.response?.id,
          status: event.response?.status,
        },
      }));
      break;

    case "error":
      logger.error(`OpenAI error: ${JSON.stringify(event.error)}`);
      session.clientWs.send(JSON.stringify({
        type: "error",
        message: event.error?.message || "Voice service error",
        code: event.error?.code,
      }));
      break;

    case "rate_limits.updated":
      break;

    default:
      break;
  }
}
