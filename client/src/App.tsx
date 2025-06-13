import { Input } from "@/components/ui/input";
import { Button } from "./components/ui/button";
import { useEffect, useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";

const stream = (topic: string) =>
    fetch(`${import.meta.env.VITE_BACKEND_URL}/get-blog?topic=${topic}`);

type Chat = {
    output: string;
    input: string;
};

const App = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [chat, setChat] = useState<Chat[] | null>(null);
    const [output, setOutput] = useState<string>("");
    const [input, setInput] = useState<string>("");

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!input) return;

        setLoading(true);
        setOutput("");
        setError(false);

        try {
            const response = await stream(input);
            if (!response.body) throw new Error("No response body");

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let fullText = "";

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk
                    .split("\n")
                    .filter((line) => line.startsWith("data:"));

                for (const line of lines) {
                    const text = line.replace(/^data:\s*/, "");
                    if (text === "[DONE]") continue;
                    
                    fullText += text;
                    
                    setOutput((prev) => prev + text);
                }
            }

            setChat((prev) => [
                ...(prev ?? []),
                { input, output: fullText.trim() },
            ]);
            setOutput("");
            setInput("");
        } catch (error) {
            console.error(error);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const chatBox = document.getElementById("chat-box");
        if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
    }, [output]);

    return (
        <div className="w-dvw h-dvh flex flex-col bg-zinc-950 text-white">
            <div
                id="chat-box"
                className="w-full h-full overflow-y-auto flex justify-center p-4 sm:p-8"
            >
                <div className="max-w-7xl w-full flex justify-center">
                    <Results
                        loading={loading}
                        error={error}
                        chat={chat}
                        output={output}
                        input={input}
                    />
                </div>
            </div>

            <form
                onSubmit={handleSubmit}
                className="w-full p-4 sm:p-8 flex items-center justify-center shrink-0 gap-4 sm:gap-8"
            >
                <Input
                    value={input}
                    placeholder="Enter Blog Topic"
                    required
                    onChange={(e) => setInput(e.currentTarget.value)}
                    className="w-full max-w-2xl"
                />
                <Button disabled={loading} type="submit">
                    {loading ? "..." : "Generate Blog"}
                </Button>
            </form>
        </div>
    );
};

const Results = ({
    loading,
    error,
    chat,
    output,
    input,
}: {
    loading: boolean;
    error: boolean;
    chat: Chat[] | null;
    output: string;
    input: string;
}) => {
    return (
        <div className="w-full flex flex-col gap-6">
            {chat &&
                chat.map((c, idx) => (
                    <div className="w-full flex flex-col gap-4" key={idx}>
                        <div className="ml-auto md:w-1/2 w-[90%] bg-secondary/20 rounded-sm p-4">
                            {c.input}
                        </div>
                        <div className="md:w-1/2 w-[90%] bg-secondary/20 rounded-sm p-4 whitespace-pre-wrap font-mono">
                            <ReactMarkdown>{c.output}</ReactMarkdown>
                        </div>
                    </div>
                ))}

            {error && <div className="text-red-500">Something went wrong.</div>}

            {loading && (
                <div className="w-full flex flex-col gap-4">
                    <div className="ml-auto md:w-1/2 w-[90%] bg-secondary/20 rounded-sm p-4">
                        {input}
                    </div>
                    <div className="md:w-1/2 w-[90%] bg-secondary/20 rounded-sm p-4 font-mono animate-pulse whitespace-pre-wrap">
                        <ReactMarkdown>
                            {output || "Generating..."}
                        </ReactMarkdown>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
