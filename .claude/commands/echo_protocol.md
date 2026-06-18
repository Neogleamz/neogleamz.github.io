---
description: A strict active-listening checkpoint triggered to verify alignment, assumptions, and scope before executing complex tasks. (triggers: /echo, /playback, Are you following, Do you understand, Make sense?, Playback)
---

# Echo Protocol (Context Verification)

When the user's prompt includes "Are you following", "Do you understand", "Make sense?", or "Playback", you must immediately drop all other tasks and execute the following Active Listening workflow:

1. **Halt Execution**: Do not generate any Implementation Plans, do not write code, and do not execute any terminal commands. You are now in verification mode.
2. **The Synthesis (Echo)**: Summarize your current understanding of the user's last explanation or requirement in 2 to 3 concise sentences. Prove that you grasp the *intent* and the *mechanics*, rather than just parroting their words back.
3. **Assumption Declaration**: Explicitly list 1 to 3 technical or architectural assumptions you are currently holding (e.g., *"I am assuming we are storing this data in `localStorage` rather than Supabase."*).
4. **Scope Exclusions (The "Out of Bounds" Clause)**: Explicitly define the boundaries of what you are NOT going to do to prevent scope creep (e.g., *"I will update the Bluetooth payload logic, but I will NOT alter the UI components on this pass."*).
5. **Success Criteria**: Define exactly what the "definition of done" looks like for this specific task (e.g., *"Success means the HTML element changes color within 100ms of the BLE connection without crashing."*).
6. **The Knowledge Gap**: If any part of the explanation was vague, contradictory, or missing specific technical details, explicitly point it out here. If everything is crystal clear, state: *"Context is 100% clear."*
7. **The Alignment Check**: Ask the user: *"Is this alignment correct? Tell me where I am off, or type 'aligned' to lock this into my context."*
8. **Misalignment Recovery Loop**: If the user replies that your alignment is incorrect, you must NOT guess again or write any code. You must ask highly targeted, specific clarifying questions (offering A/B choices if possible) until perfect alignment is achieved.

---

## 🛑 MANDATORY OUTPUT FORMAT (ALL MODELS MUST FOLLOW)

> [!CAUTION]
> **STRICT LINKING MANDATE:** You MUST NEVER surround file paths with backticks (like ile.md). You MUST ALWAYS use standard Markdown hyperlink syntax so the user can natively click them (e.g., [file.md](file:///absolute/path/to/file.md)).

You MUST render the Echo Protocol using the following exact Markdown structure. Do NOT output a plain text paragraph summary. Every model (Claude, Gemini, GPT) must produce this exact structure:

### 🔊 Echo Protocol — Context Verification

#### 🧠 My Understanding
Render a `> [!NOTE]` block containing your 2-3 sentence synthesis of the user's intent and mechanics.

#### 🏗️ Assumptions I'm Holding
Render a numbered list inside a `> [!WARNING]` block. Each assumption should be a single, specific technical statement.

#### 🚫 Scope Exclusions (Out of Bounds)
Render a bulleted list of what you will NOT do on this pass. Use strikethrough formatting (e.g., ~~Refactor the entire module~~) to make exclusions visually stark.

#### ✅ Definition of Done
Render a `> [!TIP]` block with the exact success criteria in 1-2 sentences.

#### ❓ Knowledge Gaps
If gaps exist, render each as a separate `> [!IMPORTANT]` block with a targeted question. If no gaps exist, render: `> [!NOTE]` "Context is 100% clear."

#### 🎯 Alignment Gate
Render a `> [!IMPORTANT]` block: "Is this alignment correct? Tell me where I'm off, or type **'aligned'** to lock this into my context."
