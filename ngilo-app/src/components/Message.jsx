import { useState } from "react";

function Message() {
    const [link, setLink] = useState("");
    const [message, setMessage] = useState("");
    const [status, setStatus] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSend = async (e) => {
        e.preventDefault();
        setStatus("");

        const trimmedMessage = message.trim();
        const trimmedLink = link.trim();

        if (!trimmedLink || !trimmedMessage) {
            setStatus("Please enter a recipient link and message.");
            return;
        }

        let recipientId;

        try {
            // Accept a full URL or a relative /send/ link.
            const normalizedLink = trimmedLink.startsWith("/")
                ? `https://ngilo.app${trimmedLink}`
                : trimmedLink;

            const url = new URL(normalizedLink);

            if (
                url.pathname !== "/send" &&
                !url.pathname.startsWith("/send/")
            ) {
                setStatus("Invalid recipient link.");
                return;
            }

            recipientId = url.pathname
                .replace(/^\/send\/?/, "")
                .split("/")[0];

            if (!recipientId) {
                setStatus("Recipient ID is missing from the link.");
                return;
            }
        } catch {
            setStatus("Please enter a valid recipient link.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(
                "http://localhost:3001/api/send-message",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        recipientId,
                        message: trimmedMessage,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                setStatus(data.error || "Failed to send message.");
                return;
            }

            setStatus("Message sent anonymously!");
            setMessage("");
            setLink("");
        } catch (error) {
            console.error("Send message error:", error);
            setStatus(
                "Could not connect to the server. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-secondary m-0 p-3 rounded">
            <h2>Send Anonymous Message</h2>

            <form onSubmit={handleSend}>
                <input
                    type="text"
                    placeholder="Paste recipient's link"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    style={{
                        width: "100%",
                        padding: 8,
                        marginBottom: 10,
                    }}
                    required
                />

                <textarea
                    placeholder="Your anonymous message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    maxLength={5000}
                    style={{
                        width: "100%",
                        padding: 10,
                        marginBottom: 10,
                    }}
                    required
                />

                <button
                    type="submit"
                    disabled={loading}
                    style={{ padding: "10px 20px" }}
                >
                    {loading ? "Sending..." : "Send"}
                </button>
            </form>

            {status && (
                <p role="status" style={{ marginTop: 10 }}>
                    {status}
                </p>
            )}
        </div>
    );
}

export default Message;