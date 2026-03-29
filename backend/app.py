from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
import torch.nn as nn
import numpy as np
import json
import random
import nltk
from nltk.stem import PorterStemmer
from groq import Groq
import os

nltk.download('punkt',     quiet=True)
nltk.download('punkt_tab', quiet=True)

app     = Flask(__name__)
CORS(app, origins=["https://pybot-j0ayyy5cd-joshuatoms-projects.vercel.app", "https://pybot.vercel.app"])
stemmer = PorterStemmer()

# ── Groq client ───────────────────────────────
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

ai_client = Groq(api_key=GROQ_API_KEY)

# ── Load PyTorch model ────────────────────────
class ChatNet(nn.Module):
    def __init__(self, input_size, hidden_size, output_size):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_size, hidden_size),
            nn.BatchNorm1d(hidden_size),
            nn.ReLU(),
            nn.Dropout(0.4),
            nn.Linear(hidden_size, hidden_size * 2),
            nn.BatchNorm1d(hidden_size * 2),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(hidden_size * 2, hidden_size),
            nn.ReLU(),
            nn.Linear(hidden_size, output_size)
        )
    def forward(self, x):
        return self.net(x)

data      = torch.load("chatbot.pth", map_location="cpu")
all_words = data["all_words"]
tags      = data["tags"]

with open("intents.json") as f:
    intents = json.load(f)["intents"]

model = ChatNet(data["input_size"], data["hidden_size"], data["output_size"])
model.load_state_dict(data["model_state"])
model.eval()

print("Model loaded successfully!")

# ── Helpers ───────────────────────────────────
def bag_of_words(text):
    words   = nltk.word_tokenize(text.lower())
    stemmed = [stemmer.stem(w) for w in words]
    vec     = np.zeros(len(all_words), dtype=np.float32)
    for w in stemmed:
        if w in all_words:
            vec[all_words.index(w)] = 1.0
    return vec

CODE_KEYWORDS = [
    "write", "code", "program", "script", "function",
    "class", "example", "how to", "make", "build",
    "create", "implement", "show me how", "snippet"
]

def is_code_request(text):
    return any(keyword in text.lower() for keyword in CODE_KEYWORDS)

def generate_code_with_ai(user_input):
    """Send coding request to Groq API"""
    try:
        response = ai_client.chat.completions.create(
            model="llama-3.3-70b-versatile",  # fast & free on Groq
            max_tokens=1024,
            messages=[
                {
                    "role": "system",
                    "content": """You are PyBot, a coding assistant.
When asked to write code:
- Always use Python unless another language is specified
- Keep code short and beginner friendly
- Add brief comments explaining what the code does
- Format code in a code block
- Give a one line explanation before the code"""
                },
                {
                    "role": "user",
                    "content": user_input
                }
            ]
        )
        return response.choices[0].message.content

    except Exception as e:
        return f"Sorry, I couldn't generate code right now. Error: {str(e)}"

THRESHOLD = 0.75
FALLBACKS = [
    "I'm not sure about that. Could you rephrase?",
    "Hmm, I didn't quite catch that. Try asking differently?",
    "I'm still learning! Could you say that another way?"
]

def get_response(user_input):
    if is_code_request(user_input):
        return generate_code_with_ai(user_input)

    bow    = torch.FloatTensor([bag_of_words(user_input)])
    output = model(bow)
    probs  = torch.softmax(output, dim=1)
    conf, idx = torch.max(probs, dim=1)

    if conf.item() < THRESHOLD:
        return random.choice(FALLBACKS)

    tag = tags[idx.item()]
    for intent in intents:
        if intent["tag"] == tag:
            return random.choice(intent["responses"])

    return "Sorry, I didn't understand that."

# ── Routes ────────────────────────────────────
@app.route("/chat", methods=["POST"])
def chat():
    body       = request.get_json()
    user_input = body.get("message", "").strip()

    if not user_input:
        return jsonify({"reply": "Please say something!"})

    reply = get_response(user_input)
    return jsonify({"reply": reply})

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})

if __name__ == "__main__":
app.run(host="0.0.0.0", port=5000)