const providerSelect = document.getElementById('providerSelect');
const modelInput = document.getElementById('modelInput');
const promptInput = document.getElementById('promptInput');
const providerHint = document.getElementById('providerHint');
const startNodeSelect = document.getElementById('startNodeSelect');
const addNodeButton = document.getElementById('addNodeButton');
const loadScenarioButton = document.getElementById('loadScenarioButton');
const nodeEditor = document.getElementById('nodeEditor');
const graphPreview = document.getElementById('graphPreview');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const confirmButton = document.getElementById('confirmButton');
const cancelButton = document.getElementById('cancelButton');
const statusText = document.getElementById('statusText');
const sessionIdValue = document.getElementById('sessionIdValue');
const providerSessionValue = document.getElementById('providerSessionValue');
const verifiedCustomerValue = document.getElementById('verifiedCustomerValue');
const currentNodeValue = document.getElementById('currentNodeValue');
const pendingActionValue = document.getElementById('pendingActionValue');
const log = document.getElementById('log');
const remoteAudio = document.getElementById('remoteAudio');

const STORAGE_KEY = 'phone-ai-agent-browser-demo';

const defaultScenario = {
  startNodeId: 'greeting',
  nodes: [
    {
      id: 'greeting',
      title: 'Greeting',
      instructions:
        'Greet the caller, explain that this line handles recurring subscription stop and change requests, and ask what they need.',
      transitions: {
        success: 'verification',
        fallback: 'greeting',
        escalate: 'handoff',
      },
    },
    {
      id: 'verification',
      title: 'Verification',
      instructions:
        'Collect full name, birth date, and registered phone number if needed. Complete identity verification before any order update.',
      transitions: {
        success: 'intent',
        fallback: 'verification',
        escalate: 'handoff',
      },
    },
    {
      id: 'intent',
      title: 'Intent Handling',
      instructions:
        'Identify the subscription, decide whether the request is a stop or change, and prepare the correct proposal.',
      transitions: {
        success: 'confirmation',
        fallback: 'intent',
        escalate: 'handoff',
      },
    },
    {
      id: 'confirmation',
      title: 'Confirmation',
      instructions:
        'Read back the proposal once, ask for DTMF confirmation, then apply or cancel based on the caller input.',
      transitions: {
        success: 'closing',
        fallback: 'intent',
        escalate: 'handoff',
      },
    },
    {
      id: 'closing',
      title: 'Closing',
      instructions:
        'Summarize the final result, state the updated shipment details if changed, and close the call politely.',
      transitions: {},
    },
    {
      id: 'handoff',
      title: 'Human Handoff',
      instructions:
        'Explain that the request needs a human operator and transfer or end with a clear follow-up message.',
      transitions: {},
    },
  ],
};

let defaults = {
  defaultModels: {
    openai: 'gpt-realtime',
    gemini: 'gemini-2.5-flash-native-audio-preview-12-2025',
  },
  confirmDigit: '1',
  cancelDigit: '2',
  geminiEnabled: false,
};

let scenarioState = structuredClone(defaultScenario);
let peerConnection;
let localStream;
let eventChannel;
let currentSessionId;
let currentProvider = 'openai';
let currentUserTurn = '';
let currentAssistantTurn = '';
let geminiSocket;
let geminiAudioContext;
let geminiCaptureSource;
let geminiCaptureProcessor;
let geminiCaptureSink;
let geminiPlaybackCursor = 0;
let statePollTimer;
let isStopping = false;

function setDigitButtonsEnabled(enabled) {
  confirmButton.disabled = !enabled;
  cancelButton.disabled = !enabled;
}

function setStatus(text) {
  statusText.textContent = text;
}

function addLog(message) {
  const line = document.createElement('p');
  line.className = 'log-entry';
  line.textContent = message;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}

function resetTurns() {
  currentUserTurn = '';
  currentAssistantTurn = '';
}

