import torch
import torch.nn as nn
import numpy as np
import json
import random
import nltk
from nltk.stem import PorterStemmer

nltk.download('punkt', quiet=True)
nltk.download('punkt_tab', quiet=True)

stemmer = PorterStemmer()

# ── Load intents ──────────────────────────────
with open("intents.json") as f:
    data = json.load(f)

all_words = []
tags = []
xy = []

for intent in data["intents"]:
    tag = intent["tag"]
    tags.append(tag)
    for pattern in intent["patterns"]:
        words = nltk.word_tokenize(pattern.lower())
        all_words.extend(words)
        xy.append((words, tag))

# Clean vocabulary
ignore = ["?", "!", ".", ",", "'s"]
all_words = sorted(set([stemmer.stem(w) for w in all_words if w not in ignore]))
tags = sorted(set(tags))

print(f"Vocabulary : {len(all_words)} words")
print(f"Tags       : {tags}")
print(f"Samples    : {len(xy)}")

# ── Bag of words ──────────────────────────────
def bag_of_words(words, vocab):
    stemmed = [stemmer.stem(w.lower()) for w in words]
    vec = np.zeros(len(vocab), dtype=np.float32)
    for w in stemmed:
        if w in vocab:
            vec[vocab.index(w)] = 1.0
    return vec

X_train = np.array([bag_of_words(w, all_words) for w, _ in xy])
y_train = np.array([tags.index(t) for _, t in xy])

# ── Model ─────────────────────────────────────
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

INPUT_SIZE  = len(all_words)
HIDDEN_SIZE = 64
OUTPUT_SIZE = len(tags)

model     = ChatNet(INPUT_SIZE, HIDDEN_SIZE, OUTPUT_SIZE)
criterion = nn.CrossEntropyLoss()
optimizer = torch.optim.Adam(model.parameters(), lr=0.001, weight_decay=1e-4)
scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
    optimizer, patience=100, factor=0.5
)

X_t = torch.FloatTensor(X_train)
y_t = torch.LongTensor(y_train)

# ── Training loop ─────────────────────────────
EPOCHS    = 3000
best_loss = float("inf")

print("\nTraining...\n")

for epoch in range(EPOCHS):
    model.train()
    output = model(X_t)
    loss   = criterion(output, y_t)

    optimizer.zero_grad()
    loss.backward()
    optimizer.step()
    scheduler.step(loss)

    if loss.item() < best_loss:
        best_loss = loss.item()
        torch.save({
            "model_state" : model.state_dict(),
            "all_words"   : all_words,
            "tags"        : tags,
            "input_size"  : INPUT_SIZE,
            "hidden_size" : HIDDEN_SIZE,
            "output_size" : OUTPUT_SIZE
        }, "chatbot.pth")

    if (epoch + 1) % 500 == 0:
        acc = (output.argmax(1) == y_t).float().mean()
        print(f"Epoch {epoch+1:4d} | Loss: {loss.item():.4f} | Acc: {acc:.2%}")

print(f"\nTraining complete! Best loss: {best_loss:.4f}")
print("Model saved to chatbot.pth")