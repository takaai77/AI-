const ROADMAP_ITEMS = [
  {
    rank: "Step 1",
    title: "Understand data flow",
    why: "Start with one line: URL -> metrics -> threshold -> analysis -> templates."
  },
  {
    rank: "Step 2",
    title: "Understand queue and failure logs",
    why: "Night operations require queue/job/worker understanding and quick log triage."
  },
  {
    rank: "Step 3",
    title: "Lock basic security",
    why: "Leaked keys and weak access control are expensive to fix later."
  },
  {
    rank: "Step 4",
    title: "Run the growth loop",
    why: "Store winning templates and improve weekly with A/B tests."
  }
];

const TERM_CARDS = [
  {
    term: "API",
    definition: "A request interface between UI and backend.",
    analogy: "A restaurant order slip.",
    project: "The web page calls POST /videos to register URLs."
  },
  {
    term: "Queue",
    definition: "A waiting line for async work.",
    analogy: "Numbered waiting tickets at a clinic.",
    project: "Analysis jobs are pushed to Redis queue."
  },
  {
    term: "Worker",
    definition: "A process that executes queued jobs.",
    analogy: "A factory operator handling work orders.",
    project: "Celery worker runs ffmpeg/OCR/LLM and saves results."
  },
  {
    term: "Docker",
    definition: "A portable runtime container.",
    analogy: "A kitchen truck with all tools packed.",
    project: "api/worker/web/db/redis run in the same setup."
  },
  {
    term: "Env Vars",
    definition: "Configuration and secrets passed from outside code.",
    analogy: "Store vault PIN kept on a separate secure sheet.",
    project: "OPENAI_API_KEY should stay in .env or GitHub Secrets."
  },
  {
    term: "JWT",
    definition: "A signed token for authentication state.",
    analogy: "A tamper-evident access badge.",
    project: "Admin settings APIs should require verified JWT."
  },
  {
    term: "Validation",
    definition: "Rule checks for incoming data.",
    analogy: "A form completeness check before submission.",
    project: "LLM JSON is validated before saving into DB."
  },
  {
    term: "Least Privilege",
    definition: "Grant only required permissions.",
    analogy: "Only managers receive vault keys.",
    project: "Settings updates should be admin-only."
  }
];

const SECURITY_CHECKLIST = [
  "Do not commit API keys or passwords into git",
  "Share only .env.example, never .env",
  "Keep GitHub Actions permissions minimal",
  "Use access control for public URLs in production",
  "Never log raw secrets or personal data",
  "Review dependency vulnerabilities regularly",
  "Validate manual metric input ranges on API side",
  "Restrict CORS to your production domain"
];