function parseRealtimeEvent(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function updateProviderHint() {
  if (providerSelect.value === 'openai') {
    providerHint.textContent =
      'OpenAI keeps the current WebRTC browser call flow and the Twilio phone path.';
    return;
  }

  providerHint.textContent = defaults.geminiEnabled
    ? 'Gemini uses a server-side Live API bridge so the browser does not receive the Gemini API key.'
    : 'Gemini is selectable here, but you need GEMINI_API_KEY on the server before it can connect.';
}

function getStoredPreferences() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function savePreferences() {
  const payload = {
    provider: providerSelect.value,
    model: modelInput.value,
    prompt: promptInput.value,
    scenario: scenarioState,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function getDefaultModel(provider) {
  return defaults.defaultModels[provider] ?? '';
}

function updateModelForProvider(force = false) {
  const nextModel = getDefaultModel(providerSelect.value);
  if (force || !modelInput.value.trim()) {
    modelInput.value = nextModel;
  }
}

function ensureValidStartNode() {
  const nodeIds = new Set(scenarioState.nodes.map((node) => node.id).filter(Boolean));
  if (!nodeIds.has(scenarioState.startNodeId)) {
    scenarioState.startNodeId = scenarioState.nodes[0]?.id ?? '';
  }
}

function cloneScenarioState() {
  return {
    startNodeId: scenarioState.startNodeId,
    nodes: scenarioState.nodes.map((node) => ({
      id: node.id,
      title: node.title,
      instructions: node.instructions,
      transitions: { ...(node.transitions ?? {}) },
    })),
  };
}

function refreshScenarioUi() {
  ensureValidStartNode();
  renderStartNodeOptions();
  renderNodeEditor();
  renderGraphPreview();
  savePreferences();
}

function renderStartNodeOptions() {
  startNodeSelect.innerHTML = '';

  scenarioState.nodes.forEach((node) => {
    const option = document.createElement('option');
    option.value = node.id;
    option.textContent = node.id ? `${node.id} / ${node.title || 'Untitled node'}` : 'Unnamed node';
    option.selected = node.id === scenarioState.startNodeId;
    startNodeSelect.appendChild(option);
  });
}

function createNodeField(labelText, inputElement) {
  const label = document.createElement('label');
  label.className = 'field';
  const span = document.createElement('span');
  span.className = 'field-label';
  span.textContent = labelText;
  label.append(span, inputElement);
  return label;
}

function createTransitionSelect(nodeIndex, transitionType, currentValue) {
  const select = document.createElement('select');
  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = 'None';
  select.appendChild(blank);

  scenarioState.nodes.forEach((node) => {
    if (!node.id) {
      return;
    }

    const option = document.createElement('option');
    option.value = node.id;
    option.textContent = node.id;
    option.selected = currentValue === node.id;
    select.appendChild(option);
  });

  select.addEventListener('change', () => {
    const nextState = cloneScenarioState();
    const node = nextState.nodes[nodeIndex];
    node.transitions = node.transitions ?? {};

    if (!select.value) {
      delete node.transitions[transitionType];
    } else {
      node.transitions[transitionType] = select.value;
    }

    scenarioState = nextState;
    refreshScenarioUi();
  });

  return select;
}

function renderNodeEditor() {
  nodeEditor.innerHTML = '';

  scenarioState.nodes.forEach((node, nodeIndex) => {
    const card = document.createElement('article');
    card.className = 'node-card';

    const cardHeader = document.createElement('div');
    cardHeader.className = 'node-card-header';

    const title = document.createElement('h3');
    title.textContent = node.title || `Node ${nodeIndex + 1}`;

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'mini ghost';
    deleteButton.textContent = 'Remove';
    deleteButton.disabled = scenarioState.nodes.length === 1;
    deleteButton.addEventListener('click', () => {
      if (scenarioState.nodes.length === 1) {
        return;
      }

      const nextState = cloneScenarioState();
      nextState.nodes.splice(nodeIndex, 1);
      scenarioState = nextState;
      refreshScenarioUi();
    });

    cardHeader.append(title, deleteButton);

    const idInput = document.createElement('input');
    idInput.type = 'text';
    idInput.value = node.id;
    idInput.placeholder = 'verification';
    idInput.addEventListener('input', () => {
      const nextState = cloneScenarioState();
      const previousId = nextState.nodes[nodeIndex].id;
      const nextId = idInput.value.trim();
      nextState.nodes[nodeIndex].id = nextId;

      if (nextState.startNodeId === previousId) {
        nextState.startNodeId = nextId;
      }

      nextState.nodes.forEach((candidate) => {
        Object.entries(candidate.transitions ?? {}).forEach(([key, value]) => {
          if (value === previousId) {
            candidate.transitions[key] = nextId;
          }
        });
      });

      scenarioState = nextState;
      refreshScenarioUi();
    });

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.value = node.title;
    titleInput.placeholder = 'Verification';
    titleInput.addEventListener('input', () => {
      const nextState = cloneScenarioState();
      nextState.nodes[nodeIndex].title = titleInput.value;
      scenarioState = nextState;
      refreshScenarioUi();
    });

    const instructionsInput = document.createElement('textarea');
    instructionsInput.value = node.instructions;
    instructionsInput.placeholder = 'Describe what the agent should do in this node.';
    instructionsInput.rows = 4;
    instructionsInput.addEventListener('input', () => {
      const nextState = cloneScenarioState();
      nextState.nodes[nodeIndex].instructions = instructionsInput.value;
      scenarioState = nextState;
      savePreferences();
    });

    const transitionGrid = document.createElement('div');
    transitionGrid.className = 'transition-grid';
    transitionGrid.append(
      createNodeField(
        'Success',
        createTransitionSelect(nodeIndex, 'success', node.transitions?.success ?? ''),
      ),
      createNodeField(
        'Fallback',
        createTransitionSelect(nodeIndex, 'fallback', node.transitions?.fallback ?? ''),
      ),
      createNodeField(
        'Escalate',
        createTransitionSelect(nodeIndex, 'escalate', node.transitions?.escalate ?? ''),
      ),
    );

    card.append(
      cardHeader,
      createNodeField('Node ID', idInput),
      createNodeField('Title', titleInput),
      createNodeField('Instructions', instructionsInput),
      transitionGrid,
    );

    nodeEditor.appendChild(card);
  });
}

function renderGraphPreview() {
  graphPreview.innerHTML = '';

  scenarioState.nodes.forEach((node) => {
    const card = document.createElement('article');
    card.className = 'preview-node';
    if (node.id === scenarioState.startNodeId) {
      card.classList.add('is-start');
    }

    const heading = document.createElement('div');
    heading.className = 'preview-node-heading';

    const title = document.createElement('strong');
    title.textContent = node.title || node.id || 'Untitled node';

    const badge = document.createElement('span');
    badge.className = 'preview-node-id';
    badge.textContent = node.id || 'no-id';

    heading.append(title, badge);

    const body = document.createElement('p');
    body.textContent = node.instructions || 'No instructions yet.';

    const links = document.createElement('div');
    links.className = 'preview-links';

    ['success', 'fallback', 'escalate'].forEach((transitionType) => {
      const target = node.transitions?.[transitionType];
      if (!target) {
        return;
      }

      const chip = document.createElement('span');
      chip.className = `preview-link ${transitionType}`;
      chip.textContent = `${transitionType} -> ${target}`;
      links.appendChild(chip);
    });

    card.append(heading, body, links);
    graphPreview.appendChild(card);
  });
}

function addScenarioNode() {
  const nextIndex = scenarioState.nodes.length + 1;
  scenarioState = {
    ...cloneScenarioState(),
    nodes: [
      ...scenarioState.nodes,
      {
        id: `node_${nextIndex}`,
        title: `Node ${nextIndex}`,
        instructions: 'Describe the next step.',
        transitions: {},
      },
    ],
  };

  refreshScenarioUi();
}

function loadScenarioTemplate() {
  scenarioState = structuredClone(defaultScenario);
  refreshScenarioUi();
}

function normalizeScenarioPayload() {
  const nodes = scenarioState.nodes
    .map((node) => ({
      id: node.id.trim(),
      title: node.title.trim(),
      instructions: node.instructions.trim(),
      transitions: Object.fromEntries(
        Object.entries(node.transitions ?? {}).filter(([, value]) => Boolean(value)),
      ),
    }))
    .filter((node) => node.id || node.title || node.instructions);

  if (!nodes.length) {
    return undefined;
  }

  nodes.forEach((node) => {
    if (!node.id || !node.title || !node.instructions) {
      throw new Error('Every scenario node needs an ID, title, and instructions.');
    }
  });

  const nodeIds = new Set(nodes.map((node) => node.id));
  if (nodeIds.size !== nodes.length) {
    throw new Error('Scenario node IDs must be unique.');
  }

  const startNodeId = scenarioState.startNodeId?.trim() || nodes[0].id;
  if (!nodeIds.has(startNodeId)) {
    throw new Error('The selected start node does not exist.');
  }

  nodes.forEach((node) => {
    Object.values(node.transitions ?? {}).forEach((targetNodeId) => {
      if (!nodeIds.has(targetNodeId)) {
        throw new Error(`Scenario transition target "${targetNodeId}" does not exist.`);
      }
    });
  });

  return {
    startNodeId,
    nodes,
  };
}

function updateSessionStatePanel(state) {
  sessionIdValue.textContent = state?.sessionId ?? '-';
  providerSessionValue.textContent = state?.providerSessionId ?? '-';
  verifiedCustomerValue.textContent = state?.verifiedCustomerId ?? '-';
  currentNodeValue.textContent = state?.scenario?.currentNodeId
    ? `${state.scenario.currentNodeId}${state.scenario.currentNodeTitle ? ` / ${state.scenario.currentNodeTitle}` : ''}`
    : '-';
  pendingActionValue.textContent = state?.pendingActionSummary ?? '-';
}

async function pollSessionState() {
  if (!currentSessionId) {
    return;
  }

  const response = await fetch(`/browser/session/${currentSessionId}/state`);
  if (!response.ok) {
    return;
  }

  const state = await response.json();
  updateSessionStatePanel(state);
}

function startStatePolling() {
  stopStatePolling();
  statePollTimer = window.setInterval(() => {
    void pollSessionState();
  }, 2000);
  void pollSessionState();
}

function stopStatePolling() {
  if (statePollTimer) {
    window.clearInterval(statePollTimer);
    statePollTimer = undefined;
  }
}

function clearSessionStatePanel() {
  updateSessionStatePanel(null);
}

function bytesToBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function downsampleBuffer(buffer, inputSampleRate, outputSampleRate) {
  if (outputSampleRate >= inputSampleRate) {
    return buffer;
  }

  const sampleRateRatio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);
  let resultOffset = 0;
  let bufferOffset = 0;

  while (resultOffset < result.length) {
    const nextBufferOffset = Math.round((resultOffset + 1) * sampleRateRatio);
    let total = 0;
    let count = 0;

    for (let index = bufferOffset; index < nextBufferOffset && index < buffer.length; index += 1) {
      total += buffer[index];
      count += 1;
    }

    result[resultOffset] = count ? total / count : 0;
    resultOffset += 1;
    bufferOffset = nextBufferOffset;
  }

  return result;
}

function floatTo16BitPcm(float32Array) {
  const pcm = new Int16Array(float32Array.length);
  for (let index = 0; index < float32Array.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, float32Array[index]));
    pcm[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }

  return pcm;
}

function parseSampleRate(mimeType) {
  const match = /rate=(\d+)/.exec(mimeType || '');
  if (!match) {
    return 24000;
  }

  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : 24000;
}

async function ensureGeminiAudioContext() {
  if (!geminiAudioContext) {
    geminiAudioContext = new AudioContext();
  }

  if (geminiAudioContext.state === 'suspended') {
    await geminiAudioContext.resume();
  }
}

async function startGeminiAudioCapture() {
  await ensureGeminiAudioContext();

  localStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  geminiCaptureSource = geminiAudioContext.createMediaStreamSource(localStream);
  geminiCaptureProcessor = geminiAudioContext.createScriptProcessor(4096, 1, 1);
  geminiCaptureSink = geminiAudioContext.createGain();
  geminiCaptureSink.gain.value = 0;

  geminiCaptureSource.connect(geminiCaptureProcessor);
  geminiCaptureProcessor.connect(geminiCaptureSink);
  geminiCaptureSink.connect(geminiAudioContext.destination);

  geminiCaptureProcessor.onaudioprocess = (event) => {
    if (!geminiSocket || geminiSocket.readyState !== WebSocket.OPEN) {
      return;
    }

    const inputBuffer = event.inputBuffer.getChannelData(0);
    const downsampled = downsampleBuffer(
      inputBuffer,
      geminiAudioContext.sampleRate,
      16000,
    );
    const pcm = floatTo16BitPcm(downsampled);
    const payload = {
      type: 'audio_chunk',
      payload: {
        data: bytesToBase64(new Uint8Array(pcm.buffer)),
        mimeType: 'audio/pcm;rate=16000',
      },
    };

    geminiSocket.send(JSON.stringify(payload));
  };
}

function playGeminiAudioChunk(base64Data, mimeType) {
  if (!geminiAudioContext) {
    return;
  }

  const bytes = base64ToBytes(base64Data);
  const pcm = new Int16Array(bytes.buffer);
  const audioBuffer = geminiAudioContext.createBuffer(
    1,
    pcm.length,
    parseSampleRate(mimeType),
  );
  const channel = audioBuffer.getChannelData(0);
  for (let index = 0; index < pcm.length; index += 1) {
    channel[index] = pcm[index] / 0x8000;
  }

  const source = geminiAudioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(geminiAudioContext.destination);
  geminiPlaybackCursor = Math.max(
    geminiPlaybackCursor,
    geminiAudioContext.currentTime + 0.03,
  );
  source.start(geminiPlaybackCursor);
  geminiPlaybackCursor += audioBuffer.duration;
}

function handleOpenAiRealtimeEvent(realtimeEvent) {
  if (realtimeEvent.type === 'session.updated') {
    addLog('Session updated.');
    return;
  }

  if (realtimeEvent.type === 'conversation.item.input_audio_transcription.completed') {
    currentUserTurn = realtimeEvent.transcript ?? '';
    if (currentUserTurn) {
      addLog(`User: ${currentUserTurn}`);
    }
    return;
  }

  if (realtimeEvent.type === 'response.output_audio_transcript.delta') {
    currentAssistantTurn += realtimeEvent.delta ?? '';
    return;
  }

  if (realtimeEvent.type === 'response.output_audio_transcript.done') {
    const transcript = realtimeEvent.transcript ?? currentAssistantTurn;
    if (transcript) {
      addLog(`Agent: ${transcript}`);
    }
    currentAssistantTurn = '';
    return;
  }

  if (realtimeEvent.type === 'error') {
    addLog(`Error: ${JSON.stringify(realtimeEvent.error ?? realtimeEvent)}`);
  }
}

function handleGeminiServerEvent(event) {
  if (event.type === 'ready') {
    currentSessionId = event.sessionId;
    addLog(`Gemini session ready. Session ID: ${currentSessionId}`);
    return;
  }

  if (event.type === 'provider_session') {
    providerSessionValue.textContent = event.providerSessionId ?? '-';
    addLog(`Gemini provider session: ${event.providerSessionId}`);
    return;
  }

  if (event.type === 'input_transcript' && event.text) {
    addLog(`User: ${event.text}`);
    return;
  }

  if (event.type === 'output_transcript' && event.text) {
    addLog(`Agent: ${event.text}`);
    return;
  }

  if (event.type === 'audio' && event.data) {
    playGeminiAudioChunk(event.data, event.mimeType);
    return;
  }

  if (event.type === 'output_text' && event.text) {
    addLog(`Agent text: ${event.text}`);
    return;
  }

  if (event.type === 'status' && event.message) {
    addLog(String(event.message));
    return;
  }

  if (event.type === 'error' && event.message) {
    addLog(`Error: ${event.message}`);
  }
}

function collectSessionConfig() {
  const scenario = normalizeScenarioPayload();

  return {
    provider: providerSelect.value,
    model: modelInput.value.trim() || getDefaultModel(providerSelect.value),
    prompt: promptInput.value.trim(),
    scenario,
  };
}

async function startOpenAiBrowserCall(config) {
  localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
  });

  peerConnection = new RTCPeerConnection();
  eventChannel = peerConnection.createDataChannel('oai-events');

  eventChannel.addEventListener('open', () => {
    setStatus('OpenAI data channel connected');
    addLog('OpenAI realtime data channel opened.');
  });

  eventChannel.addEventListener('message', (event) => {
    const realtimeEvent = parseRealtimeEvent(event.data);
    if (!realtimeEvent) {
      return;
    }

    handleOpenAiRealtimeEvent(realtimeEvent);
  });

  peerConnection.onconnectionstatechange = () => {
    setStatus(`OpenAI connection: ${peerConnection.connectionState}`);
    if (
      peerConnection.connectionState === 'failed' ||
      peerConnection.connectionState === 'closed' ||
      peerConnection.connectionState === 'disconnected'
    ) {
      void stopBrowserCall();
    }
  };

  peerConnection.ontrack = (event) => {
    remoteAudio.srcObject = event.streams[0];
  };

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  const response = await fetch('/browser/openai/session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      offerSdp: peerConnection.localDescription?.sdp,
      model: config.model,
      prompt: config.prompt || undefined,
      scenario: config.scenario,
    }),
  });

  if (!response.ok) {
    const errorPayload = await response.text();
    throw new Error(errorPayload || 'Failed to create OpenAI browser session.');
  }

  const payload = await response.json();
  currentSessionId = payload.sessionId;

  await peerConnection.setRemoteDescription({
    type: 'answer',
    sdp: payload.answerSdp,
  });

  addLog(`OpenAI browser call attached. Session ID: ${currentSessionId}`);
}

