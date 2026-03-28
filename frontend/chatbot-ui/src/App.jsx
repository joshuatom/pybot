import { useState, useRef, useEffect } from "react"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"

function parseMessage(text) {
  const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g
  const parts = []
  let lastIndex = 0
  let match

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: text.slice(lastIndex, match.index) })
    }
    parts.push({
      type: "code",
      language: match[1] || "python",
      content: match[2].trim()
    })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", content: text.slice(lastIndex) })
  }

  return parts.length > 0 ? parts : [{ type: "text", content: text }]
}

function Message({ msg }) {
  const isBot = msg.sender === "bot"
  const parts = parseMessage(msg.text)

  return (
    <div style={{ display: "flex", justifyContent: isBot ? "flex-start" : "flex-end", marginBottom: 12 }}>
      {isBot && (
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "#6366f1", color: "#fff",
          display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 14,
          fontWeight: 600, marginRight: 8, flexShrink: 0
        }}>B</div>
      )}
      <div style={{ maxWidth: "75%" }}>
        {parts.map((part, i) => (
          part.type === "code" ? (
            <div key={i} style={{ borderRadius: 8, overflow: "hidden", marginTop: 8 }}>
              <div style={{
                background: "#1e1e1e", color: "#fff",
                padding: "6px 12px", fontSize: 11,
                display: "flex", justifyContent: "space-between"
              }}>
                <span>{part.language}</span>
                <span style={{ cursor: "pointer", color: "#94a3b8" }} onClick={() => navigator.clipboard.writeText(part.content)}>Copy</span>
              </div>
              <SyntaxHighlighter language={part.language} style={vscDarkPlus} customStyle={{ margin: 0, borderRadius: "0 0 8px 8px" }}>
                {part.content}
              </SyntaxHighlighter>
            </div>
          ) : (
            <div key={i} style={{
              padding: "10px 14px",
              borderRadius: isBot ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
              background: isBot ? "#f1f5f9" : "#6366f1",
              color: isBot ? "#1e293b" : "#fff",
              fontSize: 15, lineHeight: 1.5,
              marginTop: i > 0 ? 4 : 0
            }}>
              {part.content}
            </div>
          )
        ))}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        background: "#6366f1", color: "#fff",
        display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 14,
        fontWeight: 600, marginRight: 8, flexShrink: 0
      }}>B</div>
      <div style={{ padding: "10px 16px", borderRadius: "4px 16px 16px 16px", background: "#f1f5f9", display: "flex", gap: 4, alignItems: "center" }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 7, height: 7, borderRadius: "50%",
            background: "#94a3b8",
            animation: "bounce 1.2s infinite",
            animationDelay: `${i * 0.2}s`
          }} />
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const [messages, setMessages] = useState([
    { id: 1, sender: "bot", text: "Hi! I'm your AI assistant. How can I help you today?" }
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || isLoading) return

    const userMsg = { id: Date.now(), sender: "user", text }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("https://pybot-q791.onrender.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      })
      if (!response.ok) throw new Error("Server error")
      const data = await response.json()
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: "bot",
text: data.reply || "Sorry, I couldn't understand that."
      }])
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: "bot",
        text: "⚠️ Could not reach the server. Make sure your backend is running."
      }])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    setMessages([{ id: 1, sender: "bot", text: "Hi! I'm your AI assistant. How can I help you today?" }])
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0f172a", fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>

      {/* Header */}
      <div style={{ padding: "16px 24px", background: "#1e293b", borderBottom: "1px solid #334155", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#fff" }}>B</div>
          <div>
            <div style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 15 }}>PyBot</div>
            <div style={{ color: "#22c55e", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
              Online
            </div>
          </div>
        </div>
        <button onClick={clearChat} style={{ background: "transparent", border: "1px solid #334155", borderRadius: 8, color: "#94a3b8", padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>
          Clear chat
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 24px 8px", display: "flex", flexDirection: "column" }}>
        {messages.map(msg => <Message key={msg.id} msg={msg} />)}
        {isLoading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "16px 24px", background: "#1e293b", borderTop: "1px solid #334155" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", background: "#0f172a", border: "1px solid #334155", borderRadius: 14, padding: "10px 14px" }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
            rows={1}
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#f1f5f9", fontSize: 14, resize: "none", lineHeight: 1.5, maxHeight: 120, overflowY: "auto", fontFamily: "inherit" }}
            onInput={e => {
              e.target.style.height = "auto"
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            style={{ width: 36, height: 36, borderRadius: "50%", background: input.trim() && !isLoading ? "#6366f1" : "#334155", border: "none", cursor: input.trim() && !isLoading ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.2s" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <div style={{ textAlign: "center", color: "#475569", fontSize: 11, marginTop: 8 }}>
          Enter to send · Shift+Enter for new line
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
      `}</style>
    </div>
  )
}