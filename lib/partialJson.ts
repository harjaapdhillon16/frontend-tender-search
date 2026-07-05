// Tolerant partial-JSON parser for streaming.
// As JSON text streams in, we repeatedly try to parse the largest valid prefix
// so structured fields can render progressively (fields appear, arrays grow).

export function partialParse(input: string): unknown | null {
  const start = input.indexOf("{");
  if (start === -1) return null;
  const s = input.slice(start);
  const maxTrim = 400; // bound the work; a valid prefix is usually near the end
  for (let cut = s.length; cut >= 1 && s.length - cut <= maxTrim; cut--) {
    try {
      return JSON.parse(balance(s.slice(0, cut)));
    } catch {
      // not valid yet — trim one more char and retry
    }
  }
  return null;
}

// Close any open string / brackets and drop a dangling separator so the prefix
// stands a chance of parsing.
function balance(s: string): string {
  let inStr = false;
  let esc = false;
  const stack: string[] = [];
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    out += c;
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === "{") stack.push("}");
    else if (c === "[") stack.push("]");
    else if (c === "}" || c === "]") stack.pop();
  }
  if (inStr) out += '"'; // close a dangling string value/key
  out = out.replace(/[\s,]+$/, ""); // drop trailing whitespace / comma
  out = out.replace(/:\s*$/, ":null"); // key with no value yet -> null
  for (let k = stack.length - 1; k >= 0; k--) out += stack[k];
  return out;
}