async function startGeminiBrowserCall(config) {
  await ensureGeminiAudioContext();
  geminiPlaybackCursor = geminiAudioContext.currentTime;

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  geminiSocket = new WebSocket(
    `${protocol}//${window.location.host}/browser/gemini/live`,
  );

  const readyPromise = new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error('Timed out while waiting for Gemini session startup.'));
    }, 15000);

    geminiSocket.addEventListener('message', (event) => {
      const payload = parseRealtimeEvent(event.data);
      if (!payload) {
        return;
      }

      handleGeminiServerEvent(payload);

      if (payload.type === 'ready') {
        window.clearTimeout(timeout);
        resolve(payload);
      }

      if (payload.type === 'error' && !currentSessionId) {
        window.clearTimeout(timeout);
        reject(new Error(payload.message || 'Gemini session startup failed.'));
      }
    });
  });

  geminiSocket.addEventListener('close', () => {
    if (!isStopping) {
      addLog('Gemini socket closed.');
      void stopBrowserCall({ skipServerDelete: true });
    }
  });

  geminiSocket.addEventListener('error', () => {
    addLog('Gemini websocket error.');
  });

  await new Promise((resolve, reject) => {
    geminiSocket.addEventListener('open', resolve, { once: true });
    geminiSocket.addEventListener(
      'error',
      () => reject(new Error('Failed to open Gemini websocket.')),
      { once: true },
    );
  });

  geminiSocket.send(
    JSON.stringify({
      type: 'start',
      payload: {
        model: config.model,
        prompt: config.prompt || undefined,
        scenario: config.scenario,
      },
    }),
  );

  await readyPromise;
  await startGeminiAudioCapture();
}