const QUIZ_QUESTIONS = [
  {
    id: "q01",
    focus: "security",
    category: "Secrets",
    question: "What is the safest way to manage OPENAI_API_KEY?",
    options: [
      "Store it in .env or GitHub Secrets and keep it out of source code",
      "Put it directly in app.js for convenience",
      "Write it in README so all teammates can copy it"
    ],
    answer: 0,
    explanation: "Secrets must be separated from code to reduce leakage risk.",
    analogy: "Do not write vault PIN on the front door."
  },
  {
    id: "q02",
    focus: "security",
    category: "GitHub Actions",
    question: "Which Actions setup is most secure by default?",
    options: [
      "Use minimal permissions and avoid unnecessary write scopes",
      "Use permissions: write-all in every workflow",
      "Let anyone trigger production deploy by default"
    ],
    answer: 0,
    explanation: "Narrow permissions reduce blast radius during incidents.",
    analogy: "Do not hand out master keys to everyone."
  },
  {
    id: "q03",
    focus: "security",
    category: "Validation",
    question: "Why should metric input be validated in API as well?",
    options: [
      "Client checks can be bypassed, API checks protect DB integrity",
      "Client-side validation is always enough",
      "Validation only slows down requests"
    ],
    answer: 0,
    explanation: "API validation is mandatory because clients are untrusted.",
    analogy: "Final quality check happens at shipping gate, not only at desk."
  },
  {
    id: "q04",
    focus: "security",
    category: "Logs",
    question: "What should never appear in logs?",
    options: [
      "API keys, raw tokens, personal data",
      "Job progress percentage",
      "Task start timestamp"
    ],
    answer: 0,
    explanation: "Logs are broadly accessible and must avoid sensitive values.",
    analogy: "Do not post private keys on a public bulletin board."
  },
  {
    id: "q05",
    focus: "architecture",
    category: "Flow",
    question: "Which order matches the MVP pipeline?",
    options: [
      "URL -> metrics -> threshold -> analysis -> templates",
      "URL -> LLM first -> metrics",
      "metrics -> URL -> OCR"
    ],
    answer: 0,
    explanation: "Heavy analysis should run only after threshold pass.",
    analogy: "Screen resumes before full interviews."
  },
  {
    id: "q06",
    focus: "architecture",
    category: "Queue",
    question: "Main reason to use queue and workers?",
    options: [
      "Keep UI responsive by running heavy tasks asynchronously",
      "Eliminate all runtime errors",
      "Replace database entirely"
    ],
    answer: 0,
    explanation: "Queue improves responsiveness and operational stability.",
    analogy: "Use waiting lines to prevent crowding at one counter."
  },
  {
    id: "q07",
    focus: "ops",
    category: "Fallback",
    question: "If metrics API is unavailable, what is correct MVP behavior?",
    options: [
      "Use manual metrics input as an official fallback",
      "Stop the system",
      "Fill random placeholder numbers"
    ],
    answer: 0,
    explanation: "MVP should keep running even with partial automation.",
    analogy: "Use manual checkout when scanner is down."
  },
  {
    id: "q08",
    focus: "security",
    category: "CORS",
    question: "Best production CORS policy is:",
    options: [
      "Allow only your real frontend domain",
      "Use allow_origins = *",
      "Disable CORS protection"
    ],
    answer: 0,
    explanation: "Open CORS broadens abuse surface.",
    analogy: "Do not leave every side door unlocked."
  },
  {
    id: "q09",
    focus: "security",
    category: "Access Control",
    question: "How should settings update endpoints be protected?",
    options: [
      "Require authenticated admin role at API layer",
      "Hide the UI button only",
      "Use hard-to-guess URLs"
    ],
    answer: 0,
    explanation: "Authorization must be enforced by backend, not UI only.",
    analogy: "Lock the vault itself, not only the hallway lights."
  },
  {
    id: "q10",
    focus: "architecture",
    category: "LLM Output",
    question: "Why enforce JSON schema for LLM output?",
    options: [
      "To validate structure before DB write and keep automation stable",
      "To increase token usage",
      "To avoid all prompt engineering"
    ],
    answer: 0,
    explanation: "Schema validation catches malformed output early.",
    analogy: "Standardized forms reduce accounting mistakes."
  },
  {
    id: "q11",
    focus: "ops",
    category: "Nightly Ops",
    question: "Main purpose of nightly metrics jobs?",
    options: [
      "Refresh metrics and queue newly qualified videos",
      "Redesign UI every night",
      "Drop all DB tables"
    ],
    answer: 0,
    explanation: "Night batch keeps candidate pool fresh and automated.",
    analogy: "Nightly stock check prevents next-day shortages."
  },
  {
    id: "q12",
    focus: "security",
    category: "Dependencies",
    question: "When a dependency vulnerability appears, first action is:",
    options: [
      "Assess impact and plan prioritized update",
      "Ignore until next quarter",
      "Rewrite whole app immediately"
    ],
    answer: 0,
    explanation: "Risk-based prioritization gives fast and safe response.",
    analogy: "Triaging equipment failures before repair scheduling."
  },
  {
    id: "q13",
    focus: "security",
    category: "Git",
    question: "If .env was committed by mistake, what comes first?",
    options: [
      "Revoke and rotate leaked keys immediately",
      "Just add a warning in README",
      "Wait until next release"
    ],
    answer: 0,
    explanation: "Assume compromise once exposed and rotate credentials.",
    analogy: "Replace lock after losing a key."
  },
  {
    id: "q14",
    focus: "architecture",
    category: "Pipeline Fallback",
    question: "If shot detection fails, MVP should:",
    options: [
      "Fallback to fixed interval splitting and continue",
      "Abort all processing",
      "Save one random shot only"
    ],
    answer: 0,
    explanation: "Fallback keeps operations robust.",
    analogy: "Use staffed gate when auto gate fails."
  },
  {
    id: "q15",
    focus: "security",
    category: "Public Exposure",
    question: "Correct stance for temporary tunnel URLs is:",
    options: [
      "Treat as testing endpoint, not permanent production access",
      "Use as final production URL forever",
      "Share publicly with no controls"
    ],
    answer: 0,
    explanation: "Temporary exposure must be bounded and controlled.",
    analogy: "Scaffolding is for construction, not final structure."
  },
  {
    id: "q16",
    focus: "ops",
    category: "A/B Test",
    question: "Good A/B rule is:",
    options: [
      "Change one variable at a time",
      "Change everything at once",
      "Skip measurement and trust feeling"
    ],
    answer: 0,
    explanation: "Single-variable tests allow causal interpretation.",
    analogy: "Change only salt or heat, not both at once, when tuning a recipe."
  },
  {
    id: "q17",
    focus: "architecture",
    category: "Data Model",
    question: "Why keep start_sec/end_sec in shots table?",
    options: [
      "Enable second-level reproduction and comparison",
      "Reduce video file size",
      "Manage API keys"
    ],
    answer: 0,
    explanation: "Time anchors are essential for reusable edit templates.",
    analogy: "Coordinates make locations reproducible."
  },
  {
    id: "q18",
    focus: "security",
    category: "Auth",
    question: "Which JWT practice is risky?",
    options: [
      "Never-expiring tokens used indefinitely",
      "Short expiry and re-auth flow",
      "Secure signing key storage"
    ],
    answer: 0,
    explanation: "Long-lived tokens increase exposure after leakage.",
    analogy: "Permanent access badges are dangerous if stolen."
  },
  {
    id: "q19",
    focus: "security",
    category: "Least Privilege",
    question: "Least privilege means:",
    options: [
      "Grant only required permissions",
      "Start with full admin access",
      "Control devices only, not users"
    ],
    answer: 0,
    explanation: "Unneeded privileges widen attack impact.",
    analogy: "Delivery staff should not have vault access."
  },
  {
    id: "q20",
    focus: "ops",
    category: "Failure Handling",
    question: "First action when a job is failed is:",
    options: [
      "Read logs, locate failing stage, then retry",
      "Drop the whole database",
      "Delete logs and rerun blindly"
    ],
    answer: 0,
    explanation: "Stage-level triage shortens recovery time.",
    analogy: "Check flight recorder before changing parts."
  },
  {
    id: "q21",
    focus: "security",
    category: "Prompt Safety",
    question: "What is a risk of sending raw logs to LLM?",
    options: [
      "Sensitive data may be sent externally",
      "It always improves speed",
      "It removes need for validation"
    ],
    answer: 0,
    explanation: "Mask secrets before external AI calls.",
    analogy: "Black out private info before mailing documents."
  },
  {
    id: "q22",
    focus: "architecture",
    category: "Purpose Split",
    question: "Why keep purpose split in prompts/templates?",
    options: [
      "Evaluation criteria and tone differ by domain",
      "To reduce DB tables",
      "To improve OCR accuracy"
    ],
    answer: 0,
    explanation: "Hokekyo and health marketing need different criteria.",
    analogy: "Same ingredients, different cuisine style."
  },
  {
    id: "q23",
    focus: "security",
    category: "Transport",
    question: "Recommended communication setup for public usage is:",
    options: [
      "Use HTTPS and avoid plain HTTP",
      "HTTP is enough if API key exists",
      "HTTPS only in local dev"
    ],
    answer: 0,
    explanation: "TLS protects against interception and tampering.",
    analogy: "Use sealed envelopes for sensitive mail."
  },
  {
    id: "q24",
    focus: "ops",
    category: "Growth Loop",
    question: "Best path toward 10k subscribers / 100M views is:",
    options: [
      "Store winning templates and run weekly A/B verification",
      "Create every video from scratch by intuition",
      "Skip analysis of winning videos"
    ],
    answer: 0,
    explanation: "Reusable patterns compound growth over time.",
    analogy: "Standardize proven sales talk across the team."
  }
];
