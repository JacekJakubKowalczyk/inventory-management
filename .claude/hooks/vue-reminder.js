// PostToolUse hook: after Claude edits a .vue file, remind it of the project's Vue rules.
// Non-blocking and non-destructive: it only adds context and always exits 0.
let raw = "";
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  try {
    const input = JSON.parse(raw);
    const file = (input.tool_input && input.tool_input.file_path) || "";
    if (/\.vue$/i.test(file)) {
      const message =
        "Reminder for edited .vue file: use unique v-for keys (sku, month, order_id, not index); " +
        "validate dates before .getMonth(); keep derived data in computed; no emojis in UI; " +
        "significant .vue changes go through the vue-expert subagent.";
      process.stdout.write(
        JSON.stringify({
          hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: message },
        })
      );
    }
  } catch (e) {
    // Ignore malformed input; never interfere with the tool call.
  }
  process.exit(0);
});