function cleanupOpenAiTransport() {
  if (eventChannel) {
    eventChannel.close();
    eventChannel = undefined;
  }

  if (peerConnection) {
    peerConnection.close();
    peerConnection = undefined;
  }

  remoteAudio.srcObject = null;
}

async function cleanupGeminiTransport(closeSocket = true) {
  if (geminiSocket && closeSocket) {
    try {
      if (geminiSocket.readyState === WebSocket.OPEN) {
        geminiSocket.send(JSON.stringify({ type: 'audio_end' }));
      }
      geminiSocket.close();
    } catch {
      return;
    }
  }

  geminiSocket = undefined;
  geminiPlaybackCursor = 0;

  if (geminiCaptureProcessor) {
    geminiCaptureProcessor.disconnect();
    geminiCaptureProcessor.onaudioprocess = null;
    geminiCaptureProcessor = undefined;
  }

  if (geminiCaptureSource) {
    geminiCaptureSource.disconnect();
    geminiCaptureSource = undefined;
  }

  if (geminiCaptureSink) {
    geminiCaptureSink.disconnect();
    geminiCaptureSink = undefined;
  }

  if (geminiAudioContext) {
    await geminiAudioContext.close();
    geminiAudioContext = undefined;
  }
}

function cleanupLocalStream() {
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
    localStream = undefined;
  }
}

