// index.js — frontend script

const input = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const output = document.getElementById("output");

async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    output.innerHTML += `<div class="msg user">${text}</div>`;
    input.value = "";

    try {
        const res = await fetch("/api/ai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: text })
        });

        if (!res.ok) {
            throw new Error("Server error: " + res.status);
        }

        const data = await res.json();

        output.innerHTML += `<div class="msg bot">${data.response}</div>`;
    } catch (err) {
        console.error(err);
        output.innerHTML += `<div class="msg error">Error: ${err.message}</div>`;
    }

    output.scrollTop = output.scrollHeight;
}

sendBtn.addEventListener("click", sendMessage);

input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
});