async function stopBrowserCall(options = {}) {
  if (isStopping) {
    return;
  }

  isStopping = true;
  stopButton.disabled = true;
  startButton.disabled = false;
  setDigitButtonsEnabled(false);
  stopStatePolling();

  const { skipServerDelete = false } = options;
  const sessionId = currentSessionId;
  const provider = currentProvider;

  currentSessionId = undefined;
  clearSessionStatePanel();

  cleanupOpenAiTransport();
  await cleanupGeminiTransport(provider !== 'gemini' ? false : !skipServerDelete);
  cleanupLocalStream();

  if (sessionId && !skipServerDelete) {
    await fetch(`/browser/session/${sessionId}`, {
      method: 'DELETE',
    }).catch(() => undefined);
  }

  resetTurns();
  setStatus('Idle');
  addLog('Call ended.');
  isStopping = false;
}

async function startBrowserCall() {
  const config = collectSessionConfig();
  currentProvider = config.provider;
  startButton.disabled = true;
  stopButton.disabled = false;
  setDigitButtonsEnabled(true);
  resetTurns();
  clearSessionStatePanel();
  setStatus(`Starting ${config.provider} browser call...`);
  addLog(`Starting ${config.provider} browser call...`);
  savePreferences();

  if (config.provider === 'openai') {
    await startOpenAiBrowserCall(config);
  } else {
    await startGeminiBrowserCall(config);
  }

  startStatePolling();
  setStatus('Waiting for speech...');
}

async function sendDigit(digit) {
  if (!currentSessionId) {
    return;
  }

  const response = await fetch(`/browser/session/${currentSessionId}/digit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ digit }),
  });

  if (!response.ok) {
    throw new Error(`Failed to send digit ${digit}.`);
  }

  addLog(`Sent digit ${digit}.`);
}

async function initialize() {
  const configResponse = await fetch('/browser/config');
  if (configResponse.ok) {
    defaults = await configResponse.json();
  }

  confirmButton.textContent = `Send Confirm ${defaults.confirmDigit}`;
  cancelButton.textContent = `Send Cancel ${defaults.cancelDigit}`;

  const stored = getStoredPreferences();
  providerSelect.value = stored?.provider ?? 'openai';
  updateModelForProvider(true);
  modelInput.value = stored?.model ?? getDefaultModel(providerSelect.value);
  promptInput.value = stored?.prompt ?? '';
  scenarioState = stored?.scenario ?? structuredClone(defaultScenario);
  updateProviderHint();
  refreshScenarioUi();
}

providerSelect.addEventListener('change', () => {
  updateProviderHint();
  updateModelForProvider(true);
  savePreferences();
});

modelInput.addEventListener('input', savePreferences);
promptInput.addEventListener('input', savePreferences);

startNodeSelect.addEventListener('change', () => {
  scenarioState = {
    ...cloneScenarioState(),
    startNodeId: startNodeSelect.value,
  };
  refreshScenarioUi();
});

addNodeButton.addEventListener('click', () => {
  addScenarioNode();
});

loadScenarioButton.addEventListener('click', () => {
  loadScenarioTemplate();
});

startButton.addEventListener('click', async () => {
  try {
    await startBrowserCall();
  } catch (error) {
    addLog(`Start failed: ${error instanceof Error ? error.message : String(error)}`);
    await stopBrowserCall();
  }
});

stopButton.addEventListener('click', async () => {
  await stopBrowserCall();
});

confirmButton.addEventListener('click', async () => {
  try {
    await sendDigit(defaults.confirmDigit);
  } catch (error) {
    addLog(`Digit send failed: ${error instanceof Error ? error.message : String(error)}`);
  }
});

cancelButton.addEventListener('click', async () => {
  try {
    await sendDigit(defaults.cancelDigit);
  } catch (error) {
    addLog(`Digit send failed: ${error instanceof Error ? error.message : String(error)}`);
  }
});

void initialize().catch((error) => {
  addLog(`Initialization failed: ${error instanceof Error ? error.message : String(error)}`);
});
